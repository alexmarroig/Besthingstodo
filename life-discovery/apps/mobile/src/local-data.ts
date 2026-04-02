import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Recommendation } from "@life/shared-types";

import {
  getAgendaItems,
  getOnboardingDraft,
  getSavedItems,
  removeAgendaItem,
  removeSavedItem,
  setOnboardingDraft,
  updateAgendaNote,
  updateSavedCollection,
  upsertAgendaItem,
  upsertSavedItem
} from "./storage";
import { OnboardingDraft, defaultOnboardingDraft } from "./onboarding";

export const localKeys = {
  saved: ["local-saved"],
  agenda: ["local-agenda"],
  onboarding: ["local-onboarding"]
} as const;

export function useSavedItems() {
  return useQuery({
    queryKey: localKeys.saved,
    queryFn: getSavedItems
  });
}

export function useAgendaItems() {
  return useQuery({
    queryKey: localKeys.agenda,
    queryFn: getAgendaItems
  });
}

export function useOnboardingDraft() {
  return useQuery({
    queryKey: localKeys.onboarding,
    queryFn: async () => ({
      ...defaultOnboardingDraft,
      ...(await getOnboardingDraft<OnboardingDraft>(defaultOnboardingDraft))
    })
  });
}

export function useLocalActions() {
  const queryClient = useQueryClient();

  return {
    saveItem: async (item: Recommendation, collection?: string) => {
      await upsertSavedItem(item, collection);
      await queryClient.invalidateQueries({ queryKey: localKeys.saved });
    },
    removeSaved: async (id: string) => {
      await removeSavedItem(id);
      await queryClient.invalidateQueries({ queryKey: localKeys.saved });
    },
    moveSaved: async (id: string, collection: string) => {
      await updateSavedCollection(id, collection);
      await queryClient.invalidateQueries({ queryKey: localKeys.saved });
    },
    addToAgenda: async (item: Recommendation, date?: string) => {
      await upsertAgendaItem(item, date);
      await queryClient.invalidateQueries({ queryKey: localKeys.agenda });
    },
    removeAgenda: async (id: string) => {
      await removeAgendaItem(id);
      await queryClient.invalidateQueries({ queryKey: localKeys.agenda });
    },
    setAgendaNote: async (id: string, note: string) => {
      await updateAgendaNote(id, note);
      await queryClient.invalidateQueries({ queryKey: localKeys.agenda });
    },
    saveOnboardingDraft: async (draft: OnboardingDraft) => {
      await setOnboardingDraft(draft);
      await queryClient.invalidateQueries({ queryKey: localKeys.onboarding });
    }
  };
}
