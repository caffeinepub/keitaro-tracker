/**
 * Wrapper around useActor that ensures _initializeAccessControlWithSecret
 * is called for ALL actors (both anonymous and authenticated), so that
 * write operations work without requiring login.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
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
      const adminToken = getSecretParameter("caffeineAdminToken") || "";

      if (!identity) {
        // Anonymous actor — still initialize with admin token so writes work
        const actor = await createActorWithConfig();
        await actor._initializeAccessControlWithSecret(adminToken);
        return actor;
      }

      // Authenticated actor — initialize with admin token as well
      const actor = await createActorWithConfig({
        agentOptions: { identity },
      });
      await actor._initializeAccessControlWithSecret(adminToken);
      return actor;
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
