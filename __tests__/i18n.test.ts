import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  translate,
} from "@/lib/i18n";

describe("ReplyHalo i18n", () => {
  it("keeps English as the default locale", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
    expect(normalizeLocale("")).toBe("en");
    expect(normalizeLocale("pl")).toBe("en");
  });

  it("accepts Ukrainian locale", () => {
    expect(normalizeLocale("uk")).toBe("uk");
  });

  it("translates known interface text to Ukrainian", () => {
    expect(translate("uk", "Dashboard")).toBe("Головна");
    expect(translate("uk", "Settings")).toBe("Налаштування");
  });

  it("falls back to the English source text for missing translations", () => {
    const source = "A future ReplyHalo interface label";
    expect(translate("uk", source)).toBe(source);
    expect(translate("en", source)).toBe(source);
  });
});
