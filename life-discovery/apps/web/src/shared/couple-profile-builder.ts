import type { CoupleMember, CouplePreferences, CoupleSnapshot } from "@life/shared-types";

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function mergeMembers(current: CoupleMember[] = [], incoming: CoupleMember[] = []) {
  return [0, 1].map((idx) => ({
    ...(current[idx] || { full_name: idx === 0 ? "Pessoa 1" : "Pessoa 2" }),
    ...(incoming[idx] || {}),
    interests: incoming[idx]?.interests ?? current[idx]?.interests ?? [],
    dislikes: incoming[idx]?.dislikes ?? current[idx]?.dislikes ?? [],
    movie_genres: incoming[idx]?.movie_genres ?? current[idx]?.movie_genres ?? [],
    series_genres: incoming[idx]?.series_genres ?? current[idx]?.series_genres ?? [],
    music_genres: incoming[idx]?.music_genres ?? current[idx]?.music_genres ?? [],
    allergies: incoming[idx]?.allergies ?? current[idx]?.allergies ?? [],
    intolerances: incoming[idx]?.intolerances ?? current[idx]?.intolerances ?? [],
    food_dislikes: incoming[idx]?.food_dislikes ?? current[idx]?.food_dislikes ?? [],
  })) as CoupleMember[];
}

function alcoholToPreference(members: CoupleMember[], policy?: CouplePreferences["alcohol_policy"]) {
  if (policy) return policy;
  const drinkers = members.filter((member) => member.drinks_alcohol).length;
  if (drinkers === 0) return "none_drink";
  if (drinkers === members.length) return "both_drink";
  return "one_drinks";
}

export function buildCoupleProfileJson(snapshot: CoupleSnapshot) {
  const preferences = snapshot.preferences || {};
  const members = snapshot.members || [];
  const existing = snapshot.profile?.couple_profile_json || {};

  const favoriteRestaurants = uniqueStrings([
    ...(preferences.favorite_restaurants || []),
    ...((existing.dining?.dining_out as Array<{ name?: string }>) || []).map((row) => row.name),
  ]);

  const favoriteMovies = uniqueStrings([
    ...(preferences.favorite_movies || []),
    ...((existing.interests?.cinema?.favorite_titles as string[]) || []),
  ]);

  const favoriteSeries = uniqueStrings([
    ...(preferences.favorite_series || []),
    ...((existing.interests?.series as string[]) || []),
  ]);

  const favoritePlaces = uniqueStrings([
    ...(preferences.favorite_places || []),
    ...((existing.interests?.favorite_places as string[]) || []),
  ]);

  const wishlist = uniqueStrings([...(preferences.wishlist || []), ...((existing.culture?.wishlist as string[]) || [])]);

  const memberTopics = members.flatMap((member) => [
    ...(member.interests || []),
    ...(member.movie_genres || []),
    ...(member.series_genres || []),
    ...(member.music_genres || []),
  ]);

  const restrictions = uniqueStrings([
    ...(preferences.food_restrictions || []),
    ...members.flatMap((member) => [...(member.allergies || []), ...(member.intolerances || []), ...(member.food_dislikes || [])]),
    ...((existing.dining?.restrictions as string[]) || []),
  ]);

  const avoidCrowded =
    preferences.crowd_tolerance === "avoid" ||
    members.some((member) => (member.dislikes || []).some((item) => /lota|crowd|barulho|balada/i.test(item)));

  return {
    schema_version: "2",
    location: {
      city: snapshot.city,
      neighborhood: snapshot.neighborhood,
      preferred_neighborhoods: uniqueStrings([
        ...(preferences.preferred_neighborhoods || []),
        ...((existing.location?.preferred_neighborhoods as string[]) || []),
      ]),
      transport: snapshot.transport,
      max_drive_minutes: snapshot.max_drive_minutes,
      avoid_going_out_when_rain: snapshot.avoid_going_out_when_rain ?? preferences.avoids_outdoor_when_rain,
      weekend_wake_time: snapshot.weekend_wake_time,
      preferred_daypart: preferences.preferred_dayparts?.[0] || existing.location?.preferred_daypart || "night",
    },
    lifestyle: {
      avoid_crowded_places: avoidCrowded,
      avoid_bar: members.some((member) => !member.likes_party),
      avoid_nightclub: members.some((member) => !member.likes_party),
      preferences: uniqueStrings([
        preferences.mood,
        preferences.date_goal,
        preferences.budget_range,
        ...(preferences.preferred_activities || []),
        ...(preferences.romantic_walk_types || []),
        ...memberTopics,
      ]),
      pace: preferences.planning_style || existing.lifestyle?.pace || "balanced",
      sensory_limits: restrictions,
    },
    interests: {
      topics: uniqueStrings([...memberTopics, ...((existing.interests?.topics as string[]) || [])]),
      cinema: {
        favorite_titles: favoriteMovies,
        favorite_style: uniqueStrings(members.flatMap((member) => member.movie_genres || [])),
      },
      series: favoriteSeries,
      favorite_places: favoritePlaces,
    },
    dining: {
      dining_out: favoriteRestaurants.map((name) => ({ name })),
      likes: uniqueStrings([...(preferences.preferred_cuisines || []), ...favoritePlaces]),
      restrictions,
      alcohol_preference:
        preferences.alcohol_policy === "none_drink"
          ? "avoid"
          : preferences.alcohol_policy === "both_drink"
            ? "like"
            : "social",
      favorite_bookstore: favoritePlaces.find((place) => /livraria|bookstore/i.test(place)) || existing.dining?.favorite_bookstore,
    },
    culture: {
      wishlist,
      liked_exhibitions: uniqueStrings([
        ...favoritePlaces.filter((place) => /museu|masp|ims|expos/i.test(place)),
        ...((existing.culture?.liked_exhibitions as string[]) || []),
      ]),
    },
    accessibility: {
      notes: restrictions,
      noise_tolerance: preferences.noise_tolerance || existing.accessibility?.noise_tolerance || "medium",
    },
    relationship: {
      stage: existing.relationship?.stage || "steady",
      cadence: existing.relationship?.cadence || "weekly",
    },
  };
}

