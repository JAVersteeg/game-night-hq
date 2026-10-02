import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { logError } from '@/lib/logError';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  /** True until the first session check (and any implicit sign-in it triggers) has settled. */
  isLoading: boolean;
  /** Set when anonymous sign-in failed outright — the app cannot proceed without an identity. */
  error: Error | null;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Identity is created silently: on first launch we call `signInAnonymously()` and never show a
 * login screen. The resulting user is an ordinary `auth.users` row with a normal session and JWT,
 * so every table that references a user id behaves identically whether or not the user is
 * anonymous.
 *
 * Until it is linked, this identity is device-bound: clearing app data or switching devices loses
 * it, with no way back.
 *
 * An identity can optionally be linked to Apple or Google afterwards (see `useAccountLink`), which
 * keeps the same user id and only makes it recoverable on another device. There is still
 * deliberately no `signOut`: on an unlinked identity it would destroy the only handle on the user's
 * groups and history, and offering it to linked users alone would be a confusing half-feature.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Guards against a second sign-in racing the first: onAuthStateChange fires during
  // signInAnonymously, and StrictMode double-invokes effects in development.
  const signInInFlight = useRef(false);

  // Which user the cached React Query data belongs to. Restoring a linked account swaps the session
  // to a different user id, and every cached row — groups, sessions, stats — belongs to the old one.
  const cachedUserId = useRef<string | null>(null);

  const applySession = useCallback((newSession: Session | null) => {
    const nextUserId = newSession?.user.id ?? null;
    if (cachedUserId.current !== null && nextUserId !== cachedUserId.current) {
      queryClient.clear();
    }
    cachedUserId.current = nextUserId;
    setSession(newSession);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function bootstrap() {
      try {
        const { data, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) throw getSessionError;
        if (isCancelled) return;

        if (data.session) {
          applySession(data.session);
          return;
        }

        if (signInInFlight.current) return;
        signInInFlight.current = true;

        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        if (isCancelled) return;

        applySession(signInData.session);
      } catch (caught) {
        if (isCancelled) return;
        void logError('client:AuthContext', caught, { context: 'anonymous bootstrap' });
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      } finally {
        signInInFlight.current = false;
        if (!isCancelled) setIsLoading(false);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, [applySession, retryCount]);

  // Deliberately no deep-link handler installing a session here. `gamenighthq://` is a plain
  // custom scheme — unverified, claimable by any app on the device — so a URL alone is never
  // evidence of anything. If a magic-link or OAuth-callback flow is added later, route it
  // through a server-verified exchange (an OTP code, or a code param traded server-side) rather
  // than reading tokens straight out of the link.

  const retry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryCount((count) => count + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, error, retry }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
