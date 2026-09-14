interface LogErrorOptions {
  context?: string;
  details?: Record<string, unknown>;
}

/**
 * Best-effort error reporting, fully swallowed: logging must never throw or surface to the user.
 *
 * Currently just consoles. Once a schema exists, point this at a `public.error_logs` table
 * (source text, message text, context text, details jsonb, user_id uuid, platform text) the way
 * Stride does — insert via `supabase.from('error_logs').insert(...)` inside the try block below.
 */
export async function logError(
  source: string,
  error: unknown,
  options: LogErrorOptions = {},
): Promise<void> {
  try {
    console.error(`[${source}]`, error, options);
  } catch {
    // Swallow — logging must never throw.
  }
}

/**
 * Route uncaught JS errors through logError, then defer to the previous handler so React
 * Native's default fatal-error behaviour is preserved. Call once at app startup.
 */
export function installGlobalErrorLogger(): void {
  const globalWithErrorUtils = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  };

  const errorUtils = globalWithErrorUtils.ErrorUtils;
  if (!errorUtils) return;

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    void logError('client:global', error, { context: isFatal ? 'fatal' : 'non-fatal' });
    previousHandler(error, isFatal);
  });
}
