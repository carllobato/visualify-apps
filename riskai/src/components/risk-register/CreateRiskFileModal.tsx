"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveFile, loadFiles, markFileImported } from "@/lib/uploadedRiskRegisterStore";
import { parseExcel, sheetToDocumentText } from "@/lib/riskImportExcel";
import {
  buildFileImportPreview,
  formatImportConfirmationMessage,
  getDefaultImportSelection,
  resolveImportSelection,
  type ImportPreviewRow,
} from "@/domain/risk/fileImportPreview";
import { useRiskRegister } from "@/store/risk-register.store";
import { Callout } from "@visualify/design-system";
import { RiskFileImportPreview } from "@/components/risk-register/RiskFileImportPreview";
import { useRiskCategoryOptions } from "@/components/risk-register/RiskCategoryOptionsContext";

const btnPrimary =
  "px-4 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-text-primary)] text-[var(--ds-text-inverse)] text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] shrink-0 dark:bg-[var(--ds-surface-elevated)] dark:text-[var(--ds-text-primary)] dark:hover:bg-[var(--ds-surface-hover)]";
const btnSecondary =
  "px-4 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm font-medium hover:bg-[var(--ds-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] shrink-0";

type ModalStep = "upload" | "preview";

export function CreateRiskFileModal({
  open,
  onClose,
  onRisksImported,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after risks are imported from the file */
  onRisksImported?: (riskIds: string[]) => void;
}) {
  const { appendRisks, risks } = useRiskRegister();
  const { categoryNames } = useRiskCategoryOptions();
  const [step, setStep] = useState<ModalStep>("upload");
  const [fileDragOver, setFileDragOver] = useState(false);
  const [fileUploadStatus, setFileUploadStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fileUploadMessage, setFileUploadMessage] = useState<string | null>(null);
  const [lastSavedFileId, setLastSavedFileId] = useState<string | null>(null);
  const [lastSavedFileName, setLastSavedFileName] = useState<string | null>(null);
  const [generateStatus, setGenerateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingImport, setConfirmingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetPreview = useCallback(() => {
    setStep("upload");
    setPreviewRows([]);
    setSelectedIds(new Set());
    setConfirmingImport(false);
  }, []);

  const handleClose = useCallback(() => {
    resetPreview();
    setGenerateStatus("idle");
    setGenerateMessage(null);
    onClose();
  }, [onClose, resetPreview]);

  const handleFileSave = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setFileUploadStatus("error");
      setFileUploadMessage("Only .xlsx files are allowed.");
      return;
    }
    setFileUploadStatus("loading");
    setFileUploadMessage(null);
    setGenerateMessage(null);
    resetPreview();
    try {
      const id = await saveFile(file);
      setLastSavedFileId(id);
      setLastSavedFileName(file.name);
      setFileUploadStatus("success");
    } catch (e) {
      setFileUploadStatus("error");
      setFileUploadMessage(e instanceof Error ? e.message : "Failed to save file.");
    }
  }, [resetPreview]);

  const onFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setFileDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSave(file);
    },
    [handleFileSave],
  );

  const onFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(true);
  }, []);

  const onFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) handleFileSave(file);
    },
    [handleFileSave],
  );

  const handleGenerateRisk = useCallback(async () => {
    if (!lastSavedFileId) {
      setGenerateStatus("error");
      setGenerateMessage("Upload a file first, then click Generate Risk.");
      return;
    }
    setGenerateStatus("loading");
    setGenerateMessage(null);
    resetPreview();
    try {
      const files = await loadFiles();
      const file = files.find((f) => f.id === lastSavedFileId);
      if (!file) {
        setGenerateStatus("error");
        setGenerateMessage("File not found. Upload it again.");
        return;
      }
      const parsed = await parseExcel(file.blob);
      if (parsed.rows.length === 0 && parsed.headers.length === 0) {
        setGenerateStatus("error");
        setGenerateMessage("Sheet is empty.");
        return;
      }
      const documentText = sheetToDocumentText(parsed);
      const res = await fetch("/api/risks/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "AI extraction failed";
        setGenerateMessage(msg);
        setGenerateStatus("error");
        return;
      }
      const rows = buildFileImportPreview(data?.risks, risks, {
        categoryNames: categoryNames.length > 0 ? categoryNames : undefined,
      });
      if (rows.length === 0) {
        setGenerateStatus("error");
        setGenerateMessage("No risks were extracted from this file.");
        return;
      }
      setPreviewRows(rows);
      setSelectedIds(getDefaultImportSelection(rows));
      setStep("preview");
      setGenerateStatus("idle");
    } catch (e) {
      setGenerateMessage(e instanceof Error ? e.message : "Network or unexpected error");
      setGenerateStatus("error");
    }
  }, [categoryNames, lastSavedFileId, resetPreview, risks]);

  const handleImportSelected = useCallback(async () => {
    if (!lastSavedFileId) return;
    setConfirmingImport(true);
    setGenerateMessage(null);
    try {
      const { risksToAppend, counts } = resolveImportSelection(previewRows, selectedIds);
      appendRisks(risksToAppend);
      await markFileImported(lastSavedFileId);
      setGenerateStatus("success");
      setGenerateMessage(formatImportConfirmationMessage(counts));
      resetPreview();
      onRisksImported?.(risksToAppend.map((r) => r.id));
    } catch (e) {
      setGenerateStatus("error");
      setGenerateMessage(e instanceof Error ? e.message : "Failed to import selected risks.");
    } finally {
      setConfirmingImport(false);
    }
  }, [appendRisks, lastSavedFileId, onRisksImported, previewRows, resetPreview, selectedIds]);

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const overlay = (
    <div
      className="ds-modal-backdrop z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-risk-file-dialog-title"
      onClick={handleBackdropClick}
    >
      <div
        style={{ width: "90vw", maxWidth: step === "preview" ? 720 : 480, maxHeight: "90vh" }}
        className="shrink-0 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 shrink-0 border-b border-[var(--ds-border)] px-4 sm:px-6 py-3">
          <h2 id="create-risk-file-dialog-title" className="text-lg font-semibold text-[var(--ds-text-primary)]">
            {step === "preview" ? "Review imported risks" : "Create Risk with AI File Uploader"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-[var(--ds-radius-sm)] border border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)]"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {step === "upload" ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={onFileInputChange}
                className="hidden"
                aria-label="Upload Excel file"
              />
              <div
                onDragOver={onFileDragOver}
                onDragLeave={onFileDragLeave}
                onDrop={onFileDrop}
                className={`border-2 border-dashed rounded-[var(--ds-radius-md)] p-6 text-center text-sm transition-colors min-h-[120px] flex flex-col justify-center ${
                  fileDragOver
                    ? "border-[var(--ds-status-info-border)] bg-[var(--ds-status-info-bg)]"
                    : "border-[var(--ds-border)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--ds-surface-muted)_30%,transparent)] hover:border-[var(--ds-border)]"
                }`}
              >
                {lastSavedFileId && lastSavedFileName ? (
                  <>
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--ds-surface-muted)] text-[var(--ds-text-secondary)]">
                      XLSX
                    </span>
                    <p className="text-[var(--ds-text-primary)] font-medium mt-2 truncate" title={lastSavedFileName}>
                      {lastSavedFileName}
                    </p>
                    <p className="text-[var(--ds-text-muted)] text-xs mt-1">
                      Drop another file to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[var(--ds-text-secondary)] mb-2">
                      {fileDragOver ? "Drop file here…" : "Drag and drop .xlsx here, or"}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={fileUploadStatus === "loading"}
                      className="px-3 py-1.5 text-sm font-medium rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-hover)] disabled:opacity-50"
                    >
                      Choose file
                    </button>
                  </>
                )}
              </div>
              {fileUploadStatus === "loading" && (
                <div className="flex items-center gap-2 py-1" aria-busy="true">
                  <div className="h-3 w-24 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
                  <span className="sr-only">Saving file</span>
                </div>
              )}
              {fileUploadStatus === "error" && fileUploadMessage && (
                <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
                  {fileUploadMessage}
                </Callout>
              )}
              <button
                type="button"
                onClick={handleGenerateRisk}
                disabled={!lastSavedFileId || generateStatus === "loading"}
                className={`${btnPrimary} w-full`}
              >
                Generate Risk
              </button>
              {generateStatus === "loading" && (
                <div className="flex items-center gap-2 py-1" aria-busy="true">
                  <div className="h-3 w-32 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
                  <span className="sr-only">Extracting risks</span>
                </div>
              )}
            </>
          ) : (
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
          )}
          {generateStatus === "success" && generateMessage && (
            <Callout status="success" role="status" className="text-[length:var(--ds-text-sm)]">
              {generateMessage}
            </Callout>
          )}
          {generateStatus === "error" && generateMessage && (
            <Callout status="danger" role="alert" className="text-[length:var(--ds-text-sm)]">
              {generateMessage}
            </Callout>
          )}
        </div>
        <div className="flex justify-end gap-2 shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--ds-border)]">
          <button type="button" onClick={handleClose} className={btnSecondary}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
