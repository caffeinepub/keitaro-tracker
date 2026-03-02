# KTracker

## Current State

Full-stack tracker app (Motoko backend + React frontend). Campaigns are stored with a `campaignKey` field, but currently all campaigns are assigned `"static_key"` as their campaign key in `createCampaign()`. The tracking link format is `/#/click/:campaignKey` in the frontend hash routing.

## Requested Changes (Diff)

### Add
- `generateCampaignKey()` helper function in the backend that produces a 16-character unique alphanumeric string (lowercase letters + digits) per campaign using time + counter mixing
- `migrateCampaignKeys()` public shared function that iterates all campaigns and replaces any that have `campaignKey == "static_key"` with a newly generated unique key

### Modify
- `createCampaign()`: replace hardcoded `"static_key"` with a call to `generateCampaignKey()`
- Frontend hash routing in `Layout.tsx`: change the regex from `#/click/:key` to `#/click/:key` -- no change needed here, just ensure `ClickHandlerPage` receives the correct key
- `getTrackingLink()` in `CampaignsPage.tsx`: keep the format `/#/click/:campaignKey` (no change needed, backend key will now be unique)
- `getCampaignByKey()`: keep as-is (already works by campaignKey lookup)

### Remove
- Nothing removed

## Implementation Plan

1. Add `var campaignKeyCounter : Nat = 0` state variable to backend
2. Add `generateCampaignKey()` private function that mixes `Time.now()`, `idCounter`, and `campaignKeyCounter` to generate a 16-char alphanumeric string
3. Update `createCampaign()` to call `generateCampaignKey()` instead of `"static_key"`
4. Add `migrateCampaignKeys()` public shared function (no auth required so it can be called once) that finds all campaigns with `campaignKey == "static_key"` and updates them with unique generated keys
5. Frontend: no structural changes needed -- tracking link format stays `/#/click/:campaignKey`, which already works correctly
