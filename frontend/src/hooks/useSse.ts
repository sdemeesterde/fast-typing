import { useEffect, useRef } from "react";
import type { UseConnectionReturn } from "./useConnection";
import { API_BASE } from "../types/api";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export type SseHandlerMap = Record<string, (data: unknown) => void>;

interface UseSseOptions {
  connection: UseConnectionReturn;
  path: string;
  handlers: SseHandlerMap;
  enabled?: boolean;
}

export function useSse({
  connection,
  path,
  handlers,
  enabled = true,
}: UseSseOptions): void {
  // Handler does not change over time, so no need for useeffect.
  const handlersRef = useRef(handlers);

  // Destructure so the effect dep array tracks the two scalar values,
  // not the connection object reference (which may change every render).
  const { username, token } = connection.state ?? {};

  useEffect(() => {
    if (!enabled) return;
    // Don't open the stream until we actually have credentials.
    if (!username || !token) return;

    let es: EventSource | null = null;
    let backoff = INITIAL_BACKOFF_MS;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      if (es) {
        es.close();
        es = null;
      }
      // EventSource only supports GET with no body/headers — credentials go
      // in the query string. The server reads them via web::Query<AuthBody>.
      const params = new URLSearchParams({ username, token });
      es = new EventSource(`${API_BASE}${path}?${params}`);

      const attachedNames = Object.keys(handlersRef.current);

      const makeHandler = (eventName: string) => (event: MessageEvent) => {
        const handler = handlersRef.current[eventName];
        if (!handler) return;
        try {
          handler(JSON.parse(event.data));
          backoff = INITIAL_BACKOFF_MS;
        } catch {
          console.warn(
            `[useSse] Failed to parse "${eventName}" on "${path}":`,
            event.data,
          );
        }
      };

      const attached: Array<[string, (e: MessageEvent) => void]> =
        attachedNames.map((name) => [name, makeHandler(name)]);

      for (const [name, fn] of attached) {
        es.addEventListener(name, fn);
      }

      es.onerror = () => {
        for (const [name, fn] of attached) {
          es?.removeEventListener(name, fn);
        }
        es?.close();
        es = null;
        if (cancelled) return;
        reconnectTimer = setTimeout(() => {
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
          connect();
        }, backoff);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      es?.close();
    };
    // Reconnect if credentials rotate (e.g. session refresh) or path changes.
  }, [path, enabled, username, token]);
}
