import { isDemoMode } from "../demo/isDemoMode";
import * as demo from "../demo/mockApi";
import * as live from "./apiLive";

const impl = isDemoMode ? demo : live;

export type { GmailSyncResult } from "./apiLive";

export const fetchApplications = impl.fetchApplications;
export const createApplicationApi = impl.createApplicationApi;
export const updateApplicationApi = impl.updateApplicationApi;
export const deleteApplicationApi = impl.deleteApplicationApi;
export const fetchGmailStatus = impl.fetchGmailStatus;
export const connectGmailDemo = impl.connectGmailDemo;
export const disconnectGmailApi = impl.disconnectGmailApi;
export const syncGmailApi = impl.syncGmailApi;
export const fetchSuggestions = impl.fetchSuggestions;
export const clearSuggestionsApi = impl.clearSuggestionsApi;
export const acceptSuggestionApi = impl.acceptSuggestionApi;
export const dismissSuggestionApi = impl.dismissSuggestionApi;
export const fetchSuggestionHistory = impl.fetchSuggestionHistory;
export const updateSuggestionApi = impl.updateSuggestionApi;
export const gmailConnectUrl = impl.gmailConnectUrl;
export const fetchGmailRules = impl.fetchGmailRules;
export const saveGmailRulesApi = impl.saveGmailRulesApi;
export const resetGmailRulesApi = impl.resetGmailRulesApi;
