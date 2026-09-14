import { QueryClient } from '@tanstack/react-query';

/**
 * Server state lives here; Zustand/component state is reserved for pure UI concerns.
 *
 * Retry deliberately excludes PostgREST's 4xx family: an RLS denial or a constraint violation is a
 * verdict, not a blip, and retrying it three times just delays the error the user needs to see.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  // PostgREST surfaces Postgres SQLSTATEs; 42501 is insufficient_privilege (an RLS refusal),
  // 23xxx are integrity violations, and P0002 (no_data_found) is what our RPCs raise for a lookup
  // that matched nothing — a wrong invite code, say. None of these become true on a second attempt.
  if (typeof code === 'string' && (code === '42501' || code === 'P0002' || code.startsWith('23'))) {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      // Score data arrives over Realtime rather than by polling, so a short stale window is enough
      // to dedupe the burst of refetches that a screen mount causes.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: shouldRetry },
  },
});
