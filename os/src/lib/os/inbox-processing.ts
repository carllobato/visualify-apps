import "server-only";

import OpenAI from "openai";
import { fetchActiveProjectsForUserId } from "@/lib/os/projects-data";
import { fetchActiveStreamsForUser } from "@/lib/os/streams-data";
import { createTaskAction } from "@/lib/os/tasks-actions";
import { fetchActiveTasksForUserId } from "@/lib/os/tasks-data";
import { stripInboxStreamContext } from "@/lib/os/inbox-stream-context";
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

function normalizeTaskTitleKey(value: string): string {
  const lower = value.toLowerCase();
  const punctuationStripped = lower.replace(/[.,!?;:'"`()[\]{}\\/_-]+/g, " ");
  const collapsed = punctuationStripped.replace(/\s+/g, " ").trim();
  const normalizedFollowUp = collapsed.replace(/^follow\s*up\s*on\s+/, "follow up ");
  return normalizedFollowUp.trim();
}

function tokenize(value: string): string[] {
  return normalizeNameKey(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
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

type MatchingProject = {
  id: string;
  streamId: string | null;
  nameKey: string;
  tokens: string[];
};

type MatchingStream = {
  id: string;
  nameKey: string;
  tokens: string[];
};

type ResolvedOperationalLink = {
  projectId: string | null;
  streamId: string | null;
};

type TokenMatchScore = {
  matched: number;
  ratio: number;
  hasLongTokenMatch: boolean;
};

function countTokenMatches(textTokens: Set<string>, candidateTokens: readonly string[]): number {
  let count = 0;
  for (const token of candidateTokens) {
    if (textTokens.has(token)) count += 1;
  }
  return count;
}

function scoreTokenMatch(
  textTokens: Set<string>,
  candidateTokens: readonly string[],
): TokenMatchScore {
  if (candidateTokens.length === 0) {
    return { matched: 0, ratio: 0, hasLongTokenMatch: false };
  }
  let matched = 0;
  let hasLongTokenMatch = false;
  for (const token of candidateTokens) {
    if (!textTokens.has(token)) continue;
    matched += 1;
    if (token.length >= 6) hasLongTokenMatch = true;
  }
  return {
    matched,
    ratio: matched / candidateTokens.length,
    hasLongTokenMatch,
  };
}

function hasStrongTextOverlapWithProject(searchableText: string, project: MatchingProject): boolean {
  const textKey = normalizeNameKey(searchableText);
  if (!textKey) return false;
  if (textKey.includes(project.nameKey)) return true;

  const textTokens = new Set(tokenize(textKey));
  if (textTokens.size === 0) return false;
  const score = scoreTokenMatch(textTokens, project.tokens);
  if (score.matched >= 2 && score.ratio >= 0.75) return true;
  if (project.tokens.length === 1 && score.hasLongTokenMatch) return true;
  return false;
}

function hasStrongStreamMention(searchableText: string, stream: MatchingStream): boolean {
  const textKey = normalizeNameKey(searchableText);
  if (!textKey) return false;
  if (textKey.includes(stream.nameKey)) return true;
  const textTokens = new Set(tokenize(textKey));
  if (textTokens.size === 0) return false;
  const score = scoreTokenMatch(textTokens, stream.tokens);
  if (score.matched >= 2 && score.ratio >= 0.8) return true;
  if (stream.tokens.length === 1 && score.hasLongTokenMatch) return true;
  return false;
}

function hasWeddingLikeSignal(searchableText: string): boolean {
  const textKey = normalizeNameKey(searchableText);
  if (!textKey) return false;
  return [
    "wedding",
    "bride",
    "groom",
    "bridal",
    "honeymoon",
    "maid of honor",
    "best man",
  ].some((token) => textKey.includes(token));
}

function hasConflictingStrongStreamSignal(args: {
  searchableText: string;
  targetStreamId: string | null;
  streams: readonly MatchingStream[];
}): boolean {
  const { searchableText, targetStreamId, streams } = args;
  if (!targetStreamId) return false;
  return streams.some(
    (stream) => stream.id !== targetStreamId && hasStrongStreamMention(searchableText, stream),
  );
}

function pickBestStreamByName(
  searchableText: string,
  streams: readonly MatchingStream[],
): MatchingStream | null {
  const textKey = normalizeNameKey(searchableText);
  if (!textKey) return null;

  const exact = streams.find((stream) => textKey.includes(stream.nameKey));
  if (exact) return exact;

  const textTokens = new Set(tokenize(textKey));
  if (textTokens.size === 0) return null;

  let best: { stream: MatchingStream; score: number } | null = null;
  for (const stream of streams) {
    if (stream.tokens.length === 0) continue;
    const matched = countTokenMatches(textTokens, stream.tokens);
    const score = matched / stream.tokens.length;
    if (score < 0.8 || matched < 2) continue;
    if (!best || score > best.score) {
      best = { stream, score };
    }
  }
  return best?.stream ?? null;
}

function pickBestProjectByName(
  searchableText: string,
  projects: readonly MatchingProject[],
): MatchingProject | null {
  const textKey = normalizeNameKey(searchableText);
  if (!textKey) return null;

  const exactMatches = projects.filter((project) => textKey.includes(project.nameKey));
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) return null;

  const textTokens = new Set(tokenize(textKey));
  if (textTokens.size === 0) return null;

  let best: { project: MatchingProject; score: number } | null = null;
  for (const project of projects) {
    if (project.tokens.length === 0) continue;
    const matched = countTokenMatches(textTokens, project.tokens);
    const score = matched / project.tokens.length;
    if (score < 0.75 || matched < 1) continue;
    if (!best || score > best.score) {
      best = { project, score };
    } else if (best && score === best.score && best.project.id !== project.id) {
      best = null;
    }
  }
  if (best?.project) return best.project;

  const candidates = projects
    .map((project) => {
      if (project.tokens.length === 0) return null;
      const matchedTokens = project.tokens.filter((token) => textTokens.has(token));
      if (matchedTokens.length === 0) return null;
      return { project, matchedTokens };
    })
    .filter(
      (
        candidate,
      ): candidate is { project: MatchingProject; matchedTokens: string[] } => candidate != null,
    );
  if (candidates.length === 0) return null;

  const strongCandidates = candidates.filter(({ matchedTokens }) =>
    matchedTokens.some((token) => token.length >= 6),
  );
  const source = strongCandidates.length > 0 ? strongCandidates : candidates;
  if (source.length === 1) return source[0].project;

  source.sort((a, b) => b.matchedTokens.length - a.matchedTokens.length);
  if (
    source.length >= 2 &&
    source[0].matchedTokens.length === source[1].matchedTokens.length
  ) {
    return null;
  }
  return source[0].project;
}

function chooseSafeDefaultStream(
  searchableText: string,
  streams: readonly MatchingStream[],
): string | null {
  if (streams.length === 0) return null;
  const text = normalizeNameKey(searchableText);
  const workSignals = [
    "invoice",
    "client",
    "proposal",
    "contract",
    "finance",
    "payment",
    "vendor",
    "approval",
    "stakeholder",
    "budget",
    "work",
    "commercial",
  ];
  const personalSignals = [
    "personal",
    "family",
    "home",
    "health",
    "wedding",
    "travel",
    "life admin",
    "friend",
    "birthday",
    "appointment",
  ];

  const streamByName = new Map<string, MatchingStream>();
  for (const stream of streams) {
    streamByName.set(stream.nameKey, stream);
  }

  const workStream =
    streamByName.get("work") ??
    streams.find((stream) => stream.nameKey.includes("work") || stream.nameKey.includes("finance")) ??
    null;
  const personalStream =
    streamByName.get("personal") ??
    streams.find((stream) => stream.nameKey.includes("personal") || stream.nameKey.includes("life")) ??
    null;

  if (workSignals.some((signal) => text.includes(signal))) {
    return workStream?.id ?? null;
  }
  if (personalSignals.some((signal) => text.includes(signal))) {
    return personalStream?.id ?? null;
  }
  return personalStream?.id ?? workStream?.id ?? null;
}

function resolveOperationalLink(args: {
  itemText: string;
  rawContentText: string;
  hintedProjectTitle?: string | null;
  streamContextName: string | null;
  projects: readonly MatchingProject[];
  streams: readonly MatchingStream[];
}): ResolvedOperationalLink {
  const mergedText = `${args.itemText}\n${args.rawContentText}`;
  const projectHint = normalizeOptionalText(args.hintedProjectTitle, PROJECT_NAME_MAX);
  const streamFromText = pickBestStreamByName(mergedText, args.streams);
  const streamFromContext = args.streamContextName
    ? pickBestStreamByName(args.streamContextName, args.streams)
    : null;
  const effectiveStreamId = streamFromText?.id ?? streamFromContext?.id ?? null;

  const canUseProject = (project: MatchingProject): boolean => {
    const projectStreamId = project.streamId ?? null;
    const projectStream = projectStreamId
      ? args.streams.find((stream) => stream.id === projectStreamId) ?? null
      : null;
    if (
      hasConflictingStrongStreamSignal({
        searchableText: mergedText,
        targetStreamId: projectStreamId ?? effectiveStreamId,
        streams: args.streams,
      })
    ) {
      return false;
    }

    if (
      hasWeddingLikeSignal(mergedText) &&
      projectStreamId &&
      projectStream &&
      !hasStrongStreamMention(mergedText, projectStream)
    ) {
      return false;
    }

    return true;
  };

  const hintProject = projectHint ? pickBestProjectByName(projectHint, args.projects) : null;
  if (hintProject && hasStrongTextOverlapWithProject(projectHint ?? "", hintProject) && canUseProject(hintProject)) {
    return {
      projectId: hintProject.id,
      streamId: hintProject.streamId ?? effectiveStreamId,
    };
  }

  const projectFromText = pickBestProjectByName(mergedText, args.projects);
  if (projectFromText && hasStrongTextOverlapWithProject(mergedText, projectFromText) && canUseProject(projectFromText)) {
    return {
      projectId: projectFromText.id,
      streamId: projectFromText.streamId ?? effectiveStreamId,
    };
  }

  if (streamFromContext) {
    const activeProjectsInStream = args.projects.filter((project) => project.streamId === streamFromContext.id);
    if (
      activeProjectsInStream.length === 1 &&
      !hasConflictingStrongStreamSignal({
        searchableText: mergedText,
        targetStreamId: streamFromContext.id,
        streams: args.streams,
      }) &&
      !hasWeddingLikeSignal(mergedText)
    ) {
      return {
        projectId: activeProjectsInStream[0].id,
        streamId: streamFromContext.id,
      };
    }
  }

  if (effectiveStreamId) {
    return { projectId: null, streamId: effectiveStreamId };
  }

  return {
    projectId: null,
    streamId: chooseSafeDefaultStream(mergedText, args.streams),
  };
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
  streamId: string | null;
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
    stream_id: args.streamId,
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

async function requestStructuredInboxProcessing(args: {
  rawContent: string;
  streamContextName: string | null;
  existingProjectNames: string[];
}): Promise<InboxAiStructuredResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.log("[inbox/process] missing OPENAI_API_KEY");
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const projectList = args.existingProjectNames.slice(0, 40);
  const projectCatalogText =
    projectList.length > 0 ? `Existing projects:\n- ${projectList.join("\n- ")}` : "Existing projects: none";
  const streamContextText = args.streamContextName
    ? `Selected stream context: ${args.streamContextName}`
    : "Selected stream context: none";

  console.log("[inbox/process] OpenAI request start", { rawContentLength: args.rawContent.length });
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
          "You transform inbox captures into operational tasks/projects/waiting-ons. Return strict JSON only. Be conservative. Prefer tasks over creating new projects unless project intent is explicit. For project_title on tasks, prefer exact reuse of an existing project name when there is any strong textual overlap (for example: 'Return Wedding Shoes' should map to project title 'Wedding'). Create waiting_ons only for explicit dependency/follow-up states: awaiting response, blocked by someone, pending external action, waiting for approval/pricing/callback/review/feedback.",
      },
      {
        role: "user",
        content: `Process this inbox item.\n\n${streamContextText}\n\n${projectCatalogText}\n\nInbox item:\n${args.rawContent}`,
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
  const { content: rawContentWithoutStreamContext, streamName: streamContextName } =
    stripInboxStreamContext(rawContent);
  const existingProjects = await fetchActiveProjectsForUserId(ownerUserId);
  const existingStreams = await fetchActiveStreamsForUser(ownerUserId);
  const ai = await requestStructuredInboxProcessing({
    rawContent: rawContentWithoutStreamContext,
    streamContextName,
    existingProjectNames: existingProjects.map((project) => project.name),
  });
  if (!ai) {
    return { ok: false, error: "Unable to parse structured AI output." };
  }
  console.log("[inbox/process] structured payload parsed", {
    summaryLength: ai.summary.length,
    taskCount: ai.tasks.length,
    projectCount: ai.projects.length,
    waitingOnCount: ai.waitingOns.length,
  });

  const matchingProjects: MatchingProject[] = existingProjects.map((project) => ({
    id: project.id,
    streamId: project.streamId,
    nameKey: normalizeNameKey(project.name),
    tokens: tokenize(project.name),
  }));
  const matchingStreams: MatchingStream[] = existingStreams.map((stream) => ({
    id: stream.id,
    nameKey: normalizeNameKey(stream.name),
    tokens: tokenize(stream.name),
  }));
  const createdProjectIds: string[] = [];
  console.log("[inbox/process] project creation pass complete", {
    createdProjectCount: createdProjectIds.length,
  });

  const activeTasks = await fetchActiveTasksForUserId(ownerUserId);
  const existingActiveTaskTitleKeys = new Set<string>();
  for (const task of activeTasks) {
    const key = normalizeTaskTitleKey(task.title);
    if (key) existingActiveTaskTitleKeys.add(key);
  }

  const createdTaskIds: string[] = [];
  for (const taskDraft of ai.tasks) {
    const taskTitleKey = normalizeTaskTitleKey(taskDraft.title);
    if (!taskTitleKey) continue;
    if (existingActiveTaskTitleKeys.has(taskTitleKey)) {
      continue;
    }

    let description = taskDraft.notes;
    const resolvedLink = resolveOperationalLink({
      itemText: `${taskDraft.title}\n${taskDraft.notes ?? ""}`,
      rawContentText: rawContentWithoutStreamContext,
      hintedProjectTitle: taskDraft.projectTitle,
      streamContextName,
      projects: matchingProjects,
      streams: matchingStreams,
    });
    if (!resolvedLink.projectId && taskDraft.projectTitle) {
        const projectHint = `Possible project: ${taskDraft.projectTitle}`;
        description = description ? `${description}\n\n${projectHint}` : projectHint;
    }

    const created = await createTaskAction({
      title: taskDraft.title,
      description,
      priorityLevel: taskDraft.priority,
      dueAt: taskDraft.dueDate ? `${taskDraft.dueDate}T00:00:00.000Z` : null,
      projectId: resolvedLink.projectId,
      streamId: resolvedLink.streamId,
      sourceInboxItemId: inboxItemId,
    });
    if (created.ok) {
      createdTaskIds.push(created.task.id);
      existingActiveTaskTitleKeys.add(taskTitleKey);
    }
  }
  console.log("[inbox/process] task creation pass complete", {
    createdTaskCount: createdTaskIds.length,
  });

  const createdWaitingOnIds: string[] = [];
  for (const waitingOnDraft of ai.waitingOns) {
    const alreadyExists = await waitingOnAlreadyExists(ownerUserId, inboxItemId, waitingOnDraft.title);
    if (alreadyExists) {
      continue;
    }

    const resolvedLink = resolveOperationalLink({
      itemText: `${waitingOnDraft.title}\n${waitingOnDraft.description ?? ""}\n${waitingOnDraft.waitingOnName ?? ""}`,
      rawContentText: rawContentWithoutStreamContext,
      streamContextName,
      projects: matchingProjects,
      streams: matchingStreams,
    });

    const createdId = await createWaitingOnFromInbox({
      ownerUserId,
      sourceInboxItemId: inboxItemId,
      title: waitingOnDraft.title,
      description: waitingOnDraft.description,
      waitingOnName: waitingOnDraft.waitingOnName,
      priority: waitingOnDraft.priority || "medium",
      projectId: resolvedLink.projectId,
      streamId: resolvedLink.streamId,
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
