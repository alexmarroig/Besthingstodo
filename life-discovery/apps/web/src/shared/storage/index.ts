"use client";

import { CoupleSnapshot, DEFAULT_USER_ID, Recommendation } from "@life/shared-types";

import { buildCoupleProfileFromForm } from "../couple-profile-builder";
import type { FeedbackEntry, FeedbackSignalType } from "../../features/catalog/ml/engine";

export type { FeedbackEntry, FeedbackSignalType };

const KEY = "life_user_id";
const TOKEN_KEY = "life_access_token";
const CONCIERGE_MEMORY_KEY = "life_concierge_memory";
const COUPLE_PROFILE_KEY = "life_couple_profile";
const CUSTOM_ITEMS_KEY = "life_custom_ingested_items";
const FEEDBACK_KEY = "life_feedback";

export const ML_UPDATE_EVENT = "life-ml-updated";

function getStorage(kind: "local" | "session") {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function notifyMLUpdate(detail?: { type?: string; title?: string; id?: string }) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(ML_UPDATE_EVENT, { detail }));
  } catch {
    // ignore in restricted environments
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

const DEFAULT_COUPLE_PROFILE: CoupleSnapshot = {
  account_name: "Alex & Camila",
  city: "São Paulo",
  neighborhood: "Campo Belo",
  transport: "carro",
  avoid_going_out_when_rain: true,
  max_drive_minutes: 30,
  search_radius_km: 15,
  members: [
    {
      full_name: "Alex",
      drinks_alcohol: false,
      smokes: false,
      interests: ["tecnologia", "cinema", "museus"],
      dislikes: ["lotação", "balada"],
      movie_genres: ["sci-fi", "drama", "thriller"],
      series_genres: ["drama", "suspense"],
      music_genres: ["indie", "jazz"],
      prefers_theater: true,
      likes_party: false,
      allergies: [],
      intolerances: [],
      food_dislikes: [],
    },
    {
      full_name: "Camila",
      drinks_alcohol: false,
      smokes: false,
      interests: ["gastronomia", "astrologia", "livros"],
      dislikes: ["barulho alto", "balada"],
      movie_genres: ["romance", "drama"],
      series_genres: ["drama", "comédia"],
      music_genres: ["mpb", "pop"],
      prefers_theater: true,
      likes_party: false,
      allergies: [],
      intolerances: [],
      food_dislikes: [],
    },
  ],
  preferences: {
    preferred_cuisines: ["italiana", "japonesa", "contemporânea"],
    avoided_cuisines: [],
    romantic_walk_types: ["jantar intimista", "cinema", "museu", "livraria + café"],
    preferred_dayparts: ["night"],
    preferred_activities: ["cinema", "restaurante", "exposição"],
    budget_range: "medium",
    alcohol_policy: "none_drink",
    avoids_outdoor_when_rain: true,
    favorite_restaurants: ["Lellis Trattoria", "Libertango", "Issho"],
    favorite_places: ["Livraria da Travessa", "MASP"],
    favorite_movies: ["Interstellar", "Parasita"],
    favorite_series: ["The Bear", "Succession"],
    wishlist: ["Theatro Municipal", "Planetário"],
    crowd_tolerance: "avoid",
    noise_tolerance: "low",
    onboarding_complete: false,
  },
  profile: {
    schema_version: "2",
    couple_profile_json: {
      dining: {
        dining_out: [{ name: "Lellis Trattoria" }, { name: "Libertango" }, { name: "Issho" }],
        likes: ["italiana", "japonesa"],
        favorite_bookstore: "Livraria da Travessa",
      },
      interests: {
        cinema: { favorite_titles: ["Interstellar", "Parasita"], favorite_style: ["sci-fi", "drama"] },
        series: ["The Bear", "Succession"],
        favorite_places: ["Livraria da Travessa", "MASP"],
      },
      culture: {
        wishlist: ["Theatro Municipal", "Planetário"],
        liked_exhibitions: ["MASP"],
      },
      lifestyle: {
        avoid_crowded_places: true,
        avoid_bar: true,
        preferences: ["romantic", "cinema", "museu"],
      },
      location: {
        city: "São Paulo",
        neighborhood: "Campo Belo",
        preferred_daypart: "night",
      },
    },
  },
};

export function getCoupleProfile(): CoupleSnapshot {
  return safeJsonParse(getStorage("local")?.getItem(COUPLE_PROFILE_KEY) || null, DEFAULT_COUPLE_PROFILE);
}

export function setCoupleProfile(profile: CoupleSnapshot) {
  getStorage("local")?.setItem(COUPLE_PROFILE_KEY, JSON.stringify(profile));
  notifyMLUpdate({ type: "profile_update" });
}

export function patchCoupleProfileLocal(patch: Partial<CoupleSnapshot>) {
  const current = getCoupleProfile();
  setCoupleProfile(buildCoupleProfileFromForm(patch, current));
}

// --- Saved Items ---

export function getSavedItems(): any[] {
  return safeJsonParse(getStorage("local")?.getItem("saved_items") || null, []);
}

export function setSavedItems(items: any[]) {
  getStorage("local")?.setItem("saved_items", JSON.stringify(items));
  notifyMLUpdate({ type: "saved_update" });
}

export function upsertSavedItem(item: any) {
  if (!item?.id) return;
  const current = getSavedItems();
  const exists = current.find((x: any) => x.id === item.id);
  if (exists) return;
  setSavedItems([{ ...item, saved_at: new Date().toISOString() }, ...current]);
}

export function removeSavedItem(id: string) {
  const current = getSavedItems();
  setSavedItems(current.filter((x: any) => x.id !== id));
}

export function isItemSaved(id: string): boolean {
  return getSavedItems().some((x: any) => x.id === id);
}

// --- Custom Ingested Items (Smart Web / Place Capture) ---

export function getCustomIngestedItems(): Recommendation[] {
  return safeJsonParse(getStorage("local")?.getItem(CUSTOM_ITEMS_KEY) || null, []);
}

export function addCustomIngestedItem(item: Recommendation) {
  if (!item?.id) return;
  const current = getCustomIngestedItems();
  const filtered = current.filter((x) => x.id !== item.id && x.title.toLowerCase() !== item.title.toLowerCase());
  const next = [item, ...filtered].slice(0, 60);
  getStorage("local")?.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(next));
  notifyMLUpdate({ type: "ingest", title: item.title, id: item.id });
}

