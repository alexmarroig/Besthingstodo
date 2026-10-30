"use client";
import { applyStateOperations, emptyAccountState } from "./account-state";
import type { AccountState, StateEnvelope, StateOperation } from "./account-state";

export const ML_UPDATE_EVENT = "life-ml-updated";
export const ACCOUNT_REQUIRED_EVENT = "life-account-required";
type SyncStatus = "guest" | "syncing" | "saved" | "offline" | "error" | "verify";
type Snapshot = { accountId: string | null; status: SyncStatus; pending: number };
let snapshot: Snapshot = { accountId: null, status: "guest", pending: 0 };
let envelope: StateEnvelope = { state: emptyAccountState(), version: 0, acknowledged: [] };
let optimistic = emptyAccountState();
let generation = 0;
let flushing = false;
let abort: AbortController | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const prefix = (account: string) => `r2:account:${encodeURIComponent(account)}:`;
const opPrefix = (account: string) => `${prefix(account)}op:`;

function storage() { try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; } }
function readJSON(key: string, fallback: any) { try { return JSON.parse(storage()?.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function queue(account: string): StateOperation[] {
  const local = storage(); if (!local) return [];
  const entries = [];
  for (let i = 0; i < local.length; i++) {
    const key = local.key(i);
    if (key?.startsWith(opPrefix(account))) {
      const entry = readJSON(key, null);
      if (entry?.operation?.id) entries.push(entry);
    }
  }
  return entries.sort((a, b) => a.createdAt - b.createdAt || a.operation.id.localeCompare(b.operation.id)).map(x => x.operation);
}
function emit(status: SyncStatus = snapshot.status, detail?: { type?: string; title?: string; id?: string }) {
  snapshot = { ...snapshot, status, pending: snapshot.accountId ? queue(snapshot.accountId).length : 0 };
  listeners.forEach(fn => fn());
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(ML_UPDATE_EVENT, { detail: detail || { type: "sync" } }));
}
function persist() {
  if (!snapshot.accountId) return;
  try { storage()?.setItem(`${prefix(snapshot.accountId)}cache`, JSON.stringify(envelope)); } catch { /* queue is retained independently */ }
}
function rebuild() { optimistic = applyStateOperations(envelope.state, snapshot.accountId ? queue(snapshot.accountId) : []); }

export function getAccountSnapshot() { return snapshot; }
const serverSnapshot: Snapshot = { accountId: null, status: "guest", pending: 0 };
export function getAccountServerSnapshot() { return serverSnapshot; }
export function subscribeAccount(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function getAccountState(): AccountState { return optimistic; }
export function activeAccountId() { return snapshot.accountId; }
export function notifyMLUpdate(detail?: { type?: string; title?: string; id?: string }) { emit(snapshot.status, detail); }

export function activateAccount(account: string | null) {
  if (snapshot.accountId === account) return;
  generation++; abort?.abort(); abort = null; flushing = false; clearTimeout(timer);
  snapshot = { accountId: account, status: account ? "syncing" : "guest", pending: 0 };
  const cached = account ? readJSON(`${prefix(account)}cache`, null) : null;
  envelope = cached?.state && Number.isSafeInteger(cached.version) ? cached : { state: emptyAccountState(), version: 0, acknowledged: [] };
  rebuild(); emit(snapshot.status, { type: "account_changed" });
  if (account) void synchronizeAccount();
}
export function requireAccountForChange() {
  if (snapshot.accountId) return true;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(ACCOUNT_REQUIRED_EVENT));
  return false;
}
type NewOperation = StateOperation extends infer Op ? Op extends StateOperation ? Omit<Op, "id"> : never : never;
export function enqueueAccountOperation(operation: NewOperation, silent = false): boolean {
  const account = snapshot.accountId;
  if (!account) { if (!silent) requireAccountForChange(); return false; }
  const op = { ...operation, id: crypto.randomUUID() } as StateOperation;
  try {
    const local = storage(); if (!local) throw new Error("storage_unavailable");
    local.setItem(`${opPrefix(account)}${op.id}`, JSON.stringify({ operation: op, createdAt: Date.now() }));
    rebuild(); emit("syncing");
    clearTimeout(timer); timer = setTimeout(() => void synchronizeAccount(), 500);
    return true;
  } catch { emit("error"); return false; }
}

export async function synchronizeAccount() {
  const account = snapshot.accountId;
  if (!account || flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) { emit("offline"); return; }
  const epoch = generation;
  flushing = true; const controller = new AbortController(); abort = controller;
  const valid = () => generation === epoch && snapshot.accountId === account;
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const initial = await fetch("/api/me/state", { cache: "no-store", signal: controller.signal });
    if (!valid()) return;
    if (initial.status === 401) { activateAccount(null); return; }
    if (initial.status === 403) { emit("verify"); return; }
    if (!initial.ok) throw new Error("sync_failed");
    const incoming = await initial.json();
    if (!valid() || incoming.accountId !== account) return;
    envelope = incoming; rebuild(); persist();
    for (let attempt = 0; attempt < 5 && valid(); attempt++) {
      const pending: StateOperation[] = queue(account).slice(0, 100);
      if (!pending.length) break;
      emit("syncing");
      const response: Response = await fetch("/api/me/state", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedAccountId: account, baseVersion: envelope.version, operations: pending }), signal: controller.signal,
      });
      if (!valid()) return;
      if (response.status === 401) { activateAccount(null); return; }
      if (response.status === 403) { emit("verify"); return; }
      if (!response.ok && response.status !== 409) throw new Error("sync_failed");
      const result: StateEnvelope & { accountId: string } = await response.json();
      if (!valid() || result.accountId !== account) return;
      for (const id of result.acknowledged || []) storage()?.removeItem(`${opPrefix(account)}${id}`);
      envelope = result; rebuild(); persist();
    }
    if (valid()) emit(queue(account).length ? "syncing" : "saved");
  } catch {
    if (valid()) emit(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
  } finally {
    clearTimeout(timeout);
    if (valid()) {
      flushing = false; abort = null;
      if (queue(account).length && snapshot.status === "syncing") timer = setTimeout(() => void synchronizeAccount(), 1000);
    }
  }
}

