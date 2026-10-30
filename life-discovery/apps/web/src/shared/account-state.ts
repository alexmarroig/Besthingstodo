import type { CoupleSnapshot } from "@life/shared-types";

export type StateEntity = "saved" | "agenda" | "custom" | "feedback";
export type StateItem = Record<string, any>;
export type AccountState = {
  profile: CoupleSnapshot;
  saved: Record<string, StateItem>;
  agenda: Record<string, StateItem>;
  custom: Record<string, StateItem>;
  feedback: Record<string, StateItem>;
  memory: string[];
  importedLegacy: boolean;
};
export type StateOperation =
  | { id: string; kind: "upsert"; entity: StateEntity; key: string; value: StateItem }
  | { id: string; kind: "remove"; entity: StateEntity; key: string }
  | { id: string; kind: "profile"; value: Record<string, any> }
  | { id: string; kind: "memory"; value: string[] }
  | { id: string; kind: "clearFeedback" }
  | { id: string; kind: "import"; value: Partial<AccountState> };
export type StateEnvelope = { state: AccountState; version: number; acknowledged: string[] };
const entities = new Set(["saved", "agenda", "custom", "feedback"]);
const forbidden = new Set(["__proto__", "prototype", "constructor"]);

export function emptyAccountState(): AccountState {
  return {
    profile: {
      account_name: "Nosso casal", city: "São Paulo", neighborhood: "", transport: "car",
      avoid_going_out_when_rain: true, max_drive_minutes: 30, search_radius_km: 15,
      members: [{ full_name: "", interests: [], dislikes: [], movie_genres: [], series_genres: [] },
        { full_name: "", interests: [], dislikes: [], movie_genres: [], series_genres: [] }],
      preferences: { favorite_movies: [], favorite_series: [], favorite_restaurants: [], favorite_places: [],
        preferred_cuisines: [], preferred_activities: [], wishlist: [], onboarding_complete: false },
    },
    saved: {}, agenda: {}, custom: {}, feedback: {}, memory: [], importedLegacy: false,
  };
}

function safeJson(value: unknown, depth = 0): void {
  if (depth > 16) throw new Error("Dados muito profundos.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) { if (value.length > 2000) throw new Error("Lista muito grande."); for (const item of value) safeJson(item, depth + 1); return; }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) throw new Error("Dados inválidos.");
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) throw new Error("Campo inválido.");
    safeJson(child, depth + 1);
  }
}

function validateProfile(profile: any) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile) || "user_id" in profile) throw new Error("Perfil inválido.");
  for (const key of ["account_name", "city", "country", "transport", "email", "weekend_wake_time"]) {
    if (key in profile && typeof profile[key] !== "string") throw new Error("Campo de perfil inválido.");
  }
  for (const key of ["max_drive_minutes", "search_radius_km"]) if (key in profile && (typeof profile[key] !== "number" || profile[key] < 0)) throw new Error("Distância inválida.");
  if ("members" in profile) {
    if (!Array.isArray(profile.members) || profile.members.length !== 2) throw new Error("Membros inválidos.");
    for (const member of profile.members) {
      if (!member || typeof member !== "object" || Array.isArray(member) || typeof member.full_name !== "string") throw new Error("Membro inválido.");
      for (const key of ["interests", "dislikes", "movie_genres", "series_genres", "music_genres", "allergies", "intolerances", "food_dislikes"]) {
        if (key in member && (!Array.isArray(member[key]) || !member[key].every((x: unknown) => typeof x === "string"))) throw new Error("Preferências inválidas.");
      }
    }
  }
  if ("preferences" in profile) {
    const prefs = profile.preferences;
    if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) throw new Error("Preferências inválidas.");
    for (const [key, value] of Object.entries(prefs)) {
      if (key.startsWith("favorite_") || key.startsWith("preferred_") || key.startsWith("avoided_") || ["wishlist", "romantic_walk_types", "food_restrictions"].includes(key)) {
        if (!Array.isArray(value) || !value.every(x => typeof x === "string")) throw new Error("Lista de preferências inválida.");
      }
    }
  }
}

