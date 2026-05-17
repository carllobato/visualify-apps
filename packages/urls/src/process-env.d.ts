/** Minimal `process.env` typing for Next.js server/client without `@types/node`. */
declare const process:
  | {
      env?: Record<string, string | undefined>;
    }
  | undefined;