export function removeCustomIngestedItem(id: string) {
  const current = getCustomIngestedItems();
  const next = current.filter((x) => x.id !== id);
  getStorage("local")?.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(next));
  notifyMLUpdate({ type: "remove_ingest", id });
}

// --- Agenda Items ---

export function getAgendaItems(): any[] {
  return safeJsonParse(getStorage("local")?.getItem("agenda_items") || null, []);
}

export function setAgendaItems(items: any[]) {
  getStorage("local")?.setItem("agenda_items", JSON.stringify(items));
}

export function upsertAgendaItem(item: any) {
  if (!item?.id) return;
  const current = getAgendaItems();
  if (current.find((x: any) => x.id === item.id)) return;
  const date =
    item?.start_time && typeof item.start_time === "string"
      ? item.start_time.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  setAgendaItems([{ ...item, date }, ...current]);
}

// --- Continual Learning Feedback History ---

export function getFeedbackHistory(): FeedbackEntry[] {
  return safeJsonParse(getStorage("local")?.getItem(FEEDBACK_KEY) || null, []);
}

export function removeFeedbackEntry(experienceId: string) {
  const current = getFeedbackHistory();
  const next = current.filter((entry) => entry.experience_id !== experienceId);
  getStorage("local")?.setItem(FEEDBACK_KEY, JSON.stringify(next));
  notifyMLUpdate({ type: "feedback_removed", id: experienceId });
}

export function clearFeedbackHistory() {
  getStorage("local")?.removeItem(FEEDBACK_KEY);
  notifyMLUpdate({ type: "feedback_reset" });
}

// --- Concierge Memory ---

export function getConciergeMemory(): string[] {
  return safeJsonParse(getStorage("local")?.getItem(CONCIERGE_MEMORY_KEY) || null, []);
}

export function setConciergeMemory(items: string[]) {
  getStorage("local")?.setItem(CONCIERGE_MEMORY_KEY, JSON.stringify(items));
}