export function buildCoupleProfileFromForm(input: Partial<CoupleSnapshot>, current?: CoupleSnapshot): CoupleSnapshot {
  const base = current || ({} as CoupleSnapshot);
  const members = mergeMembers(base.members, input.members || base.members);
  const preferences: CouplePreferences = {
    ...(base.preferences || {}),
    ...(input.preferences || {}),
    alcohol_policy: alcoholToPreference(members, input.preferences?.alcohol_policy ?? base.preferences?.alcohol_policy),
    avoids_outdoor_when_rain:
      input.avoid_going_out_when_rain ??
      input.preferences?.avoids_outdoor_when_rain ??
      base.avoid_going_out_when_rain ??
      base.preferences?.avoids_outdoor_when_rain,
  };

  const merged: CoupleSnapshot = {
    ...base,
    ...input,
    account_name:
      input.account_name ||
      base.account_name ||
      `${members[0]?.full_name || "Pessoa 1"} & ${members[1]?.full_name || "Pessoa 2"}`,
    city: input.city || base.city || "São Paulo",
    neighborhood: input.neighborhood ?? base.neighborhood ?? "Campo Belo",
    transport: input.transport || base.transport || "car",
    max_drive_minutes: Number(input.max_drive_minutes ?? base.max_drive_minutes ?? 40),
    search_radius_km: Number(input.search_radius_km ?? base.search_radius_km ?? 10),
    avoid_going_out_when_rain: input.avoid_going_out_when_rain ?? base.avoid_going_out_when_rain ?? true,
    weekend_wake_time: input.weekend_wake_time || base.weekend_wake_time,
    members,
    preferences,
    profile: {
      schema_version: "2",
      couple_profile_json: buildCoupleProfileJson({
        ...base,
        ...input,
        members,
        preferences,
      }),
    },
  };

  return merged;
}

export function addFavoriteRestaurant(snapshot: CoupleSnapshot, name: string): CoupleSnapshot {
  const trimmed = name.trim();
  if (!trimmed) return snapshot;
  return buildCoupleProfileFromForm(
    {
      preferences: {
        ...(snapshot.preferences || {}),
        favorite_restaurants: uniqueStrings([...(snapshot.preferences?.favorite_restaurants || []), trimmed]),
      },
    },
    snapshot
  );
}
