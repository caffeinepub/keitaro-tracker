import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Map "mo:core/Map";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Runtime "mo:core/Runtime";
import Validation "validation";

actor {
  // Initialize the access control state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = { name : Text };

  public type CostModel = {
    #cpc;
    #cpm;
    #cpa;
  };

  public type ParameterType = {
    #text;
    #currency;
    #integer;
    #float;
    #percentage;
    #boolean;
  };

  public type Parameter = {
    name : Text;
    type_ : ParameterType;
    description : Text;
    required : Bool;
  };

  public type TrafficSource = {
    id : Text;
    name : Text;
    postbackUrl : Text;
    costModel : CostModel;
    parameters : [Parameter];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type OfferStatus = {
    #active;
    #paused;
  };

  public type Offer = {
    id : Text;
    name : Text;
    url : Text;
    payout : Nat;
    currency : Text;
    status : OfferStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type CampaignStatus = {
    #active;
    #paused;
    #archived;
  };

  public type OfferWeight = {
    offerId : Text;
    weight : Nat;
  };

  public type Campaign = {
    id : Text;
    name : Text;
    trafficSourceId : Text;
    offerIds : [OfferWeight];
    status : CampaignStatus;
    trackingDomain : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type Condition = {
    field : Text;
    operator : Text;
    value : Text;
  };

  public type RoutingRule = {
    conditions : [Condition];
    targetOffers : [OfferWeight];
  };

  public type Flow = {
    id : Text;
    name : Text;
    campaignId : Text;
    rules : [RoutingRule];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type ClickEvent = {
    id : Text;
    campaignId : Text;
    ipAddress : Text;
    country : Text;
    city : Text;
    os : Text;
    browser : Text;
    deviceType : Text;
    referrerUrl : Text;
    landingPageUrl : Text;
    timestamp : Time.Time;
    uniqueClickId : Text;
  };

  public type ConversionStatus = {
    #approved;
    #pending;
    #declined;
  };

  public type ConversionEvent = {
    id : Text;
    clickId : Text;
    campaignId : Text;
    offerId : Text;
    payout : Float;
    revenue : Nat;
    timestamp : Time.Time;
    status : ConversionStatus;
  };

  public type CampaignStats = {
    campaignId : Text;
    clicks : Nat;
    uniqueClicks : Nat;
    conversions : Nat;
    conversionRate : Nat;
    revenue : Nat;
    cost : Nat;
    roi : Nat;
    epc : Nat;
  };

  public type DomainType = { #campaign; #postback; #admin };
  public type DomainStatus = { #active; #inactive };

  public type Domain = {
    id : Text;
    name : Text;
    domainType : DomainType;
    status : DomainStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  var idCounter = 0;
  func generateId(prefix : Text) : Text {
    let id = prefix # idCounter.toText();
    idCounter += 1;
    id;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let trafficSources = Map.empty<Text, TrafficSource>();
  let offers = Map.empty<Text, Offer>();
  let campaigns = Map.empty<Text, Campaign>();
  let flows = Map.empty<Text, Flow>();
  let domains = Map.empty<Text, Domain>();
  var clicksArray = List.empty<ClickEvent>();
  var conversionsArray = List.empty<ConversionEvent>();

  // Initialize data if empty - Admin only
  public shared ({ caller }) func initialize() : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can call initialize");
    };

    if (domains.size() == 0) {
      let initialCampaignDomain : Domain = {
        id = "domain_0";
        name = "campaign.tracking.com";
        domainType = #campaign;
        status = #active;
        createdAt = Time.now();
        updatedAt = Time.now();
      };

      domains.add("domain_0", initialCampaignDomain);

      let initialPostbackDomain : Domain = {
        id = "domain_1";
        name = "postback.tracking.com";
        domainType = #postback;
        status = #active;
        createdAt = Time.now();
        updatedAt = Time.now();
      };

      domains.add("domain_1", initialPostbackDomain);

      let initialAdminDomain : Domain = {
        id = "domain_2";
        name = "admin.tracking.com";
        domainType = #admin;
        status = #active;
        createdAt = Time.now();
        updatedAt = Time.now();
      };

      domains.add("domain_2", initialAdminDomain);
    };
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Traffic Sources - Admin write, User read
  public shared ({ caller }) func createTrafficSource(name : Text, postbackUrl : Text, costModel : CostModel, parameters : [Parameter]) : async TrafficSource {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create traffic sources");
    };

    if (not Validation.isValidTrafficSourceInput(name, postbackUrl)) {
      Runtime.trap("Invalid traffic source input");
    };

    let id = generateId("traf_");
    let trafficSource : TrafficSource = {
      id;
      name;
      postbackUrl;
      costModel;
      parameters;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    trafficSources.add(id, trafficSource);
    trafficSource;
  };

  public shared ({ caller }) func updateTrafficSource(id : Text, name : Text, postbackUrl : Text, costModel : CostModel, parameters : [Parameter]) : async TrafficSource {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update traffic sources");
    };

    if (not Validation.isValidTrafficSourceInput(name, postbackUrl)) {
      Runtime.trap("Invalid traffic source input");
    };

    switch (trafficSources.get(id)) {
      case (null) { Runtime.trap("Traffic source not found") };
      case (?existing) {
        let updated : TrafficSource = {
          id;
          name;
          postbackUrl;
          costModel;
          parameters;
          createdAt = existing.createdAt;
          updatedAt = Time.now();
        };
        trafficSources.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteTrafficSource(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete traffic sources");
    };

    switch (trafficSources.get(id)) {
      case (null) { Runtime.trap("Traffic source not found") };
      case (?_) { trafficSources.remove(id) };
    };
  };

  public query ({ caller }) func getTrafficSource(id : Text) : async TrafficSource {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view traffic sources");
    };

    switch (trafficSources.get(id)) {
      case (null) { Runtime.trap("Traffic source not found") };
      case (?trafficSource) { trafficSource };
    };
  };

  public query ({ caller }) func getAllTrafficSources() : async [TrafficSource] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view traffic sources");
    };

    trafficSources.values().toArray();
  };

  // Offers - Admin write, User read
  public shared ({ caller }) func createOffer(name : Text, url : Text, payout : Nat, currency : Text, status : OfferStatus) : async Offer {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create offers");
    };

    let id = generateId("offer_");
    let offer : Offer = {
      id;
      name;
      url;
      payout;
      currency;
      status;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    offers.add(id, offer);
    offer;
  };

  public shared ({ caller }) func updateOffer(id : Text, name : Text, url : Text, payout : Nat, currency : Text, status : OfferStatus) : async Offer {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update offers");
    };

    switch (offers.get(id)) {
      case (null) { Runtime.trap("Offer not found") };
      case (?existing) {
        let updated : Offer = {
          id;
          name;
          url;
          payout;
          currency;
          status;
          createdAt = existing.createdAt;
          updatedAt = Time.now();
        };

        offers.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteOffer(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete offers");
    };

    switch (offers.get(id)) {
      case (null) { Runtime.trap("Offer not found") };
      case (?_) { offers.remove(id) };
    };
  };

  public query ({ caller }) func getOffer(id : Text) : async Offer {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view offers");
    };

    switch (offers.get(id)) {
      case (null) { Runtime.trap("Offer not found") };
      case (?offer) { offer };
    };
  };

  public query ({ caller }) func getAllOffers() : async [Offer] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view offers");
    };

    offers.values().toArray();
  };

  // Campaigns - Admin write, User read
  public shared ({ caller }) func createCampaign(name : Text, trafficSourceId : Text, offerIds : [OfferWeight], status : CampaignStatus, trackingDomain : Text) : async Campaign {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create campaigns");
    };

    let id = generateId("camp_");
    let campaign : Campaign = {
      id;
      name;
      trafficSourceId;
      offerIds;
      status;
      trackingDomain;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    campaigns.add(id, campaign);
    campaign;
  };

  public shared ({ caller }) func updateCampaign(id : Text, name : Text, trafficSourceId : Text, offerIds : [OfferWeight], status : CampaignStatus, trackingDomain : Text) : async Campaign {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update campaigns");
    };

    switch (campaigns.get(id)) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?existing) {
        let updated : Campaign = {
          id;
          name;
          trafficSourceId;
          offerIds;
          status;
          trackingDomain;
          createdAt = existing.createdAt;
          updatedAt = Time.now();
        };

        campaigns.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteCampaign(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete campaigns");
    };

    switch (campaigns.get(id)) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?_) { campaigns.remove(id) };
    };
  };

  public query ({ caller }) func getCampaign(id : Text) : async Campaign {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view campaigns");
    };

    switch (campaigns.get(id)) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?campaign) { campaign };
    };
  };

  public query ({ caller }) func getAllCampaigns() : async [Campaign] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view campaigns");
    };

    campaigns.values().toArray();
  };

  // Flows - Admin write, User read
  public shared ({ caller }) func createFlow(name : Text, campaignId : Text, rules : [RoutingRule]) : async Flow {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create flows");
    };

    let id = generateId("flow_");
    let flow : Flow = {
      id;
      name;
      campaignId;
      rules;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    flows.add(id, flow);
    flow;
  };

  public shared ({ caller }) func updateFlow(id : Text, name : Text, campaignId : Text, rules : [RoutingRule]) : async Flow {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update flows");
    };

    switch (flows.get(id)) {
      case (null) { Runtime.trap("Flow not found") };
      case (?existing) {
        let updated : Flow = {
          id;
          name;
          campaignId;
          rules;
          createdAt = existing.createdAt;
          updatedAt = Time.now();
        };

        flows.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteFlow(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete flows");
    };

    switch (flows.get(id)) {
      case (null) { Runtime.trap("Flow not found") };
      case (?_) { flows.remove(id) };
    };
  };

  public query ({ caller }) func getFlow(id : Text) : async Flow {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view flows");
    };

    switch (flows.get(id)) {
      case (null) { Runtime.trap("Flow not found") };
      case (?flow) { flow };
    };
  };

  public query ({ caller }) func getAllFlows() : async [Flow] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view flows");
    };

    flows.values().toArray();
  };

  // Click Tracking - Public (no auth required, called by external tracking systems)
  public shared func recordClick(campaignId : Text, ipAddress : Text, country : Text, city : Text, os : Text, browser : Text, deviceType : Text, referrerUrl : Text, landingPageUrl : Text) : async ClickEvent {
    let id = generateId("click_");
    let click : ClickEvent = {
      id;
      campaignId;
      ipAddress;
      country;
      city;
      os;
      browser;
      deviceType;
      referrerUrl;
      landingPageUrl;
      timestamp = Time.now();
      uniqueClickId = id;
    };

    clicksArray.add(click);
    click;
  };

  // Conversion Tracking - Public (no auth required, called by external tracking systems)
  public shared func recordConversion(clickId : Text, campaignId : Text, offerId : Text, payout : Float, revenue : Nat, status : ConversionStatus) : async ConversionEvent {
    let id = generateId("conv_");
    let conversion : ConversionEvent = {
      id;
      clickId;
      campaignId;
      offerId;
      payout;
      revenue;
      timestamp = Time.now();
      status;
    };

    conversionsArray.add(conversion);
    conversion;
  };

  // Statistics - User level access required
  public query ({ caller }) func getCampaignStats() : async [CampaignStats] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view statistics");
    };

    [];
  };

  // Reports - User level access required
  public query ({ caller }) func getClicksLog(page : Nat, pageSize : Nat) : async [ClickEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view click logs");
    };

    let clicksArr = clicksArray.toArray();
    let start = page * pageSize;
    if (start >= clicksArr.size()) {
      return [];
    };

    let end = if (start + pageSize >= clicksArr.size()) {
      clicksArr.size();
    } else {
      start + pageSize;
    };
    Array.tabulate<ClickEvent>(
      end - start,
      func(i) { clicksArr[start + i] }
    );
  };

  public query ({ caller }) func getConversionsLog(page : Nat, pageSize : Nat) : async [ConversionEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view conversion logs");
    };

    let conversionsArr = conversionsArray.toArray();
    let start = page * pageSize;
    if (start >= conversionsArr.size()) {
      return [];
    };

    let end = if (start + pageSize >= conversionsArr.size()) {
      conversionsArr.size();
    } else {
      start + pageSize;
    };
    Array.tabulate<ConversionEvent>(
      end - start,
      func(i) { conversionsArr[start + i] }
    );
  };

  // Domain Management - Admin write, User read
  public shared ({ caller }) func createDomain(name : Text, domainType : DomainType, status : DomainStatus) : async Domain {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can create domains");
    };

    if (not Validation.isValidDomainInput(name)) {
      Runtime.trap("Invalid domain input");
    };

    let id = generateId("domain_");
    let domain : Domain = {
      id;
      name;
      domainType;
      status;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    domains.add(id, domain);
    domain;
  };

  public shared ({ caller }) func updateDomain(id : Text, name : Text, domainType : DomainType, status : DomainStatus) : async Domain {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can update domains");
    };

    if (not Validation.isValidDomainInput(name)) {
      Runtime.trap("Invalid domain input");
    };

    switch (domains.get(id)) {
      case (null) { Runtime.trap("Domain not found") };
      case (?existing) {
        let updated : Domain = {
          id;
          name;
          domainType;
          status;
          createdAt = existing.createdAt;
          updatedAt = Time.now();
        };

        domains.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteDomain(id : Text) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can delete domains");
    };

    switch (domains.get(id)) {
      case (null) { Runtime.trap("Domain not found") };
      case (?_) { domains.remove(id) };
    };
  };

  public query ({ caller }) func getDomain(id : Text) : async Domain {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view domains");
    };

    switch (domains.get(id)) {
      case (null) { Runtime.trap("Domain not found") };
      case (?domain) { domain };
    };
  };

  public query ({ caller }) func getAllDomains() : async [Domain] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view domains");
    };

    domains.values().toArray();
  };

  public query ({ caller }) func getAllDomainsByType(domainType : DomainType) : async [Domain] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view domains");
    };

    let allDomains = domains.values().toArray();
    allDomains.filter(func(domain) { domain.domainType == domainType });
  };
};
