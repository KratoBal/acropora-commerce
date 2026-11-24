/**
 * A DOM-ÁLLÍTÁSOK. E nélkül a `toBeDisabled` és társai nem léteznek, és a
 * hiányuk NEM néma: a futás elhasal. Ez a jó irány -- egy hiányzó állítás-készlet
 * ne úgy nézzen ki, mintha az állítás teljesült volna.
 */
import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

/**
 * AZ OS-BEN ÁTÍRT VEVŐI SZÖVEGEK (kártya 7bfca4eb) A TESZTEKBEN ÜRESEK: a szerver-komponensek `vevoiForditas`-a a boltot kérdezné
 * (és a `cookies.ts` `server-only`, jsdom alatt nem töltődik be). Felülírás nélkül minden lap a szótár szövegét mutatja, vagyis
 * ugyanazt, amit eddig. A felülírás útját a saját specjei mérik (`vevoi-forditas.spec.ts`, `vevoi-szovegek.spec.ts`), ott
 * `vi.unmock` vagy `vi.mocked(vevoiSzovegek).mockResolvedValue` áll.
 */
vi.mock("@lib/data/vevoi-szovegek", () => ({
  vevoiSzovegek: vi.fn(async () => ({})),
}))
