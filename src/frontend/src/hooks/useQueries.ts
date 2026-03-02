import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Campaign,
  CampaignStats,
  CampaignStatus,
  ClickEvent,
  ConversionEvent,
  ConversionStatus,
  CostModel,
  Domain,
  DomainStatus,
  DomainType,
  Flow,
  Offer,
  OfferStatus,
  Parameter,
  RoutingRule,
  Stream,
  TrafficSource,
  UserProfile,
} from "../backend.d";
import { getCurrentActor, logActivity } from "../utils/activityLog";
import { useAdminActor as useActor } from "./useAdminActor";

// StreamState enum (not exported from backend.d.ts but used in Stream)
export enum StreamState {
  active = "active",
  paused = "paused",
}

// ── User Profile ──────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerUserProfile();
      } catch {
        // Silently ignore auth errors (e.g. anonymous users)
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export function useGetAllCampaigns() {
  const { actor, isFetching } = useActor();
  return useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCampaigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      trafficSourceId: string;
      status: CampaignStatus;
      trackingDomain: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createCampaign(
        args.name,
        args.trafficSourceId,
        args.status,
        args.trackingDomain,
      );
    },
    onSuccess: (campaign) => {
      logActivity(
        getCurrentActor(),
        "Created",
        "Campaign",
        campaign.id,
        campaign.name,
      );
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignStats"] });
    },
  });
}

export function useUpdateCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      name: string;
      trafficSourceId: string;
      status: CampaignStatus;
      trackingDomain: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateCampaign(
        args.id,
        args.name,
        args.trafficSourceId,
        args.status,
        args.trackingDomain,
      );
    },
    onSuccess: (campaign) => {
      logActivity(
        getCurrentActor(),
        "Updated",
        "Campaign",
        campaign.id,
        campaign.name,
      );
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignStats"] });
    },
  });
}

export function useDeleteCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteCampaign(args.id);
    },
    onSuccess: (_, args) => {
      logActivity(getCurrentActor(), "Deleted", "Campaign", args.id, args.name);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaignStats"] });
    },
  });
}

// ── Offers ────────────────────────────────────────────────────────────────────

export function useGetAllOffers() {
  const { actor, isFetching } = useActor();
  return useQuery<Offer[]>({
    queryKey: ["offers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOffers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateOffer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      url: string;
      payout: bigint;
      currency: string;
      status: OfferStatus;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createOffer(
        args.name,
        args.url,
        args.payout,
        args.currency,
        args.status,
      );
    },
    onSuccess: (offer) => {
      logActivity(getCurrentActor(), "Created", "Offer", offer.id, offer.name);
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
  });
}

export function useUpdateOffer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      name: string;
      url: string;
      payout: bigint;
      currency: string;
      status: OfferStatus;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateOffer(
        args.id,
        args.name,
        args.url,
        args.payout,
        args.currency,
        args.status,
      );
    },
    onSuccess: (offer) => {
      logActivity(getCurrentActor(), "Updated", "Offer", offer.id, offer.name);
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
  });
}

export function useDeleteOffer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteOffer(args.id);
    },
    onSuccess: (_, args) => {
      logActivity(getCurrentActor(), "Deleted", "Offer", args.id, args.name);
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
  });
}

// ── Traffic Sources ───────────────────────────────────────────────────────────

export function useGetAllTrafficSources() {
  const { actor, isFetching } = useActor();
  return useQuery<TrafficSource[]>({
    queryKey: ["trafficSources"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTrafficSources();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTrafficSource() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      postbackUrl: string;
      costModel: CostModel;
      parameters: Parameter[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTrafficSource(
        args.name,
        args.postbackUrl,
        args.costModel,
        args.parameters,
      );
    },
    onSuccess: (ts) => {
      logActivity(
        getCurrentActor(),
        "Created",
        "Traffic Source",
        ts.id,
        ts.name,
      );
      queryClient.invalidateQueries({ queryKey: ["trafficSources"] });
    },
  });
}

export function useUpdateTrafficSource() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      name: string;
      postbackUrl: string;
      costModel: CostModel;
      parameters: Parameter[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateTrafficSource(
        args.id,
        args.name,
        args.postbackUrl,
        args.costModel,
        args.parameters,
      );
    },
    onSuccess: (ts) => {
      logActivity(
        getCurrentActor(),
        "Updated",
        "Traffic Source",
        ts.id,
        ts.name,
      );
      queryClient.invalidateQueries({ queryKey: ["trafficSources"] });
    },
  });
}

export function useDeleteTrafficSource() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTrafficSource(args.id);
    },
    onSuccess: (_, args) => {
      logActivity(
        getCurrentActor(),
        "Deleted",
        "Traffic Source",
        args.id,
        args.name,
      );
      queryClient.invalidateQueries({ queryKey: ["trafficSources"] });
    },
  });
}

