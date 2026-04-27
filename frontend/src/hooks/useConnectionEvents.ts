import { useMemo, useState } from "react";
import { useSse } from "./useSse";
import type { ConnectionsUpdate } from "../types/api";
import type { UseConnectionReturn } from "./useConnection";

export function useConnectionEvents(connection: UseConnectionReturn): number {
  const [count, setCount] = useState<number>(1);

  const handlers = useMemo(
    () => ({
      connections: (data: unknown) => {
        setCount(data as ConnectionsUpdate);
      },
    }),
    [],
  );
  useSse({
    connection,
    path: "/events/connections",
    handlers,
  });

  return count;
}
