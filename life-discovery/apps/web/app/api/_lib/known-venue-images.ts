/** Fotos reais curadas para venues editoriais — somente URLs verificadas. */
export const KNOWN_VENUE_IMAGES: Record<string, string> = {
  "sp-casa-porco":
    "https://res.cloudinary.com/the-infatuation/image/upload/c_fill,w_900,ar_4:3,g_center,f_auto/images/ACasaDoPorco_Interior_SandroPortaluri_SP_7_dbyfhg",
};

export function resolveKnownVenueImage(id?: string | null): string | null {
  if (!id) return null;
  return KNOWN_VENUE_IMAGES[id] || null;
}
