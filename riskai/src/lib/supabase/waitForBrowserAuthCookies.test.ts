import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentHasSupabaseAuthCookie } from "./waitForBrowserAuthCookies";

describe("documentHasSupabaseAuthCookie", () => {
  it("detects a standard supabase-js auth cookie", () => {
    assert.equal(
      documentHasSupabaseAuthCookie("sb-abcdxyz-auth-token=base64-payload"),
      true
    );
  });

  it("detects chunked supabase-js auth cookies", () => {
    assert.equal(
      documentHasSupabaseAuthCookie("theme=light; sb-abcdxyz-auth-token.0=chunk"),
      true
    );
  });

  it("ignores unrelated cookies on the login page", () => {
    assert.equal(documentHasSupabaseAuthCookie(""), false);
    assert.equal(documentHasSupabaseAuthCookie("riskai-theme=light"), false);
    assert.equal(
      documentHasSupabaseAuthCookie("sb-abcdxyz-auth-token-code-verifier=pkce"),
      false
    );
  });
});