// ── Flows ─────────────────────────────────────────────────────────────────────

export function useGetAllFlows() {
  const { actor, isFetching } = useActor();
  return useQuery<Flow[]>({
    queryKey: ["flows"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllFlows();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateFlow() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      campaignId: string;
      rules: RoutingRule[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createFlow(args.name, args.campaignId, args.rules);
    },
    onSuccess: (flow) => {
      logActivity(getCurrentActor(), "Created", "Flow", flow.id, flow.name);
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useUpdateFlow() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      name: string;
      campaignId: string;
      rules: RoutingRule[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateFlow(args.id, args.name, args.campaignId, args.rules);
    },
    onSuccess: (flow) => {
      logActivity(getCurrentActor(), "Updated", "Flow", flow.id, flow.name);
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

export function useDeleteFlow() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteFlow(args.id);
    },
    onSuccess: (_, args) => {
      logActivity(getCurrentActor(), "Deleted", "Flow", args.id, args.name);
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });
}

// ── Domains ───────────────────────────────────────────────────────────────────

export function useGetAllDomains() {
  const { actor, isFetching } = useActor();
  return useQuery<Domain[]>({
    queryKey: ["domains"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDomains();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateDomain() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      domainType: DomainType;
      status: DomainStatus;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createDomain(args.name, args.domainType, args.status);
    },
    onSuccess: (domain) => {
      logActivity(
        getCurrentActor(),
        "Created",
        "Domain",
        domain.id,
        domain.name,
      );
      queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });
}

export function useUpdateDomain() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      name: string;
      domainType: DomainType;
      status: DomainStatus;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateDomain(
        args.id,
        args.name,
        args.domainType,
        args.status,
      );
    },
    onSuccess: (domain) => {
      logActivity(
        getCurrentActor(),
        "Updated",
        "Domain",
        domain.id,
        domain.name,
      );
      queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });
}

export function useDeleteDomain() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteDomain(args.id);
    },
    onSuccess: (_, args) => {
      logActivity(getCurrentActor(), "Deleted", "Domain", args.id, args.name);
      queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });
}

// ── Stats & Logs ──────────────────────────────────────────────────────────────

export function useGetCampaignStats() {
  const { actor, isFetching } = useActor();
  return useQuery<CampaignStats[]>({
    queryKey: ["campaignStats"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCampaignStats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetClicksLog(page: number, pageSize: number) {
  const { actor, isFetching } = useActor();
  return useQuery<ClickEvent[]>({
    queryKey: ["clicksLog", page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getClicksLog(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetConversionsLog(page: number, pageSize: number) {
  const { actor, isFetching } = useActor();
  return useQuery<ConversionEvent[]>({
    queryKey: ["conversionsLog", page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getConversionsLog(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !isFetching,
  });
}

// ── Streams ───────────────────────────────────────────────────────────────────

export function useGetStreamsByCampaign(campaignId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Stream[]>({
    queryKey: ["streams", campaignId],
    queryFn: async () => {
      if (!actor || !campaignId) return [];
      return actor.getStreamsByCampaign(campaignId);
    },
    enabled: !!actor && !isFetching && !!campaignId,
  });
}

export function useCreateStream() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      name: string;
      campaignId: string;
      offerId: string;
      weight: bigint;
      state: StreamState;
      position: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createStream(
        args.name,
        args.campaignId,
        args.offerId,
        args.weight,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args.state as any,
        args.position,
      );
    },
    onSuccess: (stream) => {
      logActivity(
        getCurrentActor(),
        "Created",
        "Stream",
        stream.id,
        stream.name,
      );
      queryClient.invalidateQueries({
        queryKey: ["streams", stream.campaignId],
      });
    },
  });
}

export function useUpdateStream() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      campaignId: string;
      name: string;
      offerId: string;
      weight: bigint;
      state: StreamState;
      position: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateStream(
        args.id,
        args.name,
        args.offerId,
        args.weight,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args.state as any,
        args.position,
      );
    },
    onSuccess: (stream) => {
      logActivity(
        getCurrentActor(),
        "Updated",
        "Stream",
        stream.id,
        stream.name,
      );
      queryClient.invalidateQueries({
        queryKey: ["streams", stream.campaignId],
      });
    },
  });
}

export function useDeleteStream() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      campaignId: string;
      name: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteStream(args.id);
    },
    onSuccess: (_, args) => {
      logActivity(getCurrentActor(), "Deleted", "Stream", args.id, args.name);
      queryClient.invalidateQueries({ queryKey: ["streams", args.campaignId] });
    },
  });
}

export function useProcessClick() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (args: {
      campaignKey: string;
      ipAddress: string;
      referrerUrl: string;
      landingPageUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.processClick(
        args.campaignKey,
        args.ipAddress,
        args.referrerUrl,
        args.landingPageUrl,
      );
    },
  });
}
