function sanitizeBaseUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const isLoopback = host === "localhost" || host === "127.0.0.1";
    const isDockerService = host.endsWith("-engine") || host.includes("concierge") || host.includes("profile");

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fallback;
    }

    if (!isLoopback && !isDockerService && host !== "api.openai.com") {
      return fallback;
    }

    return url.origin;
  } catch {
    return fallback;
  }
}

export const API_ENDPOINTS = {
  api: sanitizeBaseUrl(process.env.NEXT_PUBLIC_API_URL, "http://localhost:8000"),
  concierge: sanitizeBaseUrl(process.env.NEXT_PUBLIC_CONCIERGE_URL, "http://localhost:8007"),
  dateNight: sanitizeBaseUrl(process.env.NEXT_PUBLIC_DATE_NIGHT_URL, "http://localhost:8009"),
  onboarding: sanitizeBaseUrl(process.env.NEXT_PUBLIC_ONBOARDING_URL, "http://localhost:8008")
};