export function parseStatePatch(value: unknown): { baseVersion: number; operations: StateOperation[] } {
  safeJson(value);
  const patch = value as any;
  if (Object.keys(patch).some(k => !["baseVersion", "operations"].includes(k)) ||
      !Number.isSafeInteger(patch.baseVersion) || patch.baseVersion < 0 ||
      !Array.isArray(patch.operations) || !patch.operations.length || patch.operations.length > 100 ||
      JSON.stringify(patch).length > 512_000) throw new Error("Alterações inválidas ou muito grandes.");
  const ids = new Set<string>();
  for (const op of patch.operations) {
    if (!op || typeof op.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(op.id) || ids.has(op.id)) throw new Error("Identificador de alteração inválido.");
    ids.add(op.id);
    if (op.kind === "upsert" || op.kind === "remove") {
      if (!entities.has(op.entity) || typeof op.key !== "string" || !op.key || op.key.length > 200 || forbidden.has(op.key)) throw new Error("Item inválido.");
      if (op.kind === "upsert" && (!op.value || Array.isArray(op.value) || typeof op.value !== "object")) throw new Error("Item inválido.");
    } else if (op.kind === "profile") {
      validateProfile(op.value);
    } else if (op.kind === "memory") {
      if (!Array.isArray(op.value) || op.value.length > 100 || !op.value.every((x: any) => typeof x === "string" && x.length <= 2000)) throw new Error("Memória inválida.");
    } else if (op.kind === "import") {
      if (!op.value || typeof op.value !== "object" || Array.isArray(op.value) || op.value.profile?.user_id) throw new Error("Importação inválida.");
      if (op.value.profile) validateProfile(op.value.profile);
      if (op.value.memory && (!Array.isArray(op.value.memory) || !op.value.memory.every((x: unknown) => typeof x === "string"))) throw new Error("Memória inválida.");
      for (const entity of entities) if (entity in op.value) {
        const rows = op.value[entity];
        if (!rows || typeof rows !== "object" || Array.isArray(rows) || Object.entries(rows).some(([key, row]) => forbidden.has(key) || !row || typeof row !== "object" || Array.isArray(row))) throw new Error("Importação inválida.");
      }
    } else if (op.kind !== "clearFeedback") throw new Error("Operação inválida.");
    if (Object.keys(op).some(k => !["id", "kind", "entity", "key", "value"].includes(k))) throw new Error("Campo de operação inválido.");
  }
  return patch;
}

export function mergeProfile(current: Record<string, any>, patch: Record<string, any>): Record<string, any> {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (forbidden.has(key) || key === "user_id") continue;
    next[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeProfile(current[key] && typeof current[key] === "object" ? current[key] : {}, value) : value;
  }
  return next;
}

export function mergeImportedState(current: AccountState, legacy: Partial<AccountState>): AccountState {
  if (current.importedLegacy) return current;
  const next = structuredClone(current);
  if (legacy.profile) {
    // Import only into unedited profile fields; account data wins on a populated account.
    next.profile = (sameJson(current.profile, emptyAccountState().profile)
      ? mergeProfile(current.profile, legacy.profile) : current.profile) as CoupleSnapshot;
  }
  for (const entity of entities as Set<StateEntity>) next[entity] = { ...(legacy[entity] || {}), ...current[entity] };
  if (!next.memory.length && Array.isArray(legacy.memory)) next.memory = legacy.memory.filter(x => typeof x === "string").slice(-100);
  next.importedLegacy = true;
  return capFeedback(next);
}

function sameJson(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
}

function capFeedback(state: AccountState): AccountState {
  state.feedback = Object.fromEntries(Object.entries(state.feedback).sort((a, b) =>
    String(b[1].timestamp || "").localeCompare(String(a[1].timestamp || ""))).slice(0, 300));
  return state;
}

export function applyStateOperations(current: AccountState, operations: StateOperation[]): AccountState {
  let state = structuredClone(current);
  for (const op of operations) {
    if (op.kind === "upsert") state[op.entity][op.key] = { ...op.value, id: op.key };
    else if (op.kind === "remove") delete state[op.entity][op.key];
    else if (op.kind === "profile") state.profile = mergeProfile(state.profile, op.value) as CoupleSnapshot;
    else if (op.kind === "memory") state.memory = [...op.value];
    else if (op.kind === "clearFeedback") state.feedback = {};
    else if (op.kind === "import") state = mergeImportedState(state, op.value);
  }
  return capFeedback(state);
}

export function profileChanges(previous: Record<string, any>, next: Record<string, any>): Record<string, any> {
  const patch: Record<string, any> = {};
  for (const [key, value] of Object.entries(next)) {
    if (key === "user_id" || value === undefined || JSON.stringify(previous[key]) === JSON.stringify(value)) continue;
    patch[key] = value && typeof value === "object" && !Array.isArray(value)
      ? profileChanges(previous[key] || {}, value) : value;
  }
  return patch;
}
