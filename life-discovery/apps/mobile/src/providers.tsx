import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { clearSessionStorage, readSession, writeSession } from "./storage";

type SessionContextValue = {
  ready: boolean;
  userId: string;
  token: string;
  setSession: (userId: string, token: string) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1
    }
  }
});

function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    readSession()
      .then((session) => {
        setUserId(session.userId);
        setToken(session.token);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ready,
      userId,
      token,
      setSession: async (nextUserId: string, nextToken: string) => {
        setUserId(nextUserId);
        setToken(nextToken);
        await writeSession(nextUserId, nextToken);
      },
      clearSession: async () => {
        await clearSessionStorage();
        const session = await readSession();
        setUserId(session.userId);
        setToken("");
      }
    }),
    [ready, token, userId]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside AppProviders");
  }
  return value;
}
