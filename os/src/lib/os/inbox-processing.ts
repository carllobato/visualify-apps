import "server-only";

import OpenAI from "openai";
import { createProjectAction } from "@/lib/os/projects-actions";
import { fetchActiveProjectsForUserId } from "@/lib/os/projects-data";
import { createTaskAction } from "@/lib/os/tasks-actions";
import { supabaseServerClient } from "@/lib/supabase/server";

const SUMMARY_MAX = 400;
const TASK_TITLE_MAX = 200;
const TASK_NOTES_MAX = 2000;
const PROJECT_NAME_MAX = 120;
const PROJECT_DESCRIPTION_MAX = 2000;
const WAITING_ON_TITLE_MAX = 200;
const WAITING_ON_DESCRIPTION_MAX = 2000;
const WAITING_ON_NAME_MAX = 120;

type AiTaskPriority = "low" | "medium" | "high";

export type InboxAiTaskDraft = {
  title: string;
  notes: string | null;
  priority: AiTaskPriority;
  dueDate: string | null;
  projectTitle: string | null;
};

export type InboxAiProjectDraft = {
  name: string;
  description: string | null;
};

export type InboxAiStructuredResult = {
  summary: string;
  tasks: InboxAiTaskDraft[];
  projects: InboxAiProjectDraft[];
  waitingOns: InboxAiWaitingOnDraft[];
};

export type InboxAiWaitingOnDraft = {
  title: string;
  description: string | null;
  waitingOnName: string | null;
  priority: AiTaskPriority;
};

export type ProcessInboxWithAiResult =
  | {
      ok: true;
      summary: string;
      createdTaskIds: string[];
      createdProjectIds: string[];
      createdWaitingOnIds: string[];
    }
  | { ok: false; error: string };

function normalizeSpace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeNameKey(value: string): string {
  return normalizeSpace(value).toLowerCase();
}

function normalizeOptionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeSpace(value);
  if (!normalized) return null;
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function normalizePriority(value: unknown): AiTaskPriority {
  if (typeof value !== "string") return "medium";
  const v = value.trim().toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return "medium";
}

function normalizeDueDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = Date.parse(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return null;
  return trimmed;
}

function parseStructuredPayload(raw: string): InboxAiStructuredResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed == null) return null;
  const root = parsed as Record<string, unknown>;

  const summary = normalizeOptionalText(root.summary, SUMMARY_MAX);
  if (!summary) return null;

  const tasksRaw = Array.isArray(root.tasks) ? root.tasks : [];
  const projectsRaw = Array.isArray(root.projects) ? root.projects : [];
  const waitingOnsRaw = Array.isArray(root.waiting_ons) ? root.waiting_ons : [];

  const tasks: InboxAiTaskDraft[] = [];
  for (const taskRaw of tasksRaw) {
    if (typeof taskRaw !== "object" || taskRaw == null) continue;
    const t = taskRaw as Record<string, unknown>;
    const title = normalizeOptionalText(t.title, TASK_TITLE_MAX);
    if (!title) continue;
    tasks.push({
      title,
      notes: normalizeOptionalText(t.notes, TASK_NOTES_MAX),
      priority: normalizePriority(t.priority),
      dueDate: normalizeDueDate(t.due_date),
      projectTitle: normalizeOptionalText(t.project_title, PROJECT_NAME_MAX),
    });
  }

  const projects: InboxAiProjectDraft[] = [];
  const seen = new Set<string>();
  for (const projectRaw of projectsRaw) {
    if (typeof projectRaw !== "object" || projectRaw == null) continue;
    const p = projectRaw as Record<string, unknown>;
    const name = normalizeOptionalText(p.name, PROJECT_NAME_MAX);
    if (!name) continue;
    const key = normalizeNameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    projects.push({
      name,
      description: normalizeOptionalText(p.description, PROJECT_DESCRIPTION_MAX),
    });
  }

  const waitingOns: InboxAiWaitingOnDraft[] = [];
  const seenWaitingOnTitle = new Set<string>();
  for (const waitingOnRaw of waitingOnsRaw) {
    if (typeof waitingOnRaw !== "object" || waitingOnRaw == null) continue;
    const w = waitingOnRaw as Record<string, unknown>;
    const title = normalizeOptionalText(w.title, WAITING_ON_TITLE_MAX);
    if (!title) continue;
    const key = normalizeNameKey(title);
    if (seenWaitingOnTitle.has(key)) continue;
    seenWaitingOnTitle.add(key);
    waitingOns.push({
      title,
      description: normalizeOptionalText(w.description, WAITING_ON_DESCRIPTION_MAX),
      waitingOnName: normalizeOptionalText(w.waiting_on_name, WAITING_ON_NAME_MAX),
      priority: normalizePriority(w.priority),
    });
  }

  return { summary, tasks, projects, waitingOns };
}

