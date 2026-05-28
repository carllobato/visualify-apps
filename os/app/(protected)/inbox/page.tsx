import { redirect } from "next/navigation";
import { InboxCaptureForm } from "@/components/inbox/InboxCaptureForm";
import {
  archiveInboxItemAction,
  createInboxItemAction,
  processInboxItemWithAiAction,
} from "@/lib/os/inbox-actions";
import {
  fetchInboxItemsForCurrentUser,
  fetchLinkedOperationalItemsByInboxId,
  OS_INBOX_PROCESSING_STATUS,
  type OsInboxItem,
} from "@/lib/os/inbox-data";
import { resolveAuthenticatedOsUserId } from "@/lib/os/auth";
import "./inbox-mobile.css";

export const dynamic = "force-dynamic";

function statusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClassName(item: OsInboxItem): string {
  switch (item.processingStatus) {
    case OS_INBOX_PROCESSING_STATUS.processed:
      return "os-inbox-item__status os-inbox-item__status--processed";
    case OS_INBOX_PROCESSING_STATUS.processing:
      return "os-inbox-item__status os-inbox-item__status--processing";
    case OS_INBOX_PROCESSING_STATUS.failed:
      return "os-inbox-item__status os-inbox-item__status--failed";
    default:
      return "os-inbox-item__status os-inbox-item__status--queued";
  }
}

function hasLinkedItems(linked: { tasks: { id: string }[]; waitingOns: { id: string }[] } | undefined): boolean {
  if (!linked) return false;
  return linked.tasks.length > 0 || linked.waitingOns.length > 0;
}

async function createInboxItemFormAction(formData: FormData): Promise<void> {
  "use server";
  const rawContent = formData.get("rawContent");
  await createInboxItemAction(typeof rawContent === "string" ? rawContent : "");
}

async function archiveInboxItemFormAction(formData: FormData): Promise<void> {
  "use server";
  const id = formData.get("id");
  await archiveInboxItemAction(typeof id === "string" ? id : "");
}

async function processInboxItemFormAction(formData: FormData): Promise<void> {
  "use server";
  const id = formData.get("id");
  console.log("[inbox/process] form action invoked", {
    idType: typeof id,
    hasId: typeof id === "string" && id.trim().length > 0,
  });
  await processInboxItemWithAiAction(typeof id === "string" ? id : "");
}

export default async function InboxPage() {
  const userId = await resolveAuthenticatedOsUserId();
  if (!userId) {
    redirect("/login");
  }

  const items = await fetchInboxItemsForCurrentUser();
  const linkedByInboxId = await fetchLinkedOperationalItemsByInboxId(
    userId,
    items.map((item) => item.id),
  );

  return (
    <main className="os-inbox-page mx-auto flex w-full min-w-0 flex-col px-4 py-5 sm:px-6 sm:py-6 max-md:mx-0 max-md:max-w-none max-md:flex-1 max-md:min-h-full max-md:px-0 max-md:py-0">
      <header className="os-inbox-page__intro max-md:hidden">
        <p className="os-inbox-page__eyebrow">Inbox</p>
        <p className="os-inbox-page__lede">Capture now. Organize later.</p>
      </header>

      <div className="os-inbox-feed mt-4 flex flex-col max-md:mt-0">
        <section className="os-inbox-capture" aria-labelledby="os-inbox-capture-heading">
          <h2 id="os-inbox-capture-heading" className="os-inbox-block__label">
            Quick capture
          </h2>
          <InboxCaptureForm action={createInboxItemFormAction} />
        </section>

        <section className="os-inbox-list-section" aria-labelledby="os-inbox-list-heading">
          <h2 id="os-inbox-list-heading" className="os-inbox-block__label">
            Recent captures
          </h2>
          {items.length === 0 ? (
            <div className="os-inbox-surface os-inbox-empty-state">
              <p className="os-inbox-empty-state__title">Inbox is clear</p>
              <p className="os-inbox-empty-state__hint">
                Capture one thing above when something comes to mind.
              </p>
            </div>
          ) : (
            <ul className="os-inbox-list">
              {items.map((item) => (
                <li key={item.id} className="os-inbox-list__item">
                  <article className="os-inbox-card os-inbox-surface">
                    <div className="os-inbox-item__meta">
                      <span className={statusClassName(item)}>
                        <span className="os-inbox-item__status-dot" aria-hidden="true" />
                        {statusLabel(item.processingStatus)}
                      </span>
                      <div className="os-inbox-item__meta-end">
                        <time className="os-inbox-item__time" dateTime={item.createdAt}>
                          {formatRelativeDate(item.createdAt)}
                        </time>
                        {item.processingStatus === OS_INBOX_PROCESSING_STATUS.queued ? (
                          <>
                            <span className="os-inbox-item__meta-sep" aria-hidden="true">
                              ·
                            </span>
                            <form
                              action={processInboxItemFormAction}
                              className="os-inbox-item__archive-form"
                            >
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" className="os-inbox-item__archive-button">
                                Process
                              </button>
                            </form>
                          </>
                        ) : null}
                        {item.processingStatus === OS_INBOX_PROCESSING_STATUS.processing ? (
                          <>
                            <span className="os-inbox-item__meta-sep" aria-hidden="true">
                              ·
                            </span>
                            <button
                              type="button"
                              className="os-inbox-item__archive-button"
                              disabled
                              aria-disabled="true"
                            >
                              Processing…
                            </button>
                          </>
                        ) : null}
                        <span className="os-inbox-item__meta-sep" aria-hidden="true">
                          ·
                        </span>
                        <form
                          action={archiveInboxItemFormAction}
                          className="os-inbox-item__archive-form"
                        >
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="os-inbox-item__archive-button">
                            Archive
                          </button>
                        </form>
                      </div>
                    </div>
                    <p className="os-inbox-item__content">{item.rawContent}</p>
                    {item.aiSummary?.trim() ? (
                      <p className="os-inbox-item__summary">{item.aiSummary}</p>
                    ) : null}
                    {item.processingStatus === OS_INBOX_PROCESSING_STATUS.processed &&
                    hasLinkedItems(linkedByInboxId[item.id]) ? (
                      <section className="os-inbox-item__linked" aria-label="AI created operational items">
                        {linkedByInboxId[item.id].tasks.length > 0 ? (
                          <div className="os-inbox-item__linked-group">
                            <p className="os-inbox-item__linked-label">Tasks</p>
                            <ul className="os-inbox-item__linked-list">
                              {linkedByInboxId[item.id].tasks.map((task) => (
                                <li key={task.id} className="os-inbox-item__linked-pill">
                                  {task.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {linkedByInboxId[item.id].waitingOns.length > 0 ? (
                          <div className="os-inbox-item__linked-group">
                            <p className="os-inbox-item__linked-label">Waiting On</p>
                            <ul className="os-inbox-item__linked-list">
                              {linkedByInboxId[item.id].waitingOns.map((waitingOn) => (
                                <li key={waitingOn.id} className="os-inbox-item__linked-pill">
                                  {waitingOn.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </section>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
