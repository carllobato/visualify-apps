/** Narrow auth client surface for account-security UI (no `@supabase/supabase-js` dependency). */
export type AppShellSupabaseAuthClient = {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: { message?: string } | null;
    }>;
    signInWithPassword(args: {
      email: string;
      password: string;
    }): Promise<{ error: { message?: string } | null }>;
    updateUser(args: { password: string }): Promise<{
      error: { message?: string } | null;
    }>;
    signOut(options?: { scope?: "global" }): Promise<unknown>;
    mfa: {
      enroll(args: { factorType: "totp" }): Promise<{
        data: {
          id: string;
          totp?: { qr_code?: string | null; secret?: string | null } | null;
        } | null;
        error: { message?: string } | null;
      }>;
      challenge(args: { factorId: string }): Promise<{
        data: { id: string } | null;
        error: { message?: string } | null;
      }>;
      verify(args: {
        factorId: string;
        challengeId: string;
        code: string;
      }): Promise<{ error: { message?: string } | null }>;
    };
  };
};
