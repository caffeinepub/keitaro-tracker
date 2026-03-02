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


// specify the data migration function in with-clause

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  /*************** Types ***************/
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
  public type ErrorLog = { id : Text; context : Text; message : Text; timestamp : Time.Time };
  public type Session = { token : Text; userEmail : Text; createdAt : Time.Time };
  public type InviteToken = { token : Text; createdAt : Time.Time; used : Bool };
  public type User = { email : Text; passwordHash : Text; displayName : Text; createdAt : Time.Time };

  /*************** Helper Types ***************/
  type TrafficSourceKey = Text;
  type OfferKey = Text;
  type CampaignKey = Text;
  type FlowKey = Text;
  type DomainKey = Text;
  type StreamKey = Text;

  /*************** ID Management ***************/
  var idCounter = 0;
  func generateId(prefix : Text) : Text {
    let id = prefix # idCounter.toText();
    idCounter += 1;
    id;
  };

  /*************** Storage ***************/
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
  let errorLogs = Map.empty<Text, ErrorLog>();
  let sessions = Map.empty<Text, Session>();
  let inviteTokens = Map.empty<Text, InviteToken>();
  let users = Map.empty<Text, User>();

  /*************** User Profile Functions (Required by Frontend) ***************/
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

  /*************** Initialization ***************/
  public shared ({ caller }) func initialize() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can initialize");
    };
    if (domains.size() == 0) {
      domains.add("domain_0", { id = "domain_0"; name = "campaign.tracking.com"; domainType = #campaign; status = #active; createdAt = Time.now(); updatedAt = Time.now() });
      domains.add("domain_1", { id = "domain_1"; name = "postback.tracking.com"; domainType = #postback; status = #active; createdAt = Time.now(); updatedAt = Time.now() });
      domains.add("domain_2", { id = "domain_2"; name = "admin.tracking.com"; domainType = #admin; status = #active; createdAt = Time.now(); updatedAt = Time.now() });
    };
  };

  public shared ({ caller }) func setProcessClickRandomValue(value : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set random value");
    };
    processClickRandomValue := value;
  };

  /*************** User Authentication ***************/
  public shared ({ caller }) func registerFirstUser(email : Text, passwordHash : Text, displayName : Text) : async Text {
    if (users.size() > 0) {
      Runtime.trap("First user can only be created if no users exist");
    };
    let newUser : User = { email; passwordHash; displayName; createdAt = Time.now() };
    users.add(email, newUser);
    let sessionToken = generateId("session_");
    let session : Session = { token = sessionToken; userEmail = email; createdAt = Time.now() };
    sessions.add(sessionToken, session);
    sessionToken;
  };

  public shared ({ caller }) func registerWithInvite(inviteToken : Text, email : Text, passwordHash : Text, displayName : Text) : async Text {
    switch (inviteTokens.get(inviteToken)) {
      case (null) { Runtime.trap("Invalid invite token") };
      case (?token) {
        if (token.used) {
          Runtime.trap("Invite token already used");
        };
        let newUser : User = { email; passwordHash; displayName; createdAt = Time.now() };
        users.add(email, newUser);
        let sessionToken = generateId("session_");
        let session : Session = { token = sessionToken; userEmail = email; createdAt = Time.now() };
        sessions.add(sessionToken, session);
        let updatedToken : InviteToken = { token = token.token; createdAt = token.createdAt; used = true };
        inviteTokens.add(inviteToken, updatedToken);
        sessionToken;
      };
    };
  };

  public shared ({ caller }) func loginUser(email : Text, passwordHash : Text) : async Text {
    switch (users.get(email)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        if (user.passwordHash != passwordHash) {
          Runtime.trap("Invalid credentials");
        };
        let sessionToken = generateId("session_");
        let session : Session = { token = sessionToken; userEmail = email; createdAt = Time.now() };
        sessions.add(sessionToken, session);
        sessionToken;
      };
    };
  };

  public shared ({ caller }) func logoutUser(sessionToken : Text) : async () {
    switch (sessions.get(sessionToken)) {
      case (null) { Runtime.trap("Session not found") };
      case (?_) { sessions.remove(sessionToken) };
    };
  };

  public query ({ caller }) func validateSession(sessionToken : Text) : async { email : Text; displayName : Text } {
    switch (sessions.get(sessionToken)) {
      case (null) { Runtime.trap("Invalid session token") };
      case (?session) {
        switch (users.get(session.userEmail)) {
          case (null) { Runtime.trap("User not found") };
          case (?user) {
            { email = user.email; displayName = user.displayName };
          };
        };
      };
    };
  };

  public shared ({ caller }) func generateInviteToken(sessionToken : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can generate invite tokens");
    };
    switch (sessions.get(sessionToken)) {
      case (null) { Runtime.trap("Invalid session token") };
      case (?_) {
        let inviteToken = generateId("invite_");
        let token : InviteToken = { token = inviteToken; createdAt = Time.now(); used = false };
        inviteTokens.add(inviteToken, token);
        inviteToken;
      };
    };
  };

  public query ({ caller }) func getMyProfile(sessionToken : Text) : async { email : Text; displayName : Text } {
    switch (sessions.get(sessionToken)) {
      case (null) { Runtime.trap("Invalid session token") };
      case (?session) {
        switch (users.get(session.userEmail)) {
          case (null) { Runtime.trap("User not found") };
          case (?user) {
            { email = user.email; displayName = user.displayName };
          };
        };
      };
    };
  };

  /*************** Error Logging ***************/
  // Public endpoint - no auth required (explicitly stated in spec)
  public shared ({ caller }) func logError(context : Text, message : Text) : async () {
    let errorLog : ErrorLog = { id = generateId("error_"); context; message; timestamp = Time.now() };
    errorLogs.add(errorLog.id, errorLog);
  };

  public query ({ caller }) func getErrorLog() : async [ErrorLog] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view error logs");
    };
    errorLogs.values().toArray();
  };

  /*************** Traffic Sources ***************/
  public shared ({ caller }) func createTrafficSource(name : Text, postbackUrl : Text, costModel : CostModel, parameters : [Parameter]) : async TrafficSource {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create traffic sources");
    };
    Validation.isValidTrafficSourceInput(name, postbackUrl);
    let id = generateId("traf_");
    let ts : TrafficSource = { id; name; postbackUrl; costModel; parameters; createdAt = Time.now(); updatedAt = Time.now() };
    trafficSources.add(id, ts);
    ts;
  };

  public shared ({ caller }) func updateTrafficSource(id : Text, name : Text, postbackUrl : Text, costModel : CostModel, parameters : [Parameter]) : async TrafficSource {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update traffic sources");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete traffic sources");
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
      case (?ts) { ts };
    };
  };

  public query ({ caller }) func getAllTrafficSources() : async [TrafficSource] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view traffic sources");
    };
    trafficSources.values().toArray();
  };

  /*************** Offers ***************/
  public shared ({ caller }) func createOffer(name : Text, url : Text, payout : Nat, currency : Text, status : OfferStatus) : async Offer {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create offers");
    };
    let id = generateId("offer_");
    let offer : Offer = { id; name; url; payout; currency; status; createdAt = Time.now(); updatedAt = Time.now() };
    offers.add(id, offer);
    offer;
  };

  public shared ({ caller }) func updateOffer(id : Text, name : Text, url : Text, payout : Nat, currency : Text, status : OfferStatus) : async Offer {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update offers");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete offers");
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

  /*************** Campaigns ***************/
  public shared ({ caller }) func createCampaign(name : Text, trafficSourceId : Text, status : CampaignStatus, trackingDomain : Text) : async Campaign {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create campaigns");
    };
    let campaignKey = "static_key";
    let id = generateId("camp_");
    let campaign : Campaign = { id; name; trafficSourceId; status; trackingDomain; campaignKey; createdAt = Time.now(); updatedAt = Time.now() };
    campaigns.add(id, campaign);
    campaign;
  };

  public shared ({ caller }) func updateCampaign(id : Text, name : Text, trafficSourceId : Text, status : CampaignStatus, trackingDomain : Text) : async Campaign {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update campaigns");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete campaigns");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view campaigns");
    };
    switch (campaigns.get(id)) {
      case (null) { Runtime.trap("Campaign not found") };
      case (?campaign) { campaign };
    };
  };

  public query ({ caller }) func getCampaignByKey(campaignKey : Text) : async Campaign {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view campaigns");
    };
    let campaignOption = campaigns.values().toArray().find(func(c) { c.campaignKey == campaignKey });
    switch (campaignOption) {
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

  /*************** Flows ***************/
  public shared ({ caller }) func createFlow(name : Text, campaignId : Text, rules : [RoutingRule]) : async Flow {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create flows");
    };
    let id = generateId("flow_");
    let flow : Flow = { id; name; campaignId; rules; createdAt = Time.now(); updatedAt = Time.now() };
    flows.add(id, flow);
    flow;
  };

  public shared ({ caller }) func updateFlow(id : Text, name : Text, campaignId : Text, rules : [RoutingRule]) : async Flow {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update flows");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete flows");
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

  /*************** Streams ***************/
  public shared ({ caller }) func createStream(name : Text, campaignId : Text, offerId : Text, weight : Nat, state : StreamState, position : Nat) : async Stream {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create streams");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update streams");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete streams");
    };
    switch (streams.get(id)) {
      case (null) { Runtime.trap("Stream not found") };
      case (?_) { streams.remove(id) };
    };
  };

  public query ({ caller }) func getStream(id : Text) : async Stream {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view streams");
    };
    switch (streams.get(id)) {
      case (null) { Runtime.trap("Stream not found") };
      case (?stream) { stream };
    };
  };

  public query ({ caller }) func getStreamsByCampaign(campaignId : Text) : async [Stream] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view streams");
    };
    let allStreams = streams.values().toArray();
    allStreams.filter(func(stream) { stream.campaignId == campaignId });
  };

  public query ({ caller }) func getAllStreams() : async [Stream] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view streams");
    };
    streams.values().toArray();
  };

  /*************** Process Clicks ***************/
  // Public endpoint - called by external tracking systems, no auth required
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

  /*************** Process Postbacks ***************/
  // Public endpoint - called by external affiliate networks, no auth required
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

  /*************** Legacy Clicks ***************/
  public shared ({ caller }) func recordClick(campaignId : Text, ipAddress : Text, country : Text, city : Text, os : Text, browser : Text, deviceType : Text, referrerUrl : Text, landingPageUrl : Text) : async ClickEvent {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record clicks");
    };
    let id = generateId("click_");
    let click : ClickEvent = { id; campaignId; ipAddress; country; city; os; browser; deviceType; referrerUrl; landingPageUrl; timestamp = Time.now(); uniqueClickId = id };
    clicksArray.add(click);
    click;
  };

  public shared ({ caller }) func recordConversion(clickId : Text, campaignId : Text, offerId : Text, payout : Float, revenue : Nat, status : ConversionStatus) : async ConversionEvent {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record conversions");
    };
    let id = generateId("conv_");
    let conversion : ConversionEvent = { id; clickId; campaignId; offerId; payout; revenue; timestamp = Time.now(); status };
    conversionsArray.add(conversion);
    conversion;
  };

  public query ({ caller }) func getCampaignStats() : async [CampaignStats] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view campaign stats");
    };
    [];
  };

  public query ({ caller }) func getClicksLog(page : Nat, pageSize : Nat) : async [ClickEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view clicks log");
    };
    let clicksArr = clicksArray.toArray();
    let start = page * pageSize;
    if (start >= clicksArr.size()) { return [] };
    let end = if (start + pageSize >= clicksArr.size()) { clicksArr.size() } else { start + pageSize };
    Array.tabulate<ClickEvent>(end - start, func(i) { clicksArr[start + i] });
  };

  public query ({ caller }) func getConversionsLog(page : Nat, pageSize : Nat) : async [ConversionEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view conversions log");
    };
    let conversionsArr = conversionsArray.toArray();
    let start = page * pageSize;
    if (start >= conversionsArr.size()) { return [] };
    let end = if (start + pageSize >= conversionsArr.size()) { conversionsArr.size() } else { start + pageSize };
    Array.tabulate<ConversionEvent>(end - start, func(i) { conversionsArr[start + i] });
  };

  /*************** Domains ***************/
  public shared ({ caller }) func createDomain(name : Text, domainType : DomainType, status : DomainStatus) : async Domain {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create domains");
    };
    Validation.isValidDomainInput(name);
    let id = generateId("domain_");
    let domain : Domain = { id; name; domainType; status; createdAt = Time.now(); updatedAt = Time.now() };
    domains.add(id, domain);
    domain;
  };

  public shared ({ caller }) func updateDomain(id : Text, name : Text, domainType : DomainType, status : DomainStatus) : async Domain {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update domains");
    };
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete domains");
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
