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
  vectorId: string | null;
  createdAt: string;
  updatedAt: string;
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
  vectorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodayProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  vectorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodayVector = {
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
  vectors: TodayVector[];
  latestBriefing: TodayBriefing | null;
};

type OsTaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority_level: string | null;
  due_at: string | null;
  project_id: string | null;
  vector_id: string | null;
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
  vector_id: string | null;
  created_at: string;
  updated_at: string;
};

type OsProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  vector_id: string | null;
  created_at: string;
  updated_at: string;
};

type OsVectorRow = {
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
    vectorId: row.vector_id,
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
    vectorId: row.vector_id,
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
    vectorId: row.vector_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVector(row: OsVectorRow): TodayVector {
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
      "id, title, description, status, priority_level, due_at, project_id, vector_id, created_at, updated_at",
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
      "id, title, description, status, priority_level, waiting_on_name, waiting_on_contact, expected_response_at, last_followed_up_at, project_id, vector_id, created_at, updated_at",
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
    .select("id, name, description, status, vector_id, created_at, updated_at")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchTodayPageData os_projects:", error.message);
    return [];
  }

  return ((data ?? []) as OsProjectRow[]).map(mapProject);
}

async function fetchActiveVectors(supabase: SupabaseClient, userId: string): Promise<TodayVector[]> {
  const { data, error } = await supabase
    .from("os_vectors")
    .select("id, name, description, status, color, icon, created_at, updated_at")
    .eq("owner_user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchTodayPageData os_vectors:", error.message);
    return [];
  }

  return ((data ?? []) as OsVectorRow[]).map(mapVector);
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
  const [tasks, waitingOns, projects, vectors, latestBriefing] = await Promise.all([
    fetchActiveTasks(supabase, userId),
    fetchActiveWaitingOns(supabase, userId),
    fetchActiveProjects(supabase, userId),
    fetchActiveVectors(supabase, userId),
    fetchLatestBriefing(supabase, userId),
  ]);

  return {
    tasks,
    waitingOns,
    projects,
    vectors,
    latestBriefing,
  };
}
