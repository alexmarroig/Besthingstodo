"use client";

import { DEFAULT_USER_ID } from "@life/shared-types";

const KEY = "life_user_id";
const TOKEN_KEY = "life_access_token";
const CONCIERGE_MEMORY_KEY = "life_concierge_memory";
const COUPLE_PROFILE_KEY = "life_couple_profile";

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

// --- Couple Profile (localStorage, no backend) ---

const DEFAULT_COUPLE_PROFILE = {
  city: "São Paulo",
  neighborhood: "Campo Belo",
  person_a: { name: "Pessoa A", interests: "", dislikes: "" },
  person_b: { name: "Pessoa B", interests: "", dislikes: "" },
  transport: "carro",
  rain_plan: "indoor",
  max_drive_minutes: 30,
  search_radius_km: 15,
  profile: {
    couple_profile_json: {
      interests: {
        cinema: { favorite_titles: ["Interstellar", "Parasita", "Pobres Criaturas"] },
        series: ["The Bear", "Succession", "Shōgun"],
        dining: { favorites: ["Lellis Trattoria", "Issho", "A Pizza da Mooca"] },
      },
    },
  },
};

export function getCoupleProfile(): any {
  return safeJsonParse(getStorage("local")?.getItem(COUPLE_PROFILE_KEY) || null, DEFAULT_COUPLE_PROFILE);
}

export function setCoupleProfile(profile: any) {
  getStorage("local")?.setItem(COUPLE_PROFILE_KEY, JSON.stringify(profile));
}

export function patchCoupleProfileLocal(patch: Record<string, any>) {
  const current = getCoupleProfile();
  setCoupleProfile({ ...current, ...patch });
}

// --- Saved Items ---

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

// --- Agenda Items ---

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

// --- Concierge Memory ---

export function getConciergeMemory(): string[] {
  return safeJsonParse(getStorage("local")?.getItem(CONCIERGE_MEMORY_KEY) || null, []);
}

export function setConciergeMemory(items: string[]) {
  getStorage("local")?.setItem(CONCIERGE_MEMORY_KEY, JSON.stringify(items));
}
