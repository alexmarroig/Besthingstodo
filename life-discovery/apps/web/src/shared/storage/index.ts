"use client";

import { DEFAULT_USER_ID } from "@life/shared-types";

const KEY = "life_user_id";
const TOKEN_KEY = "life_access_token";
const CONCIERGE_MEMORY_KEY = "life_concierge_memory";

function getStorage(kind: "local" | "session") {
  if (typeof window === "undefined") return null;
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getUserId() {
  const storage = getStorage("local");
  return storage?.getItem(KEY) || DEFAULT_USER_ID;
}

export function setUserId(userId: string) {
  getStorage("local")?.setItem(KEY, userId);
}

export function getAccessToken() {
  return getStorage("session")?.getItem(TOKEN_KEY) || "";
}

export function setAccessToken(token: string) {
  getStorage("session")?.setItem(TOKEN_KEY, token);
}

export function clearAuth() {
  getStorage("session")?.removeItem(TOKEN_KEY);
  getStorage("local")?.removeItem(KEY);
}

export function getSavedItems(): any[] {
  return safeJsonParse(getStorage("local")?.getItem("saved_items") || null, []);
}

export function setSavedItems(items: any[]) {
  getStorage("local")?.setItem("saved_items", JSON.stringify(items));
}

export function upsertSavedItem(item: any) {
  const current = getSavedItems();
  if (current.find((x: any) => x.id === item.id)) return;
  setSavedItems([item, ...current]);
}

export function getAgendaItems(): any[] {
  return safeJsonParse(getStorage("local")?.getItem("agenda_items") || null, []);
}

export function setAgendaItems(items: any[]) {
  getStorage("local")?.setItem("agenda_items", JSON.stringify(items));
}

export function upsertAgendaItem(item: any) {
  const current = getAgendaItems();
  if (current.find((x: any) => x.id === item.id)) return;
  const date =
    item?.start_time && typeof item.start_time === "string"
      ? item.start_time.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  setAgendaItems([{ ...item, date }, ...current]);
}

export function getConciergeMemory(): string[] {
  return safeJsonParse(getStorage("local")?.getItem(CONCIERGE_MEMORY_KEY) || null, []);
}

export function setConciergeMemory(items: string[]) {
  getStorage("local")?.setItem(CONCIERGE_MEMORY_KEY, JSON.stringify(items));
}