function shouldCreateProjectFromInbox(rawContent: string, projectName: string): boolean {
  const body = rawContent.toLowerCase();
  const name = projectName.toLowerCase();
  if (projectName.trim().length < 4) return false;
  if (!body.includes(name)) return false;

  const vagueSignals = ["idea", "someday", "maybe", "could", "explore", "brainstorm"];
  if (vagueSignals.some((token) => body.includes(token))) {
    return false;
  }
  return true;
}

function resolveObviousProjectForWaitingOn(
  rawContent: string,
  projectIdsByNameKey: ReadonlyMap<string, string>,
): string | null {
  const body = rawContent.toLowerCase();
  const matches: string[] = [];
  for (const [nameKey, projectId] of projectIdsByNameKey.entries()) {
    if (nameKey.length < 4) continue;
    if (body.includes(nameKey)) {
      matches.push(projectId);
      if (matches.length > 1) return null;
    }
  }
  return matches[0] ?? null;
}

async function waitingOnAlreadyExists(
  ownerUserId: string,
  sourceInboxItemId: string,
  title: string,
): Promise<boolean> {
  const supabase = await supabaseServerClient();
  const { data, error } = await supabase
    .from("os_waiting_ons")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("source_inbox_item_id", sourceInboxItemId)
    .eq("title", title)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[inbox/process] waiting-on duplicate check failed", error.message);
    return false;
  }
  return Boolean(data?.id);
}

async function createWaitingOnFromInbox(args: {
  ownerUserId: string;
  sourceInboxItemId: string;
  title: string;
  description: string | null;
  waitingOnName: string | null;
  priority: AiTaskPriority;
  projectId: string | null;
}): Promise<string | null> {
  const supabase = await supabaseServerClient();
  const payload: Record<string, unknown> = {
    owner_user_id: args.ownerUserId,
    title: args.title,
    description: args.description,
    waiting_on_name: args.waitingOnName,
    priority_level: args.priority || "medium",
    status: "active",
    project_id: args.projectId,
    source_inbox_item_id: args.sourceInboxItemId,
  };

  const { data, error } = await supabase
    .from("os_waiting_ons")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (!error && data?.id) {
    return data.id as string;
  }

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("source_inbox_item_id")) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.source_inbox_item_id;
      const fallback = await supabase
        .from("os_waiting_ons")
        .insert(fallbackPayload)
        .select("id")
        .maybeSingle();
      if (!fallback.error && fallback.data?.id) {
        return fallback.data.id as string;
      }
      if (fallback.error) {
        console.error("[inbox/process] waiting-on fallback insert failed", fallback.error.message);
      }
      return null;
    }

    console.error("[inbox/process] waiting-on insert failed", error.message);
  }
  return null;
}

async function requestStructuredInboxProcessing(rawContent: string): Promise<InboxAiStructuredResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.log("[inbox/process] missing OPENAI_API_KEY");
    return null;
  }

  const openai = new OpenAI({ apiKey });
  console.log("[inbox/process] OpenAI request start", { rawContentLength: rawContent.length });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "os_inbox_processing",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  notes: { type: ["string", "null"] },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  due_date: { type: ["string", "null"] },
                  project_title: { type: ["string", "null"] },
                },
                required: ["title", "notes", "priority", "due_date", "project_title"],
              },
            },
            projects: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: ["string", "null"] },
                },
                required: ["name", "description"],
              },
            },
            waiting_ons: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  description: { type: ["string", "null"] },
                  waiting_on_name: { type: ["string", "null"] },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                },
                required: ["title", "description", "waiting_on_name", "priority"],
              },
            },
          },
          required: ["summary", "tasks", "projects", "waiting_ons"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You transform inbox captures into operational tasks/projects/waiting-ons. Return strict JSON only. Be conservative. Prefer tasks over creating new projects unless project intent is explicit. Create waiting_ons only for explicit dependency/follow-up states: awaiting response, blocked by someone, pending external action, waiting for approval/pricing/callback/review/feedback.",
      },
      {
        role: "user",
        content: `Process this inbox item:\n\n${rawContent}`,
      },
    ],
  });
  console.log("[inbox/process] OpenAI response received");

  const content = completion.choices[0]?.message?.content ?? "";
  console.log("[inbox/process] OpenAI content length", { contentLength: content.length });
  return parseStructuredPayload(content);
}

