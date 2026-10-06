/**
 * Calcule la clé de journée (YYYY-MM-DD) d'une date dans le fuseau horaire du joueur,
 * pour aligner les compteurs `DailyUsage` sur le jour perçu par le joueur plutôt que UTC.
 */
export function getUsageDayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Impossible de calculer la journée pour le fuseau "${timeZone}"`);
  }

  return `${year}-${month}-${day}`;
}

/** Convertit une clé de journée (YYYY-MM-DD) en Date UTC minuit, pour la colonne `@db.Date`. */
export function usageDayKeyToDate(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}
