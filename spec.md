# KTracker

## Current State

KTracker is a Keitaro-like ad tracking platform with:
- Traffic Sources, Offers, Campaigns, Flows, Domains management
- Activity log (localStorage-based)
- Email/password login (localStorage-based) + Internet Identity login
- DNS setup instructions for domains
- All backend write operations require admin role (isAdmin check)
- The anonymous actor cannot get admin rights, so all create/update/delete calls fail with "Unauthorized"

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Remove all authorization checks from backend write operations (createTrafficSource, updateTrafficSource, deleteTrafficSource, createOffer, updateOffer, deleteOffer, createCampaign, updateCampaign, deleteCampaign, createFlow, updateFlow, deleteFlow, createDomain, updateDomain, deleteDomain, initialize)
- Remove authorization checks from read operations (getAllTrafficSources, getTrafficSource, getAllOffers, getOffer, getAllCampaigns, getCampaign, getAllFlows, getFlow, getAllDomains, getDomain, getAllDomainsByType, getCampaignStats, getClicksLog, getConversionsLog, getCallerUserProfile, getUserProfile, saveCallerUserProfile)
- All operations should be open (no auth required) so both anonymous and authenticated users can perform CRUD

### Remove
- Nothing

## Implementation Plan

1. Regenerate Motoko backend with all auth checks removed from all operations
2. Keep all data models and business logic the same
3. Keep MixinAuthorization mixin (for isCallerAdmin, getCallerUserRole queries) but stop using it for access control on CRUD operations
4. Frontend stays unchanged - the mutations already work correctly once the backend stops rejecting anonymous calls