export async function processSingleInboxItemWithAi(
  ownerUserId: string,
  inboxItemId: string,
  rawContent: string,
): Promise<ProcessInboxWithAiResult> {
  console.log("[inbox/process] single-item processing start", { ownerUserId, inboxItemId });
  const ai = await requestStructuredInboxProcessing(rawContent);
  if (!ai) {
    return { ok: false, error: "Unable to parse structured AI output." };
  }
  console.log("[inbox/process] structured payload parsed", {
    summaryLength: ai.summary.length,
    taskCount: ai.tasks.length,
    projectCount: ai.projects.length,
    waitingOnCount: ai.waitingOns.length,
  });

  const existingProjects = await fetchActiveProjectsForUserId(ownerUserId);
  const projectIdsByNameKey = new Map<string, string>();
  for (const project of existingProjects) {
    projectIdsByNameKey.set(normalizeNameKey(project.name), project.id);
  }

  const createdProjectIds: string[] = [];
  for (const suggestion of ai.projects) {
    const key = normalizeNameKey(suggestion.name);
    if (projectIdsByNameKey.has(key)) continue;
    if (!shouldCreateProjectFromInbox(rawContent, suggestion.name)) continue;

    const created = await createProjectAction({
      name: suggestion.name,
      description: suggestion.description,
    });
    if (created.ok) {
      projectIdsByNameKey.set(key, created.project.id);
      createdProjectIds.push(created.project.id);
    }
  }
  console.log("[inbox/process] project creation pass complete", {
    createdProjectCount: createdProjectIds.length,
  });

  const createdTaskIds: string[] = [];
  for (const taskDraft of ai.tasks) {
    let description = taskDraft.notes;
    let projectId: string | null = null;
    const projectTitle = taskDraft.projectTitle ? normalizeNameKey(taskDraft.projectTitle) : null;

    if (projectTitle) {
      projectId = projectIdsByNameKey.get(projectTitle) ?? null;
      if (!projectId) {
        const projectHint = `Possible project: ${taskDraft.projectTitle}`;
        description = description ? `${description}\n\n${projectHint}` : projectHint;
      }
    }

    const created = await createTaskAction({
      title: taskDraft.title,
      description,
      priorityLevel: taskDraft.priority,
      dueAt: taskDraft.dueDate ? `${taskDraft.dueDate}T00:00:00.000Z` : null,
      projectId,
      sourceInboxItemId: inboxItemId,
    });
    if (created.ok) {
      createdTaskIds.push(created.task.id);
    }
  }
  console.log("[inbox/process] task creation pass complete", {
    createdTaskCount: createdTaskIds.length,
  });

  const obviousProjectId = resolveObviousProjectForWaitingOn(rawContent, projectIdsByNameKey);
  const createdWaitingOnIds: string[] = [];
  for (const waitingOnDraft of ai.waitingOns) {
    const alreadyExists = await waitingOnAlreadyExists(ownerUserId, inboxItemId, waitingOnDraft.title);
    if (alreadyExists) {
      continue;
    }

    const createdId = await createWaitingOnFromInbox({
      ownerUserId,
      sourceInboxItemId: inboxItemId,
      title: waitingOnDraft.title,
      description: waitingOnDraft.description,
      waitingOnName: waitingOnDraft.waitingOnName,
      priority: waitingOnDraft.priority || "medium",
      projectId: obviousProjectId,
    });

    if (createdId) {
      createdWaitingOnIds.push(createdId);
    }
  }
  console.log("[inbox/process] waiting-on creation pass complete", {
    createdWaitingOnCount: createdWaitingOnIds.length,
  });

  return {
    ok: true,
    summary: ai.summary,
    createdTaskIds,
    createdProjectIds,
    createdWaitingOnIds,
  };
}
