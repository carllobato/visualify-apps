import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";

/** Lightweight Today view models — not raw Supabase rows. */
export type TodayTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorityLevel: string | null;
  dueAt: string | null;
  projectId: string | null;
  streamId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodayTaskReason = "overdue" | "due_today" | "critical" | "high_priority";

export type TodaySurfaceTask = TodayTask & {
  reason: TodayTaskReason;
};

export type TodayWaitingOn = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorityLevel: string | null;
  waitingOnName: string | null;
  waitingOnContact: string | null;
  expectedResponseAt: string | null;
  lastFollowedUpAt: string | null;
  projectId: string | null;
  streamId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodayProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  streamId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodayStream = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodayBriefing = {
  id: string;
  title: string;
  briefingType: string;
  content: string;
  briefingDate: string;
  createdAt: string;
  updatedAt: string;
};

export type TodayPageData = {
  tasks: TodayTask[];
  waitingOns: TodayWaitingOn[];
  projects: TodayProject[];
  streams: TodayStream[];
  latestBriefing: TodayBriefing | null;
};

const MS_PER_LOCAL_DAY = 86_400_000;

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** True when `iso` falls on the local calendar day of `now` (default: today). */
export function isTaskDueOnLocalDay(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;
  return startOfLocalDayMs(target) === startOfLocalDayMs(now);
}

/** True when `iso` is on a calendar day before `now` (local time). */
export function isTaskOverdueOnLocalDay(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;
  return startOfLocalDayMs(target) < startOfLocalDayMs(now);
}

function normalizedPriority(priorityLevel: string | null): string | null {
  const trimmed = priorityLevel?.trim().toLowerCase();
  return trimmed || null;
}

function classifyTodayTaskReason(task: TodayTask, now: Date): TodayTaskReason | null {
  if (isTaskOverdueOnLocalDay(task.dueAt, now)) return "overdue";
  if (isTaskDueOnLocalDay(task.dueAt, now)) return "due_today";

  const priority = normalizedPriority(task.priorityLevel);
  if (priority === "critical") return "critical";
  if (priority === "high") return "high_priority";

  return null;
}

function reasonOrder(reason: TodayTaskReason): number {
  switch (reason) {
    case "overdue":
      return 0;
    case "due_today":
      return 1;
    case "critical":
      return 2;
    case "high_priority":
      return 3;
  }
}

function dueSortValue(dueAt: string | null): number {
  if (!dueAt) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(dueAt);
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return parsed;
}

/**
 * Tasks for the Today surface: due today only.
 * TODO: When `os_tasks` gains an explicit scheduled-for-today field (e.g. `scheduled_at`),
 * include tasks scheduled for today even when `due_at` is on another day.
 */
export function filterTasksForTodaySurface(tasks: TodayTask[]): TodayTask[] {
  const now = new Date();

  return tasks.filter((task) => classifyTodayTaskReason(task, now) !== null);
}

/**
 * Calm Today selection:
 * overdue → due today → critical → high-priority,
 * then due date / created-at fallback, with a small cap.
 */
export function selectTasksForTodaySurface(
  tasks: TodayTask[],
  limit = 6,
): TodaySurfaceTask[] {
  const now = new Date();
  const selected = tasks
    .map((task) => {
      const reason = classifyTodayTaskReason(task, now);
      if (!reason) return null;
      return { ...task, reason };
    })
    .filter((task): task is TodaySurfaceTask => task !== null)
    .sort((a, b) => {
      const reasonDelta = reasonOrder(a.reason) - reasonOrder(b.reason);
      if (reasonDelta !== 0) return reasonDelta;

      const dueDelta = dueSortValue(a.dueAt) - dueSortValue(b.dueAt);
      if (dueDelta !== 0) return dueDelta;

      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });

  return selected.slice(0, Math.max(0, limit));
}

/** Ensures every Today slice is defined (guards partial / stale fetch results). */
export function normalizeTodayPageData(
  data: Partial<TodayPageData> & { vectors?: TodayStream[] },
): TodayPageData {
  return {
    tasks: data.tasks ?? [],
    waitingOns: data.waitingOns ?? [],
    projects: data.projects ?? [],
    streams: data.streams ?? data.vectors ?? [],
    latestBriefing: data.latestBriefing ?? null,
  };
}

type OsTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority_level: string | null;
  due_at: string | null;
  project_id: string | null;
  stream_id: string | null;
  created_at: string;
  updated_at: string;
};

type OsWaitingOnRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority_level: string | null;
  waiting_on_name: string | null;
  waiting_on_contact: string | null;
  expected_response_at: string | null;
  last_followed_up_at: string | null;
  project_id: string | null;
  stream_id: string | null;
  created_at: string;
  updated_at: string;
};

type OsProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  stream_id: string | null;
  created_at: string;
  updated_at: string;
};

type OsStreamRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

type OsBriefingRow = {
  id: string;
  title: string;
  briefing_type: string;
  content: string;
  briefing_date: string;
  created_at: string;
  updated_at: string;
};

function mapTask(row: OsTaskRow): TodayTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priorityLevel: row.priority_level,
    dueAt: row.due_at,
    projectId: row.project_id,
    streamId: row.stream_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWaitingOn(row: OsWaitingOnRow): TodayWaitingOn {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priorityLevel: row.priority_level,
    waitingOnName: row.waiting_on_name,
    waitingOnContact: row.waiting_on_contact,
    expectedResponseAt: row.expected_response_at,
    lastFollowedUpAt: row.last_followed_up_at,
    projectId: row.project_id,
    streamId: row.stream_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: OsProjectRow): TodayProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    streamId: row.stream_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStream(row: OsStreamRow): TodayStream {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBriefing(row: OsBriefingRow): TodayBriefing {
  return {
    id: row.id,
    title: row.title,
    briefingType: row.briefing_type,
    content: row.content,
    briefingDate: row.briefing_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchActiveTasks(supabase: SupabaseClient, userId: string): Promise<TodayTask[]> {
  const { data, error } = await supabase
    .from("os_tasks")
    .select(
      "id, title, description, status, priority_level, due_at, project_id, stream_id, created_at, updated_at",
    )
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .order("priority_level", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchTodayPageData os_tasks:", error.message);
    return [];
  }

  return ((data ?? []) as OsTaskRow[]).map(mapTask);
}

async function fetchActiveWaitingOns(
  supabase: SupabaseClient,
  userId: string,
): Promise<TodayWaitingOn[]> {
  const { data, error } = await supabase
    .from("os_waiting_ons")
    .select(
      "id, title, description, status, priority_level, waiting_on_name, waiting_on_contact, expected_response_at, last_followed_up_at, project_id, stream_id, created_at, updated_at",
    )
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .order("expected_response_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchTodayPageData os_waiting_ons:", error.message);
    return [];
  }

  return ((data ?? []) as OsWaitingOnRow[]).map(mapWaitingOn);
}

async function fetchActiveProjects(supabase: SupabaseClient, userId: string): Promise<TodayProject[]> {
  const { data, error } = await supabase
    .from("os_projects")
    .select("id, name, description, status, stream_id, created_at, updated_at")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchTodayPageData os_projects:", error.message);
    return [];
  }

  return ((data ?? []) as OsProjectRow[]).map(mapProject);
}

async function fetchActiveStreams(supabase: SupabaseClient, userId: string): Promise<TodayStream[]> {
  const { data, error } = await supabase
    .from("os_streams")
    .select("id, name, description, status, color, icon, created_at, updated_at")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchTodayPageData os_streams:", error.message);
    return [];
  }

  return ((data ?? []) as OsStreamRow[]).map(mapStream);
}

async function fetchLatestBriefing(
  supabase: SupabaseClient,
  userId: string,
): Promise<TodayBriefing | null> {
  const { data, error } = await supabase
    .from("os_briefings")
    .select("id, title, briefing_type, content, briefing_date, created_at, updated_at")
    .eq("owner_user_id", userId)
    .order("briefing_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchTodayPageData os_briefings:", error.message);
    return null;
  }

  if (!data) return null;
  return mapBriefing(data as OsBriefingRow);
}

/**
 * Loads operational Today slices for the signed-in user (server-only).
 * Auth is enforced by the protected layout; pass `user.id` from `getUser()`.
 */
export async function fetchTodayPageData(userId: string): Promise<TodayPageData> {
  const supabase = await supabaseServerClient();
  const [tasks, waitingOns, projects, streams, latestBriefing] = await Promise.all([
    fetchActiveTasks(supabase, userId),
    fetchActiveWaitingOns(supabase, userId),
    fetchActiveProjects(supabase, userId),
    fetchActiveStreams(supabase, userId),
    fetchLatestBriefing(supabase, userId),
  ]);

  return normalizeTodayPageData({
    tasks,
    waitingOns,
    projects,
    streams,
    latestBriefing,
  });
}
