import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_USER_ID, Recommendation } from "@life/shared-types";

const USER_ID_KEY = "life_mobile_user_id";
const TOKEN_KEY = "life_mobile_access_token";
const SAVED_KEY = "life_mobile_saved_items";
const AGENDA_KEY = "life_mobile_agenda_items";
const ONBOARDING_KEY = "life_mobile_onboarding";

export type StoredSavedItem = Recommendation & {
  saved_at: string;
  collection?: string;
};

export type StoredAgendaItem = Recommendation & {
  agenda_at: string;
  date: string;
  note?: string;
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function readSession() {
  const [[, userId], [, token]] = await AsyncStorage.multiGet([USER_ID_KEY, TOKEN_KEY]);
  return {
    userId: userId || DEFAULT_USER_ID,
    token: token || ""
  };
}

export async function writeSession(userId: string, token: string) {
  await AsyncStorage.multiSet([
    [USER_ID_KEY, userId],
    [TOKEN_KEY, token]
  ]);
}

export async function clearSessionStorage() {
  await AsyncStorage.multiRemove([USER_ID_KEY, TOKEN_KEY]);
}

export async function getSavedItems(): Promise<StoredSavedItem[]> {
  const raw = await AsyncStorage.getItem(SAVED_KEY);
  return safeParse(raw, []);
}

export async function setSavedItems(items: StoredSavedItem[]) {
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(items));
}

export async function upsertSavedItem(item: Recommendation, collection = "Favoritos") {
  const current = await getSavedItems();
  if (current.some((entry) => entry.id === item.id)) {
    return current;
  }

  const next: StoredSavedItem[] = [
    {
      ...item,
      collection,
      saved_at: new Date().toISOString()
    },
    ...current
  ];
  await setSavedItems(next);
  return next;
}

export async function removeSavedItem(id: string) {
  const current = await getSavedItems();
  const next = current.filter((item) => item.id !== id);
  await setSavedItems(next);
  return next;
}

export async function updateSavedCollection(id: string, collection: string) {
  const current = await getSavedItems();
  const next = current.map((item) => (item.id === id ? { ...item, collection } : item));
  await setSavedItems(next);
  return next;
}

export async function getAgendaItems(): Promise<StoredAgendaItem[]> {
  const raw = await AsyncStorage.getItem(AGENDA_KEY);
  return safeParse(raw, []);
}

export async function setAgendaItems(items: StoredAgendaItem[]) {
  await AsyncStorage.setItem(AGENDA_KEY, JSON.stringify(items));
}

export async function upsertAgendaItem(item: Recommendation, date?: string) {
  const current = await getAgendaItems();
  if (current.some((entry) => entry.id === item.id)) {
    return current;
  }

  const next: StoredAgendaItem[] = [
    {
      ...item,
      agenda_at: new Date().toISOString(),
      date:
        date ||
        (item.start_time && typeof item.start_time === "string"
          ? item.start_time.slice(0, 10)
          : new Date().toISOString().slice(0, 10))
    },
    ...current
  ];

  await setAgendaItems(next);
  return next;
}

export async function removeAgendaItem(id: string) {
  const current = await getAgendaItems();
  const next = current.filter((item) => item.id !== id);
  await setAgendaItems(next);
  return next;
}

export async function updateAgendaNote(id: string, note: string) {
  const current = await getAgendaItems();
  const next = current.map((item) => (item.id === id ? { ...item, note } : item));
  await setAgendaItems(next);
  return next;
}

export async function getOnboardingDraft<T>(fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  return safeParse(raw, fallback);
}

export async function setOnboardingDraft<T>(draft: T) {
  await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(draft));
}

export async function clearOnboardingDraft() {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}
