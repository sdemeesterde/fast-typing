import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../utils/apiClient";
import {
  type ConnectionRequest,
  type ConnectionResponse,
  type ConnectionState,
  type ApiErrorCode,
  type ApiError,
  isApiErrorCode,
  type Heartbeat,
} from "../types/api";
import type { GameState } from "../types/game";

const HEARTBEAT_INTERVAL_MS = 20_000;

export interface UseConnectionReturn {
  state: ConnectionState | null;
  isLoading: boolean;
  loginError: ApiErrorCode | null;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useConnection(
  gameScoreRef: React.RefObject<number>,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
): UseConnectionReturn {
  const [state, setConnectionState] = useState<ConnectionState | null>(null);
  const [isLoading, setConnectionIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<ApiErrorCode | null>(null);

  // Keep a stable ref so the heartbeat interval always sees the latest connection
  // without needing to be recreated when it changes.
  const connectionRef = useRef(state);
  useEffect(() => {
    connectionRef.current = state;
  }, [state]);

  const withTimeout = (ms: number) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
  };

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state) return;

    let cancelled = false;
    let failures = 0;

    const loop = async () => {
      while (!cancelled) {
        const current = connectionRef.current;
        if (!current) return;

        try {
          const { signal, clear } = withTimeout(5000);

          await apiClient.post<void>(
            "/heartbeat",
            {
              username: current.username,
              token: current.token,
            } satisfies Heartbeat,
            { signal },
          );

          failures = 0;
          clear();
        } catch {
          failures++;
          if (failures >= 2) {
            logout();
            return;
          }
        }

        await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS));
      }
    };

    loop();

    return () => {
      cancelled = true;
    };
  }, [state?.token]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string) => {
    setConnectionIsLoading(true);
    setLoginError(null);

    try {
      const { token } = await apiClient.post<ConnectionResponse>(
        "/connection",
        {
          username,
        } satisfies ConnectionRequest,
      );
      const newConnection: ConnectionState = { username, token };
      setConnectionState(newConnection);
    } catch (err: any) {
      const apiError = err as ApiError | undefined;
      const code = isApiErrorCode(apiError?.code)
        ? apiError.code
        : "UNKOWN_ERROR";

      setLoginError(code);
      throw err; // re-throw so callers can react (e.g. block game start)
    } finally {
      setConnectionIsLoading(false);
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────

  // Tab close cleanup (fire-and-forget)
  useEffect(() => {
    const handlePageHide = () => {
      const current = connectionRef.current;
      if (!current) return;

      setGameState("enterNameAfterLogout");
      const url = `/connection/${encodeURIComponent(current.username)}/${current.token}`;
      navigator.sendBeacon(url);
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  // Manual logout
  const logout = useCallback(async () => {
    const current = connectionRef.current;
    if (!current) return;

    setGameState("enterNameAfterLogout");
    gameScoreRef.current = 0;
    setConnectionState(null);

    console.log("is logint out");
    try {
      await apiClient.delete(
        `/connection/${encodeURIComponent(current.username)}/${current.token}`,
      );
    } catch {
      // Logout failures are non-fatal, the server will expire the connection via
      // heartbeat timeout anyway.
    }
  }, []);

  return {
    state,
    isLoading,
    loginError,
    login,
    logout,
  };
}
