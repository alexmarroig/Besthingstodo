"use client";

import { DEFAULT_USER_ID } from "./types";

const KEY = "life_user_id";

export function getUserId() {
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  return window.localStorage.getItem(KEY) || DEFAULT_USER_ID;
}

export function setUserId(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, userId);
}

export function getSavedItems(): any[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem("saved_items") || "[]");
  } catch {
    return [];
  }
}

export function setSavedItems(items: any[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("saved_items", JSON.stringify(items));
}

export function getAgendaItems(): any[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem("agenda_items") || "[]");
  } catch {
    return [];
  }
}

export function setAgendaItems(items: any[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("agenda_items", JSON.stringify(items));
}

