import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportProjectReportingPeriod } from "@/lib/projects/report-project-reporting-date";
import type { ReportSnapshotPayload } from "@/lib/report-upload/report-snapshot-payload";

export type ReportSnapshotRow = {
  id: string;
  projectId: string;
  reportingDate: string;
  isLatest: boolean;
  payload: ReportSnapshotPayload;
  sourceFilename: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
};

type SnapshotDbRow = {
  id: string;
  project_id: string;
  reporting_date: string;
  is_latest: boolean;
  payload: ReportSnapshotPayload;
  source_filename: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

function mapSnapshotRow(row: SnapshotDbRow): ReportSnapshotRow {
  return {
    id: row.id,
    projectId: row.project_id,
    reportingDate: row.reporting_date,
    isLatest: row.is_latest,
    payload: row.payload,
    sourceFilename: row.source_filename,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
  };
}

export async function listReportSnapshots(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ReportSnapshotRow[]> {
  const { data, error } = await supabase
    .from("visualify_report_snapshots")
    .select(
      "id, project_id, reporting_date, is_latest, payload, source_filename, uploaded_by, uploaded_at",
    )
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("reporting_date", { ascending: false });

  if (error) {
    console.error("[report] listReportSnapshots:", error.message);
    return [];
  }

  return ((data as SnapshotDbRow[] | null) ?? []).map(mapSnapshotRow);
}

export function reportSnapshotsToReportingPeriods(
  snapshots: ReportSnapshotRow[],
): ReportProjectReportingPeriod[] {
  return snapshots.map((snapshot) => ({
    isoDate: snapshot.reportingDate,
    isLatest: snapshot.isLatest ? true : undefined,
  }));
}

export async function getReportSnapshot(
  supabase: SupabaseClient,
  projectId: string,
  reportingDate: string,
): Promise<ReportSnapshotRow | null> {
  const normalizedDate = reportingDate.trim();
  if (!normalizedDate) return null;

  const { data, error } = await supabase
    .from("visualify_report_snapshots")
    .select(
      "id, project_id, reporting_date, is_latest, payload, source_filename, uploaded_by, uploaded_at",
    )
    .eq("project_id", projectId)
    .eq("reporting_date", normalizedDate)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    console.error("[report] getReportSnapshot:", error.message);
    return null;
  }

  return data ? mapSnapshotRow(data as SnapshotDbRow) : null;
}

export async function getLatestReportSnapshot(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ReportSnapshotRow | null> {
  const { data, error } = await supabase
    .from("visualify_report_snapshots")
    .select(
      "id, project_id, reporting_date, is_latest, payload, source_filename, uploaded_by, uploaded_at",
    )
    .eq("project_id", projectId)
    .eq("is_latest", true)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    console.error("[report] getLatestReportSnapshot:", error.message);
    return null;
  }

  if (data) {
    return mapSnapshotRow(data as SnapshotDbRow);
  }

  const snapshots = await listReportSnapshots(supabase, projectId);
  return snapshots[0] ?? null;
}

export type UpsertReportSnapshotInput = {
  projectId: string;
  reportingDate: string;
  payload: ReportSnapshotPayload;
  sourceFilename?: string | null;
  uploadedBy?: string | null;
};

export type UpsertReportSnapshotResult =
  | { ok: true; snapshot: ReportSnapshotRow }
  | { ok: false; message: string };

export async function upsertReportSnapshot(
  supabase: SupabaseClient,
  input: UpsertReportSnapshotInput,
): Promise<UpsertReportSnapshotResult> {
  const projectId = input.projectId.trim();
  const reportingDate = input.reportingDate.trim();
  const isLatest = input.payload.isLatest;

  if (!projectId || !reportingDate) {
    return { ok: false, message: "Project and reporting date are required." };
  }

  if (isLatest) {
    const { error: clearError } = await supabase
      .from("visualify_report_snapshots")
      .update({ is_latest: false })
      .eq("project_id", projectId);

    if (clearError) {
      console.error("[report] upsertReportSnapshot clear latest:", clearError.message);
      return { ok: false, message: "Could not update reporting periods." };
    }
  }

  const { data, error } = await supabase
    .from("visualify_report_snapshots")
    .upsert(
      {
        project_id: projectId,
        reporting_date: reportingDate,
        is_latest: isLatest,
        payload: input.payload,
        source_filename: input.sourceFilename ?? null,
        uploaded_by: input.uploadedBy ?? null,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
        archived_by: null,
      },
      { onConflict: "project_id,reporting_date" },
    )
    .select(
      "id, project_id, reporting_date, is_latest, payload, source_filename, uploaded_by, uploaded_at",
    )
    .single();

  if (error || !data) {
    console.error("[report] upsertReportSnapshot:", error?.message);
    return { ok: false, message: "Could not save the report snapshot." };
  }

  return { ok: true, snapshot: mapSnapshotRow(data as SnapshotDbRow) };
}

export type ArchiveReportSnapshotResult =
  | { ok: true; latestRemainingReportingDate: string | null }
  | { ok: false; message: string };

export async function archiveReportSnapshot(
  supabase: SupabaseClient,
  projectId: string,
  reportingDate: string,
  archivedBy: string,
): Promise<ArchiveReportSnapshotResult> {
  const normalizedProjectId = projectId.trim();
  const normalizedDate = reportingDate.trim();
  const normalizedArchivedBy = archivedBy.trim();

  if (!normalizedProjectId || !normalizedDate || !normalizedArchivedBy) {
    return { ok: false, message: "Project, reporting date, and user are required." };
  }

  const { data: snapshot, error: fetchError } = await supabase
    .from("visualify_report_snapshots")
    .select("id, is_latest")
    .eq("project_id", normalizedProjectId)
    .eq("reporting_date", normalizedDate)
    .is("archived_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("[report] archiveReportSnapshot fetch:", fetchError.message);
    return { ok: false, message: "Could not load report snapshot." };
  }

  if (!snapshot) {
    return { ok: false, message: "Report not found." };
  }

  const wasLatest = snapshot.is_latest === true;

  const { error: archiveError } = await supabase
    .from("visualify_report_snapshots")
    .update({
      archived_at: new Date().toISOString(),
      archived_by: normalizedArchivedBy,
      is_latest: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", snapshot.id);

  if (archiveError) {
    console.error("[report] archiveReportSnapshot update:", archiveError.message);
    return { ok: false, message: "Could not archive report." };
  }

  if (wasLatest) {
    const { data: remaining, error: remainingError } = await supabase
      .from("visualify_report_snapshots")
      .select("id, reporting_date")
      .eq("project_id", normalizedProjectId)
      .is("archived_at", null)
      .order("reporting_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (remainingError) {
      console.error("[report] archiveReportSnapshot promote fetch:", remainingError.message);
    } else if (remaining) {
      const { error: promoteError } = await supabase
        .from("visualify_report_snapshots")
        .update({ is_latest: true, updated_at: new Date().toISOString() })
        .eq("id", remaining.id);

      if (promoteError) {
        console.error("[report] archiveReportSnapshot promote update:", promoteError.message);
      }
    }
  }

  const latest = await getLatestReportSnapshot(supabase, normalizedProjectId);

  return {
    ok: true,
    latestRemainingReportingDate: latest?.reportingDate ?? null,
  };
}

export type ReportSnapshotUploadStatus = "uploaded" | "replaced";

export type ReportSnapshotUploadUploader = {
  firstName: string | null;
  surname: string | null;
  email: string | null;
};

export type ReportSnapshotUploadRow = {
  id: string;
  projectId: string;
  reportingDate: string;
  sourceFilename: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
  status: ReportSnapshotUploadStatus;
  replacedSnapshotId: string | null;
  uploader: ReportSnapshotUploadUploader | null;
};

type SnapshotUploadProfileEmbed = {
  first_name: string | null;
  surname: string | null;
  email: string | null;
};

type SnapshotUploadDbRow = {
  id: string;
  project_id: string;
  reporting_date: string;
  source_filename: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  status: ReportSnapshotUploadStatus;
  replaced_snapshot_id: string | null;
};

function mapUploaderProfile(
  profile: SnapshotUploadProfileEmbed | null,
): ReportSnapshotUploadUploader | null {
  if (!profile) return null;

  return {
    firstName: profile.first_name,
    surname: profile.surname,
    email: profile.email,
  };
}

function mapSnapshotUploadRow(
  row: SnapshotUploadDbRow,
  profilesByUserId: Map<string, SnapshotUploadProfileEmbed>,
): ReportSnapshotUploadRow {
  const uploaderId = row.uploaded_by?.trim() ?? "";
  return {
    id: row.id,
    projectId: row.project_id,
    reportingDate: row.reporting_date,
    sourceFilename: row.source_filename,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    status: row.status,
    replacedSnapshotId: row.replaced_snapshot_id,
    uploader: mapUploaderProfile(
      uploaderId ? (profilesByUserId.get(uploaderId) ?? null) : null,
    ),
  };
}

async function fetchUploaderProfilesByUserId(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, SnapshotUploadProfileEmbed>> {
  const profilesByUserId = new Map<string, SnapshotUploadProfileEmbed>();
  if (userIds.length === 0) {
    return profilesByUserId;
  }

  const { data, error } = await supabase
    .from("visualify_profiles")
    .select("id, first_name, surname, email")
    .in("id", userIds);

  if (error) {
    console.error("[report] fetchUploaderProfilesByUserId:", error.message);
    return profilesByUserId;
  }

  for (const row of (data as (SnapshotUploadProfileEmbed & { id: string })[] | null) ?? []) {
    profilesByUserId.set(row.id, {
      first_name: row.first_name,
      surname: row.surname,
      email: row.email,
    });
  }

  return profilesByUserId;
}

export async function listReportSnapshotUploads(
  supabase: SupabaseClient,
  projectId: string,
  limit = 10,
): Promise<ReportSnapshotUploadRow[]> {
  const { data, error } = await supabase
    .from("visualify_report_snapshot_uploads")
    .select(
      "id, project_id, reporting_date, source_filename, uploaded_by, uploaded_at, status, replaced_snapshot_id",
    )
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[report] listReportSnapshotUploads:", error.message);
    return [];
  }

  const rows = (data as SnapshotUploadDbRow[] | null) ?? [];
  const uploaderIds = [
    ...new Set(
      rows
        .map((row) => row.uploaded_by?.trim() ?? "")
        .filter((id) => id.length > 0),
    ),
  ];
  const profilesByUserId = await fetchUploaderProfilesByUserId(supabase, uploaderIds);

  return rows.map((row) => mapSnapshotUploadRow(row, profilesByUserId));
}

export type InsertReportSnapshotUploadInput = {
  projectId: string;
  reportingDate: string;
  sourceFilename?: string | null;
  uploadedBy?: string | null;
  status: ReportSnapshotUploadStatus;
  replacedSnapshotId?: string | null;
  payload: ReportSnapshotPayload;
};

export type InsertReportSnapshotUploadResult =
  | { ok: true; upload: ReportSnapshotUploadRow }
  | { ok: false; message: string };

export async function insertReportSnapshotUpload(
  supabase: SupabaseClient,
  input: InsertReportSnapshotUploadInput,
): Promise<InsertReportSnapshotUploadResult> {
  const projectId = input.projectId.trim();
  const reportingDate = input.reportingDate.trim();

  if (!projectId || !reportingDate) {
    return { ok: false, message: "Project and reporting date are required." };
  }

  const { data, error } = await supabase
    .from("visualify_report_snapshot_uploads")
    .insert({
      project_id: projectId,
      reporting_date: reportingDate,
      source_filename: input.sourceFilename ?? null,
      uploaded_by: input.uploadedBy ?? null,
      uploaded_at: new Date().toISOString(),
      status: input.status,
      replaced_snapshot_id: input.replacedSnapshotId ?? null,
      payload: input.payload,
    })
    .select(
      "id, project_id, reporting_date, source_filename, uploaded_by, uploaded_at, status, replaced_snapshot_id",
    )
    .single();

  if (error || !data) {
    console.error("[report] insertReportSnapshotUpload:", error?.message);
    return { ok: false, message: "Could not save upload history." };
  }

  const row = data as SnapshotUploadDbRow;
  const uploaderId = row.uploaded_by?.trim() ?? "";
  const profilesByUserId = uploaderId
    ? await fetchUploaderProfilesByUserId(supabase, [uploaderId])
    : new Map<string, SnapshotUploadProfileEmbed>();

  return { ok: true, upload: mapSnapshotUploadRow(row, profilesByUserId) };
}
