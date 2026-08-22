"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  HelperText,
} from "@visualify/design-system";
import { loadFiles, saveFile, deleteFile, markFileImported, type StoredFileMeta } from "@/lib/uploadedRiskRegisterStore";
import { parseExcel, sheetToDocumentText, type ParseExcelResult } from "@/lib/riskImportExcel";
import {
  buildFileImportPreview,
  formatImportConfirmationMessage,
  getDefaultImportSelection,
  resolveImportSelection,
  type ImportPreviewRow,
} from "@/domain/risk/fileImportPreview";
import { useRiskRegister } from "@/store/risk-register.store";
import { RiskFileImportPreview } from "@/components/risk-register/RiskFileImportPreview";
import { useRiskCategoryOptions } from "@/components/risk-register/RiskCategoryOptionsContext";

const ACCEPT_EXCEL = ".xlsx";

function formatUploadedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/**
 * Excel file upload section for Project Information page only.
 * Files are stored in IndexedDB. Add and remove files here; upload UI is only visible on this page.
 */
export function ProjectExcelUploadSection() {
  const { appendRisks, risks } = useRiskRegister();
  const { categoryNames } = useRiskCategoryOptions();
  const [files, setFiles] = useState<StoredFileMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseExcelResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileIdRef = useRef(selectedFileId);
  useEffect(() => {
    selectedFileIdRef.current = selectedFileId;
  }, [selectedFileId]);

  const resetPreview = useCallback(() => {
    setShowPreview(false);
    setPreviewRows([]);
    setSelectedIds(new Set());
    setConfirmingImport(false);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const list = await loadFiles();
      setFiles(list);
      if (list.length > 0 && !selectedFileIdRef.current) {
        setSelectedFileId(list[0].id);
      }
      if (list.length === 0) {
        setSelectedFileId(null);
        setParsed(null);
        resetPreview();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    }
  }, [resetPreview]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // When selected file changes, parse it (with cleanup so stale parse doesn't overwrite state)
  useEffect(() => {
    if (!selectedFileId || files.length === 0) {
      setParsed(null);
      return;
    }
    const file = files.find((f) => f.id === selectedFileId);
    if (!file) {
      setParsed(null);
      return;
    }
    let cancelled = false;
    setParseError(null);
    resetPreview();
    parseExcel(file.blob)
        .then((result) => {
          if (cancelled) return;
          if (result.rows.length === 0 && result.headers.length === 0) {
            setParseError("Sheet is empty.");
            setParsed(null);
          } else {
            setParsed(result);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setParseError(err instanceof Error ? err.message : "Failed to parse file.");
          setParsed(null);
        });
    return () => {
      cancelled = true;
    };
  }, [selectedFileId, files, resetPreview]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Only .xlsx files are allowed.");
      return;
    }
    setError(null);
    resetPreview();
    try {
      await saveFile(file);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save file.");
    }
  };

  const handleRemoveFile = async (id: string) => {
    setError(null);
    setParseError(null);
    setImportMessage(null);
    setImportStatus("idle");
    resetPreview();
    try {
      await deleteFile(id);
      const list = await loadFiles();
      setFiles(list);
      if (selectedFileId === id) {
        setSelectedFileId(list[0]?.id ?? null);
        setParsed(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove file.");
    }
  };

  const handleGenerateRisks = async () => {
    if (!selectedFileId || !parsed || parsed.rows.length === 0) {
      setImportStatus("error");
      setImportMessage("Select a file and ensure it has data, then try again.");
      return;
    }
    setImportStatus("loading");
    setImportMessage(null);
    resetPreview();
    try {
      const documentText = sheetToDocumentText(parsed);
      const res = await fetch("/api/risks/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "AI extraction failed";
        setImportMessage(msg);
        setImportStatus("error");
        return;
      }
      const rows = buildFileImportPreview(data?.risks, risks, {
        categoryNames: categoryNames.length > 0 ? categoryNames : undefined,
      });
      if (rows.length === 0) {
        setImportStatus("error");
        setImportMessage("No risks were extracted from this file.");
        return;
      }
      setPreviewRows(rows);
      setSelectedIds(getDefaultImportSelection(rows));
      setShowPreview(true);
      setImportStatus("idle");
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : "Network or unexpected error");
      setImportStatus("error");
    }
  };

  const handleImportSelected = async () => {
    if (!selectedFileId) return;
    setConfirmingImport(true);
    setImportMessage(null);
    try {
      const { risksToAppend, counts } = resolveImportSelection(previewRows, selectedIds);
      appendRisks(risksToAppend);
      await markFileImported(selectedFileId);
      await refresh();
      setImportStatus("success");
      setImportMessage(formatImportConfirmationMessage(counts));
      resetPreview();
    } catch (e) {
      setImportStatus("error");
      setImportMessage(e instanceof Error ? e.message : "Failed to import selected risks.");
    } finally {
      setConfirmingImport(false);
    }
  };

  const handleToggleRow = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAllUnique = useCallback(() => {
    setSelectedIds(getDefaultImportSelection(previewRows));
  }, [previewRows]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const hasData = parsed && parsed.rows.length > 0;
  const selectedFile = files.find((f) => f.id === selectedFileId);

  return (
    <Card className="mb-4">
      <CardHeader className="border-b border-[var(--ds-border-subtle)] !px-4 !py-3">
        <h2 className="m-0 text-[length:var(--ds-text-base)] font-semibold leading-6 text-[var(--ds-text-primary)]">
          Risk Register Files (Excel)
        </h2>
      </CardHeader>
      <CardBody className="!px-4 !py-3">
        <HelperText className="!mb-3 !mt-0">
          Upload Excel risk register files, then select one and generate risks with AI. Review the preview before
          adding risks to the register. Generated risks remain client-side until you save the register.
        </HelperText>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_EXCEL}
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload Excel file"
        />
        <div className="space-y-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            Add .xlsx file
          </Button>
          {error ? (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {error}
            </Callout>
          ) : null}
          {files.length > 0 && (
            <>
              <ul className="mt-2 list-none space-y-2 p-0 text-[length:var(--ds-text-sm)]">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className={
                      "flex flex-wrap items-center gap-2 rounded-[var(--ds-radius-md)] border px-3 py-2 " +
                      (selectedFileId === f.id
                        ? "border-[var(--ds-primary)] bg-[var(--ds-surface-inset)]"
                        : "border-[var(--ds-border-subtle)] bg-[var(--ds-surface-default)]")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFileId(f.id)}
                      className="min-w-0 flex-1 truncate text-left font-medium text-[var(--ds-text-primary)]"
                    >
                      {f.name}
                    </button>
                    <span className="shrink-0 text-[var(--ds-text-muted)]">{formatUploadedAt(f.uploadedAt)}</span>
                    {f.importedAt ? (
                      <Badge
                        status="success"
                        variant="subtle"
                        className="shrink-0"
                        title={`Translated to risks: ${formatUploadedAt(f.importedAt)}`}
                      >
                        Translated to risks
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="ml-auto shrink-0 !border-[var(--ds-status-danger-strong-border)] !text-[var(--ds-status-danger-fg)]"
                      onClick={() => handleRemoveFile(f.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              {parseError ? (
                <Callout status="danger" role="alert" className="!mt-2 text-[length:var(--ds-text-sm)]">
                  {parseError}
                </Callout>
              ) : null}
              {!showPreview ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateRisks}
                    disabled={!hasData || importStatus === "loading"}
                  >
                    Generate Risks with AI
                    {selectedFile ? ` (from ${selectedFile.name})` : ""}
                  </Button>
                  {importStatus === "loading" && (
                    <div className="inline-flex items-center gap-2 py-1" aria-busy="true">
                      <div className="h-3 w-24 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
                      <span className="sr-only">Generating risks</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <RiskFileImportPreview
                    rows={previewRows}
                    selectedIds={selectedIds}
                    onToggleRow={handleToggleRow}
                    onSelectAllUnique={handleSelectAllUnique}
                    onClearSelection={handleClearSelection}
                    onImportSelected={handleImportSelected}
                    onBack={resetPreview}
                    importDisabled={confirmingImport}
                  />
                </div>
              )}
              {importStatus === "success" && importMessage ? (
                <Callout status="success" className="!mt-3 text-[length:var(--ds-text-sm)]" role="status">
                  {importMessage}
                </Callout>
              ) : null}
              {importStatus === "error" && importMessage ? (
                <Callout status="danger" role="alert" className="!mt-3 text-[length:var(--ds-text-sm)]">
                  {importMessage}
                </Callout>
              ) : null}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
