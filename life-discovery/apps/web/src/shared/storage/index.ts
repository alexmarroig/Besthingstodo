"use client";
import type { CoupleSnapshot, Recommendation } from "@life/shared-types";
import { buildCoupleProfileFromForm } from "../couple-profile-builder";
import { activeAccountId, activateAccount, enqueueAccountOperation, getAccountState, notifyMLUpdate, requireAccountForChange } from "../account-sync";
import { profileChanges } from "../account-state";
import type { FeedbackEntry, FeedbackSignalType } from "../../features/catalog/ml/engine";
export type { FeedbackEntry, FeedbackSignalType };
export { ML_UPDATE_EVENT, notifyMLUpdate } from "../account-sync";

export function getUserId() { return activeAccountId() || "guest"; }
export function setUserId(_userId: string) { /* Identity is exclusively supplied by the authenticated session. */ }
export function getAccessToken() { return ""; }
export function setAccessToken(_token: string) { /* HttpOnly session cookies are managed by Neon Auth. */ }
export function clearAuth() { activateAccount(null); }
export function getCoupleProfile(): CoupleSnapshot { return getAccountState().profile; }
export function setCoupleProfile(profile: CoupleSnapshot) {
  const patch=profileChanges(getCoupleProfile(),profile);
  if (Object.keys(patch).length) enqueueAccountOperation({kind:"profile",value:patch});
}
export function patchCoupleProfileLocal(patch: Partial<CoupleSnapshot>) { setCoupleProfile(buildCoupleProfileFromForm(patch,getCoupleProfile())); }
function values(entity:"saved"|"agenda"|"custom"|"feedback") { return Object.values(getAccountState()[entity]); }
function replaceItems(entity:"saved"|"agenda",items:any[]) {
  if(!requireAccountForChange())return;
  const previous=getAccountState()[entity];const ids=new Set(items.map(x=>String(x.id)));
  for(const id of Object.keys(previous))if(!ids.has(id))enqueueAccountOperation({kind:"remove",entity,key:id});
  for(const item of items)if(item?.id&&JSON.stringify(previous[item.id])!==JSON.stringify(item))enqueueAccountOperation({kind:"upsert",entity,key:String(item.id),value:item});
}
export function getSavedItems(): any[] { return values("saved").sort((a,b)=>String(b.saved_at||"").localeCompare(String(a.saved_at||""))); }
export function setSavedItems(items:any[]) { replaceItems("saved",items); }
export function upsertSavedItem(item:any) { if(item?.id&&!isItemSaved(item.id))enqueueAccountOperation({kind:"upsert",entity:"saved",key:String(item.id),value:{...item,saved_at:new Date().toISOString()}}); }
export function removeSavedItem(id:string) { enqueueAccountOperation({kind:"remove",entity:"saved",key:id}); }
export function assignSavedCollection(id:string, collection:string) {
  const current=getAccountState().saved[id];
  if(current)enqueueAccountOperation({kind:"upsert",entity:"saved",key:id,value:{...current,collection}});
}
export function isItemSaved(id:string) { return Boolean(getAccountState().saved[id]); }
export function getCustomIngestedItems(): Recommendation[] { return values("custom") as Recommendation[]; }
export function addCustomIngestedItem(item:Recommendation) { if(item?.id)enqueueAccountOperation({kind:"upsert",entity:"custom",key:item.id,value:item}); }
export function removeCustomIngestedItem(id:string) { enqueueAccountOperation({kind:"remove",entity:"custom",key:id}); }
export function getAgendaItems():any[] { return values("agenda"); }
export function removeAgendaItem(id:string) { enqueueAccountOperation({kind:"remove",entity:"agenda",key:id}); }
export function setAgendaItems(items:any[]) { replaceItems("agenda",items); }
export function upsertAgendaItem(item:any) { if(item?.id&&!getAccountState().agenda[item.id])enqueueAccountOperation({kind:"upsert",entity:"agenda",key:String(item.id),value:{...item,date:item.start_time?.slice(0,10)||new Date().toISOString().slice(0,10)}}); }
export function getFeedbackHistory():FeedbackEntry[] { return values("feedback").sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp))) as FeedbackEntry[]; }
export function addFeedback(entry:Record<string,any>) { if(!activeAccountId())return; const id=crypto.randomUUID();enqueueAccountOperation({kind:"upsert",entity:"feedback",key:id,value:{...entry,id}},true); }
export function removeFeedbackEntry(experienceId:string) { for(const [id,entry]of Object.entries(getAccountState().feedback))if(entry.experience_id===experienceId)enqueueAccountOperation({kind:"remove",entity:"feedback",key:id});notifyMLUpdate({type:"feedback_removed",id:experienceId}); }
export function clearFeedbackHistory() { enqueueAccountOperation({kind:"clearFeedback"});notifyMLUpdate({type:"feedback_reset"}); }
export function getConciergeMemory():string[] { return getAccountState().memory; }
export function setConciergeMemory(items:string[]) { if(activeAccountId())enqueueAccountOperation({kind:"memory",value:items.slice(-100)},true); }
