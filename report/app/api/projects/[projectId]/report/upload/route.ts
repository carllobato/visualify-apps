import { NextResponse } from "next/server";
import { hasProductAccess } from "@/lib/auth/hasProductAccess";
import { getReportWorkspaceProjectById } from "@/lib/projects/report-projects-server";
import {
  getLatestReportSnapshot,
  getReportSnapshot,
  insertReportSnapshotUpload,
  upsertReportSnapshot,
} from "@/lib/projects/report-snapshots-server";
import { productConfig } from "@/lib/product-config";
import { parseReportExcel } from "@/lib/report-upload/parse-report-excel";
import { resolveActiveReportWorkspaceContext } from "@/lib/workspace/resolveActiveReportWorkspaceContext";
import { supabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache",
  Pragma: "no-cache",
};

const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

function isXlsxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) return false;
  if (!file.type) return true;
  return XLSX_MIME_TYPES.has(file.type);
}

function isReplaceConfirmed(value: FormDataEntryValue | null): boolean {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * POST /api/projects/[projectId]/report/upload — Parse and store a Report Excel workbook.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CACHE_HEADERS });
  }

  const entitled = await hasProductAccess(user.id, productConfig.PRODUCT_KEY);
  if (!entitled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: CACHE_HEADERS });
  }

  const workspaceContext = await resolveActiveReportWorkspaceContext(user.id);
  const activeWorkspaceId = workspaceContext.selectedWorkspaceId;

  const project = await getReportWorkspaceProjectById(
    supabase,
    user.id,
    activeWorkspaceId,
    projectId,
  );

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404, headers: CACHE_HEADERS });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400, headers: CACHE_HEADERS });
  }

  const fileField = formData.get("file");
  if (!(fileField instanceof File)) {
    return NextResponse.json({ error: "A file field named 'file' is required." }, { status: 400, headers: CACHE_HEADERS });
  }

  if (!isXlsxFile(fileField)) {
    return NextResponse.json({ error: "Only .xlsx files are accepted." }, { status: 400, headers: CACHE_HEADERS });
  }

  const replace = isReplaceConfirmed(formData.get("replace"));

  const arrayBuffer = await fileField.arrayBuffer();
  const priorSnapshot = await getLatestReportSnapshot(supabase, projectId);
  const priorPayload = priorSnapshot?.payload ?? null;

  const parseResult = parseReportExcel(arrayBuffer, priorPayload);

  if (!parseResult.ok) {
    return NextResponse.json(
      { ok: false, errors: parseResult.errors },
      { status: 400, headers: CACHE_HEADERS },
    );
  }

  const reportingDate = parseResult.payload.reportingDate;
  const existingSnapshot = await getReportSnapshot(supabase, projectId, reportingDate);

  if (existingSnapshot && !replace) {
    return NextResponse.json(
      {
        ok: false,
        requiresReplaceConfirmation: true,
        reportingDate,
        existingSnapshot: {
          id: existingSnapshot.id,
          reportingDate: existingSnapshot.reportingDate,
          sourceFilename: existingSnapshot.sourceFilename,
          uploadedAt: existingSnapshot.uploadedAt,
        },
      },
      { status: 409, headers: CACHE_HEADERS },
    );
  }

  const upsertResult = await upsertReportSnapshot(supabase, {
    projectId,
    reportingDate,
    payload: parseResult.payload,
    sourceFilename: fileField.name,
    uploadedBy: user.id,
  });

  if (!upsertResult.ok) {
    return NextResponse.json({ error: upsertResult.message }, { status: 500, headers: CACHE_HEADERS });
  }

  const uploadResult = await insertReportSnapshotUpload(supabase, {
    projectId,
    reportingDate,
    sourceFilename: fileField.name,
    uploadedBy: user.id,
    status: existingSnapshot ? "replaced" : "uploaded",
    replacedSnapshotId: existingSnapshot?.id ?? null,
    payload: parseResult.payload,
  });

  if (!uploadResult.ok) {
    console.error("[report] upload history insert failed:", uploadResult.message);
  }

  return NextResponse.json(
    { ok: true, reportingDate },
    { status: 200, headers: CACHE_HEADERS },
  );
}
