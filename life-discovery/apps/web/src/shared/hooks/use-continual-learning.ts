"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CoupleSnapshot, ExperienceContext } from "@life/shared-types";
import { computeCoupleMLInsights } from "@/features/catalog/curation";
import {
  clearFeedbackHistory,
  getFeedbackHistory,
  ML_UPDATE_EVENT,
  removeFeedbackEntry,
  type FeedbackEntry,
} from "@/shared/storage";

export type MLToastMessage = {
  id: string;
  text: string;
  type: string;
};

const ACTION_MESSAGE_MAP: Record<string, string> = {
  like: "Afinidade aumentada — priorizando experiências parecidas",
  favorite: "Favorito registrado no núcleo neural do casal",
  save: "Salvo na coleção — calibrando recomendações futuras",
  dislike: "Padrão ocultado — reduzindo itens similares no feed",
  skip: "Ajustando prioridade para outro momento",
  ingest: "Nova experiência capturada e integrada ao motor de IA",
  feedback_reset: "Memória de aprendizado contínuo reiniciada",
};

export function useContinualLearning(
  couple?: CoupleSnapshot | null,
  context?: ExperienceContext | null
) {
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState<MLToastMessage | null>(null);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setVersion((v) => v + 1);
      const custom = event as CustomEvent<{ type?: string; title?: string; id?: string }>;
      const actionType = custom.detail?.type || "";
      const title = custom.detail?.title;

      if (actionType && ACTION_MESSAGE_MAP[actionType]) {
        const baseText = ACTION_MESSAGE_MAP[actionType];
        const fullText = title ? `${baseText}: "${title}"` : baseText;
        setToast({
          id: `${Date.now()}-${Math.random()}`,
          text: fullText,
          type: actionType,
        });
      }
    };

    window.addEventListener(ML_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(ML_UPDATE_EVENT, handleUpdate);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const feedbackHistory: FeedbackEntry[] = useMemo(() => {
    void version;
    return getFeedbackHistory();
  }, [version]);

  const insights = useMemo(() => {
    void version;
    return computeCoupleMLInsights(couple, context, feedbackHistory);
  }, [couple, context, feedbackHistory, version]);

  const undoFeedback = useCallback((experienceId: string) => {
    removeFeedbackEntry(experienceId);
  }, []);

  const resetLearning = useCallback(() => {
    clearFeedbackHistory();
  }, []);

  return {
    version,
    feedbackHistory,
    insights,
    toast,
    dismissToast: () => setToast(null),
    undoFeedback,
    resetLearning,
  };
}
