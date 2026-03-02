/**
 * Wrapper around useActor that creates an actor for all users (authenticated or anonymous).
 * All backend operations are open — no auth checks needed.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { useInternetIdentity } from "./useInternetIdentity";

const ADMIN_ACTOR_QUERY_KEY = "adminActor";

export function useAdminActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const initialized = useRef(false);

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ADMIN_ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      initialized.current = false;
      if (!identity) {
        return createActorWithConfig();
      }
      return createActorWithConfig({
        agentOptions: { identity },
      });
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  useEffect(() => {
    if (actorQuery.data && !initialized.current) {
      initialized.current = true;
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ADMIN_ACTOR_QUERY_KEY),
      });
      queryClient.refetchQueries({
        predicate: (query) => !query.queryKey.includes(ADMIN_ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
