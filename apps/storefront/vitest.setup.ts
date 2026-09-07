/**
 * A DOM-ÁLLÍTÁSOK. E nélkül a `toBeDisabled` és társai nem léteznek, és a
 * hiányuk NEM néma: a futás elhasal. Ez a jó irány -- egy hiányzó állítás-készlet
 * ne úgy nézzen ki, mintha az állítás teljesült volna.
 */
import "@testing-library/jest-dom/vitest"
