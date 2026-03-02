import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TrafficSource {
    id: string;
    costModel: CostModel;
    name: string;
    createdAt: Time;
    parameters: Array<Parameter>;
    postbackUrl: string;
    updatedAt: Time;
}
export type Time = bigint;
export interface Condition {
    field: string;
    value: string;
    operator: string;
}
export interface Flow {
    id: string;
    name: string;
    createdAt: Time;
    campaignId: string;
    updatedAt: Time;
    rules: Array<RoutingRule>;
}
export interface Domain {
    id: string;
    status: DomainStatus;
    domainType: DomainType;
    name: string;
    createdAt: Time;
    updatedAt: Time;
}
export interface Parameter {
    name: string;
    type: ParameterType;
    description: string;
    required: boolean;
}
export interface OfferWeight {
    weight: bigint;
    offerId: string;
}
export interface Offer {
    id: string;
    url: string;
    status: OfferStatus;
    name: string;
    createdAt: Time;
    updatedAt: Time;
    currency: string;
    payout: bigint;
}
export interface ConversionEvent {
    id: string;
    status: ConversionStatus;
    revenue: bigint;
    campaignId: string;
    timestamp: Time;
    offerId: string;
    payout: number;
    clickId: string;
}
export interface RoutingRule {
    targetOffers: Array<OfferWeight>;
    conditions: Array<Condition>;
}
export interface CampaignStats {
    epc: bigint;
    roi: bigint;
    clicks: bigint;
    revenue: bigint;
    uniqueClicks: bigint;
    cost: bigint;
    campaignId: string;
    conversionRate: bigint;
    conversions: bigint;
}
export interface Campaign {
    id: string;
    status: CampaignStatus;
    name: string;
    createdAt: Time;
    updatedAt: Time;
    offerIds: Array<OfferWeight>;
    trackingDomain: string;
    trafficSourceId: string;
}
export interface UserProfile {
    name: string;
}
export interface ClickEvent {
    id: string;
    os: string;
    landingPageUrl: string;
    country: string;
    city: string;
    campaignId: string;
    referrerUrl: string;
    uniqueClickId: string;
    timestamp: Time;
    deviceType: string;
    browser: string;
    ipAddress: string;
}
export enum CampaignStatus {
    active = "active",
    archived = "archived",
    paused = "paused"
}
export enum ConversionStatus {
    pending = "pending",
    approved = "approved",
    declined = "declined"
}
export enum CostModel {
    cpa = "cpa",
    cpc = "cpc",
    cpm = "cpm"
}
export enum DomainStatus {
    active = "active",
    inactive = "inactive"
}
export enum DomainType {
    postback = "postback",
    admin = "admin",
    campaign = "campaign"
}
export enum OfferStatus {
    active = "active",
    paused = "paused"
}
export enum ParameterType {
    float_ = "float",
    integer = "integer",
    text = "text",
    boolean_ = "boolean",
    currency = "currency",
    percentage = "percentage"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCampaign(name: string, trafficSourceId: string, offerIds: Array<OfferWeight>, status: CampaignStatus, trackingDomain: string): Promise<Campaign>;
    createDomain(name: string, domainType: DomainType, status: DomainStatus): Promise<Domain>;
    createFlow(name: string, campaignId: string, rules: Array<RoutingRule>): Promise<Flow>;
    createOffer(name: string, url: string, payout: bigint, currency: string, status: OfferStatus): Promise<Offer>;
    createTrafficSource(name: string, postbackUrl: string, costModel: CostModel, parameters: Array<Parameter>): Promise<TrafficSource>;
    deleteCampaign(id: string): Promise<void>;
    deleteDomain(id: string): Promise<void>;
    deleteFlow(id: string): Promise<void>;
    deleteOffer(id: string): Promise<void>;
    deleteTrafficSource(id: string): Promise<void>;
    getAllCampaigns(): Promise<Array<Campaign>>;
    getAllDomains(): Promise<Array<Domain>>;
    getAllDomainsByType(domainType: DomainType): Promise<Array<Domain>>;
    getAllFlows(): Promise<Array<Flow>>;
    getAllOffers(): Promise<Array<Offer>>;
    getAllTrafficSources(): Promise<Array<TrafficSource>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCampaign(id: string): Promise<Campaign>;
    getCampaignStats(): Promise<Array<CampaignStats>>;
    getClicksLog(page: bigint, pageSize: bigint): Promise<Array<ClickEvent>>;
    getConversionsLog(page: bigint, pageSize: bigint): Promise<Array<ConversionEvent>>;
    getDomain(id: string): Promise<Domain>;
    getFlow(id: string): Promise<Flow>;
    getOffer(id: string): Promise<Offer>;
    getTrafficSource(id: string): Promise<TrafficSource>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initialize(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    recordClick(campaignId: string, ipAddress: string, country: string, city: string, os: string, browser: string, deviceType: string, referrerUrl: string, landingPageUrl: string): Promise<ClickEvent>;
    recordConversion(clickId: string, campaignId: string, offerId: string, payout: number, revenue: bigint, status: ConversionStatus): Promise<ConversionEvent>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCampaign(id: string, name: string, trafficSourceId: string, offerIds: Array<OfferWeight>, status: CampaignStatus, trackingDomain: string): Promise<Campaign>;
    updateDomain(id: string, name: string, domainType: DomainType, status: DomainStatus): Promise<Domain>;
    updateFlow(id: string, name: string, campaignId: string, rules: Array<RoutingRule>): Promise<Flow>;
    updateOffer(id: string, name: string, url: string, payout: bigint, currency: string, status: OfferStatus): Promise<Offer>;
    updateTrafficSource(id: string, name: string, postbackUrl: string, costModel: CostModel, parameters: Array<Parameter>): Promise<TrafficSource>;
}
