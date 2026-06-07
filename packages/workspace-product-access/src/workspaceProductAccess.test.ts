import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchWorkspaceProductAccessForUser,
  hasProductAccess,
} from "./workspaceProductAccess.ts";

function createCountingSupabase(queryCount: { value: number }): SupabaseClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    then(onFulfilled: (value: { data: unknown[]; error: null }) => unknown) {
      queryCount.value += 1;
      return Promise.resolve(onFulfilled({ data: [], error: null }));
    },
  };

  return {
    from: () => chain,
  } as unknown as SupabaseClient;
}

function createSupabaseWithProductKey(productKey: string): SupabaseClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    then(onFulfilled: (value: { data: unknown[]; error: null }) => unknown) {
      return Promise.resolve(
        onFulfilled({
          data: [
            {
              role: "member",
              status: "active",
              visualify_workspaces: {
                name: "Acme",
                slug: "acme",
                status: "active",
                visualify_workspace_products: {
                  subscription_status: "active",
                  plan: null,
                  visualify_products: {
                    key: productKey,
                    name: "Report",
                  },
                },
              },
            },
          ],
          error: null,
        }),
      );
    },
  };

  return {
    from: () => chain,
  } as unknown as SupabaseClient;
}

describe("hasProductAccess product key normalization", () => {
  it("matches when the stored product key has leading or trailing whitespace", async () => {
    const supabase = createSupabaseWithProductKey(" report ");

    assert.equal(await hasProductAccess(supabase, "user-whitespace-row", "report"), true);
  });

  it("matches when the caller passes a product key with leading or trailing whitespace", async () => {
    const supabase = createSupabaseWithProductKey("report");

    assert.equal(await hasProductAccess(supabase, "user-whitespace-param", " report "), true);
  });

  it("returns false for blank product keys after trimming", async () => {
    const supabase = createSupabaseWithProductKey("report");

    assert.equal(await hasProductAccess(supabase, "user-blank-key", "   "), false);
  });
});

describe("fetchWorkspaceProductAccessForUser per-request cache", () => {
  it("documents slot dedup used with React cache in RSC (one query per user slot)", async () => {
    const queryCount = { value: 0 };
    const slot = { promise: null as Promise<unknown[]> | null };

    async function loadOncePerUserSlot(supabase: SupabaseClient): Promise<unknown[]> {
      slot.promise ??= fetchWorkspaceProductAccessForUser(supabase, "user-123");
      return slot.promise;
    }

    await loadOncePerUserSlot(createCountingSupabase(queryCount));
    await loadOncePerUserSlot(createCountingSupabase(queryCount));
    await loadOncePerUserSlot(createCountingSupabase(queryCount));

    assert.equal(queryCount.value, 1);
  });
});
