import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";

import Validation "validation";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  /***************  Types ***************/
  public type UserProfile = { name : Text };
  public type CostModel = { #cpc; #cpm; #cpa };
  public type ParameterType = { #text; #currency; #integer; #float; #percentage; #boolean };
  public type Parameter = { name : Text; type_ : ParameterType; description : Text; required : Bool };
  public type TrafficSource = { id : Text; name : Text; postbackUrl : Text; costModel : CostModel; parameters : [Parameter]; createdAt : Time.Time; updatedAt : Time.Time };
  public type OfferStatus = { #active; #paused };
  public type Offer = { id : Text; name : Text; url : Text; payout : Nat; currency : Text; status : OfferStatus; createdAt : Time.Time; updatedAt : Time.Time };
  public type CampaignStatus = { #active; #paused; #archived };
  public type OfferWeight = { offerId : Text; weight : Nat };
  public type Campaign = { id : Text; name : Text; trafficSourceId : Text; status : CampaignStatus; trackingDomain : Text; campaignKey : Text; createdAt : Time.Time; updatedAt : Time.Time };
  public type Condition = { field : Text; operator : Text; value : Text };
  public type RoutingRule = { conditions : [Condition]; targetOffers : [OfferWeight] };
  public type Flow = { id : Text; name : Text; campaignId : Text; rules : [RoutingRule]; createdAt : Time.Time; updatedAt : Time.Time };
  public type StreamState = { #active; #paused };
  public type Stream = { id : Text; name : Text; campaignId : Text; offerId : Text; weight : Nat; state : StreamState; position : Nat; createdAt : Time.Time; updatedAt : Time.Time };
  public type ClickEvent = { id : Text; campaignId : Text; ipAddress : Text; country : Text; city : Text; os : Text; browser : Text; deviceType : Text; referrerUrl : Text; landingPageUrl : Text; timestamp : Time.Time; uniqueClickId : Text };
  public type ConversionStatus = { #approved; #pending; #declined };
  public type ConversionEvent = { id : Text; clickId : Text; campaignId : Text; offerId : Text; payout : Float; revenue : Nat; timestamp : Time.Time; status : ConversionStatus };
  public type CampaignStats = { campaignId : Text; clicks : Nat; uniqueClicks : Nat; conversions : Nat; conversionRate : Nat; revenue : Nat; cost : Nat; roi : Nat; epc : Nat };
  public type DomainType = { #campaign; #postback; #admin };
  public type DomainStatus = { #active; #inactive };
  public type Domain = { id : Text; name : Text; domainType : DomainType; status : DomainStatus; createdAt : Time.Time; updatedAt : Time.Time };
  public type UserRole = { #admin; #user; #guest };
  public type ProcessClickResult = { clickId : Text; offerUrl : Text; campaignId : Text };

  /***************  Helper Types ***************/
  type TrafficSourceKey = Text;
  type OfferKey = Text;
  type CampaignKey = Text;
  type FlowKey = Text;
  type DomainKey = Text;
  type StreamKey = Text;

  /***************  ID Management ***************/
  var idCounter = 0;
  func generateId(prefix : Text) : Text {
    let id = prefix # idCounter.toText();
    idCounter += 1;
    id;
  };

  /***************  Storage ***************/
  let userProfiles = Map.empty<Principal, UserProfile>();
  let trafficSources = Map.empty<TrafficSourceKey, TrafficSource>();
  let offers = Map.empty<OfferKey, Offer>();
  let campaigns = Map.empty<CampaignKey, Campaign>();
  let flows = Map.empty<FlowKey, Flow>();
  let domains = Map.empty<DomainKey, Domain>();
  let streams = Map.empty<StreamKey, Stream>();
  var clicksArray = List.empty<ClickEvent>();
  var conversionsArray = List.empty<ConversionEvent>();
  var processClickRandomValue : Nat = 0;

  /***************  Initialization ***************/
  public shared ({ caller }) func initialize() : async () {
    if (domains.size() == 0) {
      domains.add("domain_0", { id = "domain_0"; name = "campaign.tracking.com"; domainType = #campaign; status = #active; createdAt = Time.now(); updatedAt = Time.now() });
      domains.add("domain_1", { id = "domain_1"; name = "postback.tracking.com"; domainType = #postback; status = #active; createdAt = Time.now(); updatedAt = Time.now() });
      domains.add("domain_2", { id = "domain_2"; name = "admin.tracking.com"; domainType = #admin; status = #active; createdAt = Time.now(); updatedAt = Time.now() });
    };
  };

  public shared ({ caller }) func setProcessClickRandomValue(value : Nat) : async () {
    processClickRandomValue := value;
  };

  /***************  User Profiles ***************/
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // Any authenticated user (including guests) can view their own profile
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Users can only view their own profile, admins can view any profile
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    // Only authenticated users (not guests) can save profiles
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  /***************  Traffic Sources ***************/
  public shared ({ caller }) func createTrafficSource(name : Text, postbackUrl : Text, costModel : CostModel, parameters : [Parameter]) : async TrafficSource {
    Validation.isValidTrafficSourceInput(name, postbackUrl);
    let id = generateId("traf_");
    let ts : TrafficSource = { id; name; postbackUrl; costModel; parameters; createdAt = Time.now(); updatedAt = Time.now() };
    trafficSources.add(id, ts);
    ts;
  };

  public shared ({ caller }) func updateTrafficSource(id : Text, name : Text, postbackUrl : Text, costModel : CostModel, parameters : [Parameter]) : async TrafficSource {
    Validation.isValidTrafficSourceInput(name, postbackUrl);
    switch (trafficSources.get(id)) {
      case (null) { Runtime.trap("Traffic source not found") };
      case (?existing) {
        let updated : TrafficSource = { id; name; postbackUrl; costModel; parameters; createdAt = existing.createdAt; updatedAt = Time.now() };
        trafficSources.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteTrafficSource(id : Text) : async () {
    switch (trafficSources.get(id)) {
      case (null) { Runtime.trap("Traffic source not found") };
      case (?_) { trafficSources.remove(id) };
    };
  };

  public query ({ caller }) func getTrafficSource(id : Text) : async TrafficSource {
    switch (trafficSources.get(id)) {
      case (null) { Runtime.trap("Traffic source not found") };
      case (?ts) { ts };
    };
  };

  public query ({ caller }) func getAllTrafficSources() : async [TrafficSource] {
    trafficSources.values().toArray();
  };

  /***************  Offers ***************/
  public shared ({ caller }) func createOffer(name : Text, url : Text, payout : Nat, currency : Text, status : OfferStatus) : async Offer {
    let id = generateId("offer_");
    let offer : Offer = { id; name; url; payout; currency; status; createdAt = Time.now(); updatedAt = Time.now() };
    offers.add(id, offer);
    offer;
  };

  public shared ({ caller }) func updateOffer(id : Text, name : Text, url : Text, payout : Nat, currency : Text, status : OfferStatus) : async Offer {
    switch (offers.get(id)) {
      case (null) { Runtime.trap("Offer not found") };
      case (?existing) {
        let updated : Offer = { id; name; url; payout; currency; status; createdAt = existing.createdAt; updatedAt = Time.now() };
        offers.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteOffer(id : Text) : async () {
    switch (offers.get(id)) {
      case (null) { Runtime.trap("Offer not found") };
      case (?_) { offers.remove(id) };
    };
  };

  public query ({ caller }) func getOffer(id : Text) : async Offer {
    switch (offers.get(id)) {
      case (null) { Runtime.trap("Offer not found") };
      case (?offer) { offer };
    };
  };

  public query ({ caller }) func getAllOffers() : async [Offer] {
    offers.values().toArray();
  };

  /***************  Campaigns ***************/
  public shared ({ caller }) func createCampaign(name : Text, trafficSourceId : Text, status : CampaignStatus, trackingDomain : Text) : async Campaign {
    let campaignKey = "static_key";
    let id = generateId("camp_");
    let campaign : Campaign = { id; name; trafficSourceId; status; trackingDomain; campaignKey; createdAt = Time.now(); updatedAt = Time.now() };
    campaigns.add(id, campaign);
    campaign;
  };

  public shared ({ caller }) func updateCampaign(id : Text, name : Text, trafficSourceId : Text, status : CampaignStatus, trackingDomain : Text) : async Campaign {
    switch (campaigns.get(id)) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?existing) {
        // Validation for active status
        if (status == #active) {
          let activeStreams = streams.values().toArray().filter(func(s) { s.campaignId == id and s.state == #active and s.offerId != "" });
          if (activeStreams.isEmpty()) {
            Runtime.trap("Cannot activate campaign: no active streams with an offer assigned");
          };
        };

        let updated : Campaign = { id; name; trafficSourceId; status; trackingDomain; campaignKey = existing.campaignKey; createdAt = existing.createdAt; updatedAt = Time.now() };
        campaigns.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteCampaign(id : Text) : async () {
    switch (campaigns.get(id)) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?_) {
        // Delete all associated streams
        let allStreams = streams.values().toArray();
        for (stream in allStreams.vals()) {
          if (stream.campaignId == id) {
            streams.remove(stream.id);
          };
        };
        campaigns.remove(id);
      };
    };
  };

  public query ({ caller }) func getCampaign(id : Text) : async Campaign {
    switch (campaigns.get(id)) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?campaign) { campaign };
    };
  };

  public query ({ caller }) func getCampaignByKey(campaignKey : Text) : async Campaign {
    let campaignOption = campaigns.values().toArray().find(func(c) { c.campaignKey == campaignKey });
    switch (campaignOption) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?campaign) { campaign };
    };
  };

  public query ({ caller }) func getAllCampaigns() : async [Campaign] {
    campaigns.values().toArray();
  };

  /***************  Flows ***************/
  public shared ({ caller }) func createFlow(name : Text, campaignId : Text, rules : [RoutingRule]) : async Flow {
    let id = generateId("flow_");
    let flow : Flow = { id; name; campaignId; rules; createdAt = Time.now(); updatedAt = Time.now() };
    flows.add(id, flow);
    flow;
  };

  public shared ({ caller }) func updateFlow(id : Text, name : Text, campaignId : Text, rules : [RoutingRule]) : async Flow {
    switch (flows.get(id)) {
      case (null) { Runtime.trap("Flow not found") };
      case (?existing) {
        let updated : Flow = { id; name; campaignId; rules; createdAt = existing.createdAt; updatedAt = Time.now() };
        flows.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteFlow(id : Text) : async () {
    switch (flows.get(id)) {
      case (null) { Runtime.trap("Flow not found") };
      case (?_) { flows.remove(id) };
    };
  };

  public query ({ caller }) func getFlow(id : Text) : async Flow {
    switch (flows.get(id)) {
      case (null) { Runtime.trap("Flow not found") };
      case (?flow) { flow };
    };
  };

  public query ({ caller }) func getAllFlows() : async [Flow] {
    flows.values().toArray();
  };

  /***************  Streams ***************/
  public shared ({ caller }) func createStream(name : Text, campaignId : Text, offerId : Text, weight : Nat, state : StreamState, position : Nat) : async Stream {
    switch (campaigns.get(campaignId)) {
      case (null) { Runtime.trap("Campaign does not exist") };
      case (?_) {
        let id = generateId("stream_");
        let stream : Stream = { id; name; campaignId; offerId; weight; state; position; createdAt = Time.now(); updatedAt = Time.now() };
        streams.add(id, stream);
        stream;
      };
    };
  };

  public shared ({ caller }) func updateStream(id : Text, name : Text, offerId : Text, weight : Nat, state : StreamState, position : Nat) : async Stream {
    switch (streams.get(id)) {
      case (null) { Runtime.trap("Stream not found") };
      case (?existing) {
        let updated : Stream = { existing with name; offerId; weight; state; position; updatedAt = Time.now() };
        streams.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteStream(id : Text) : async () {
    switch (streams.get(id)) {
      case (null) { Runtime.trap("Stream not found") };
      case (?_) { streams.remove(id) };
    };
  };

  public query ({ caller }) func getStream(id : Text) : async Stream {
    switch (streams.get(id)) {
      case (null) { Runtime.trap("Stream not found") };
      case (?stream) { stream };
    };
  };

  public query ({ caller }) func getStreamsByCampaign(campaignId : Text) : async [Stream] {
    let allStreams = streams.values().toArray();
    allStreams.filter(func(stream) { stream.campaignId == campaignId });
  };

  public query ({ caller }) func getAllStreams() : async [Stream] {
    streams.values().toArray();
  };

  /***************  Process Clicks ***************/
  public shared ({ caller }) func processClick(campaignKey : Text, ipAddress : Text, referrerUrl : Text, landingPageUrl : Text) : async ProcessClickResult {
    let campaignsArray = campaigns.values().toArray();
    let campaignOption = campaignsArray.find(func(c) { c.campaignKey == campaignKey });
    if (campaignOption == null) { Runtime.trap("Campaign not found") };

    let campaign = switch (campaignOption) {
      case (?c) { c };
      case (null) { Runtime.trap("Campaign not found") };
    };

    let allStreamsForCampaign = streams.values().toArray();
    let filteredStreams = allStreamsForCampaign.filter(func(s) { s.campaignId == campaign.id and s.state == #active and s.offerId != "" });

    if (filteredStreams.isEmpty()) {
      Runtime.trap("No active streams for campaign");
    };

    let selectedStream = filteredStreams[processClickRandomValue % filteredStreams.size()];

    if (selectedStream.offerId == "") { Runtime.trap("No offer found for selected stream") };

    let offer = switch (offers.get(selectedStream.offerId)) {
      case (null) { Runtime.trap("Offer not found") };
      case (?o) { o };
    };

    let clickEvent : ClickEvent = {
      id = generateId("click_");
      campaignId = campaign.id;
      ipAddress;
      country = "";
      city = "";
      os = "";
      browser = "";
      deviceType = "";
      referrerUrl;
      landingPageUrl;
      timestamp = Time.now();
      uniqueClickId = generateId("unique_click_");
    };
    clicksArray.add(clickEvent);

    let result : ProcessClickResult = { clickId = clickEvent.id; offerUrl = offer.url; campaignId = campaign.id };
    result;
  };

  /***************  Process Postbacks ***************/
  public shared ({ caller }) func processPostback(clickId : Text, offerId : Text, payout : Float, status : ConversionStatus) : async ConversionEvent {
    let clickEvents = clicksArray.toArray();
    let clickOption = clickEvents.find(func(click) { click.id == clickId });
    if (clickOption == null) { Runtime.trap("Click not found") };

    let click = switch (clickOption) {
      case (?c) { c };
      case (null) { Runtime.trap("Click not found") };
    };

    let conversion : ConversionEvent = { id = generateId("conv_"); clickId; campaignId = click.campaignId; offerId; payout; revenue = 0; timestamp = Time.now(); status };
    conversionsArray.add(conversion);
    conversion;
  };

  /***************  Legacy Clicks ***************/
  public shared ({ caller }) func recordClick(campaignId : Text, ipAddress : Text, country : Text, city : Text, os : Text, browser : Text, deviceType : Text, referrerUrl : Text, landingPageUrl : Text) : async ClickEvent {
    let id = generateId("click_");
    let click : ClickEvent = { id; campaignId; ipAddress; country; city; os; browser; deviceType; referrerUrl; landingPageUrl; timestamp = Time.now(); uniqueClickId = id };
    clicksArray.add(click);
    click;
  };

  public shared ({ caller }) func recordConversion(clickId : Text, campaignId : Text, offerId : Text, payout : Float, revenue : Nat, status : ConversionStatus) : async ConversionEvent {
    let id = generateId("conv_");
    let conversion : ConversionEvent = { id; clickId; campaignId; offerId; payout; revenue; timestamp = Time.now(); status };
    conversionsArray.add(conversion);
    conversion;
  };

  public query ({ caller }) func getCampaignStats() : async [CampaignStats] {
    [];
  };

  public query ({ caller }) func getClicksLog(page : Nat, pageSize : Nat) : async [ClickEvent] {
    let clicksArr = clicksArray.toArray();
    let start = page * pageSize;
    if (start >= clicksArr.size()) { return [] };
    let end = if (start + pageSize >= clicksArr.size()) { clicksArr.size() } else { start + pageSize };
    Array.tabulate<ClickEvent>(end - start, func(i) { clicksArr[start + i] });
  };

  public query ({ caller }) func getConversionsLog(page : Nat, pageSize : Nat) : async [ConversionEvent] {
    let conversionsArr = conversionsArray.toArray();
    let start = page * pageSize;
    if (start >= conversionsArr.size()) { return [] };
    let end = if (start + pageSize >= conversionsArr.size()) { conversionsArr.size() } else { start + pageSize };
    Array.tabulate<ConversionEvent>(end - start, func(i) { conversionsArr[start + i] });
  };

  /***************  Domains ***************/
  public shared ({ caller }) func createDomain(name : Text, domainType : DomainType, status : DomainStatus) : async Domain {
    Validation.isValidDomainInput(name);
    let id = generateId("domain_");
    let domain : Domain = { id; name; domainType; status; createdAt = Time.now(); updatedAt = Time.now() };
    domains.add(id, domain);
    domain;
  };

  public shared ({ caller }) func updateDomain(id : Text, name : Text, domainType : DomainType, status : DomainStatus) : async Domain {
    Validation.isValidDomainInput(name);
    switch (domains.get(id)) {
      case (null) { Runtime.trap("Domain not found") };
      case (?existing) {
        let updated : Domain = { id; name; domainType; status; createdAt = existing.createdAt; updatedAt = Time.now() };
        domains.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func deleteDomain(id : Text) : async () {
    switch (domains.get(id)) {
      case (null) { Runtime.trap("Domain not found") };
      case (?_) { domains.remove(id) };
    };
  };

  public query ({ caller }) func getDomain(id : Text) : async Domain {
    switch (domains.get(id)) {
      case (null) { Runtime.trap("Domain not found") };
      case (?domain) { domain };
    };
  };

  public query ({ caller }) func getAllDomains() : async [Domain] {
    domains.values().toArray();
  };

  public query ({ caller }) func getAllDomainsByType(domainType : DomainType) : async [Domain] {
    let allDomains = domains.values().toArray();
    allDomains.filter(func(domain) { domain.domainType == domainType });
  };
};