export function hasLegacyData() {
  return ["life_couple_profile", "saved_items", "agenda_items", "life_feedback", "life_custom_ingested_items", "life_concierge_memory"]
    .some(key => { const value = readJSON(key, null); return value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0); });
}
export function importLegacyData() {
  if (!snapshot.accountId || optimistic.importedLegacy) return;
  const index = (rows: any[], kind: string) => Object.fromEntries(rows.filter(x => x && typeof x === "object").map((row, i) => {
    const id = kind === "feedback" ? row.id || `legacy-${row.experience_id}-${row.feedback_type}-${row.timestamp || i}` : row.id;
    return [String(id), { ...row, id: String(id) }];
  }).filter(([id]) => id && id !== "undefined"));
  const profile = readJSON("life_couple_profile", undefined);
  if (profile) delete profile.user_id;
  enqueueAccountOperation({ kind: "import", value: {
    ...(profile ? { profile } : {}), saved: index(readJSON("saved_items", []), "saved"),
    agenda: index(readJSON("agenda_items", []), "agenda"), custom: index(readJSON("life_custom_ingested_items", []), "custom"),
    feedback: index(readJSON("life_feedback", []), "feedback"), memory: readJSON("life_concierge_memory", []),
  } });
}

export function listenForAccountSync() {
  const visible = () => { if (document.visibilityState === "visible") void synchronizeAccount(); };
  const onStorage = (event: StorageEvent) => {
    if (snapshot.accountId && event.key?.startsWith(prefix(snapshot.accountId))) { rebuild(); emit(); void synchronizeAccount(); }
  };
  const interval = setInterval(visible, 30_000);
  window.addEventListener("online", visible); window.addEventListener("focus", visible);
  document.addEventListener("visibilitychange", visible); window.addEventListener("storage", onStorage);
  return () => { clearInterval(interval); window.removeEventListener("online", visible); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); window.removeEventListener("storage", onStorage); };
}
