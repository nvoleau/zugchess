import { describe, expect, it } from "vitest";
import { getUsageDayKey, usageDayKeyToDate } from "../src/entitlement/usageDay.js";

describe("getUsageDayKey", () => {
  it("calcule la journée dans le fuseau du joueur", () => {
    // 23h50 à Paris le 5 octobre = 21h50 UTC, mais toujours le 5 octobre côté joueur.
    const date = new Date("2026-10-05T21:50:00.000Z");
    expect(getUsageDayKey(date, "Europe/Paris")).toBe("2026-10-05");
  });

  it("peut faire basculer le jour par rapport à UTC selon le fuseau", () => {
    // 21h50 UTC = 22h50 à Paris (CEST, UTC+2 en octobre) mais 16h50 à New York (UTC-4) : même jour calendaire ici.
    const date = new Date("2026-10-05T21:50:00.000Z");
    expect(getUsageDayKey(date, "Pacific/Kiritimati")).toBe("2026-10-06");
  });

  it("lève une erreur pour un fuseau invalide", () => {
    expect(() => getUsageDayKey(new Date(), "Not/AZone")).toThrow();
  });
});

describe("usageDayKeyToDate", () => {
  it("reconstruit une Date UTC minuit à partir de la clé", () => {
    expect(usageDayKeyToDate("2026-10-05").toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });
});
