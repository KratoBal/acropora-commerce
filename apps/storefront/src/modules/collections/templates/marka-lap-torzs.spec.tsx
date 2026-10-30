import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  markaHandleAlapjan: vi.fn(),
  getCollectionByHandle: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))
vi.mock("@lib/data/brands", () => ({
  markaHandleAlapjan: mocks.markaHandleAlapjan,
}))
vi.mock("@lib/data/collections", () => ({
  getCollectionByHandle: mocks.getCollectionByHandle,
}))
vi.mock("@lib/data/products", () => ({ listProducts: vi.fn() }))
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))
vi.mock("@modules/collections/templates", () => ({
  default: () => null,
}))

import { markaLapTorzs } from "./marka-lap-torzs"

afterEach(() => vi.clearAllMocks())

const params = { handle: "aquamedic", countryCode: "hu" }

/**
 * A MARKAOLDAL GYUJTEMENYE (2026-10-30, teszt kirakat). MI PIROSIT: ha a
 * markaoldal ismet a marka handle-jen keresi a gyujtemenyt (az `aquamedic`
 * marka gyujtemenye `aqua-medic` handle-t visel, a lap 404 lett); ha a regi
 * gyujtemeny-ut (`/collections/{handle}`) is a marka-modulon at keres.
 */
describe("a markaoldal gyűjteménye", () => {
  it("a marka-modul gyűjtemény-handle-jén keres, nem a marka handle-jén", async () => {
    mocks.markaHandleAlapjan.mockResolvedValue({
      handle: "aquamedic",
      collection_handle: "aqua-medic",
    })
    mocks.getCollectionByHandle.mockResolvedValue({ id: "pcol_1" })
    await markaLapTorzs(params, {}, "/hu/marka/aquamedic", true)
    expect(mocks.getCollectionByHandle).toHaveBeenCalledWith("aqua-medic")
  })

  it("párosítás nélkül (nincs mező vagy null) a marka handle-jén keres", async () => {
    mocks.getCollectionByHandle.mockResolvedValue({ id: "pcol_1" })
    mocks.markaHandleAlapjan.mockResolvedValueOnce({ handle: "aquamedic" })
    await markaLapTorzs(params, {}, "/hu/marka/aquamedic", true)
    mocks.markaHandleAlapjan.mockResolvedValueOnce({
      handle: "aquamedic",
      collection_handle: null,
    })
    await markaLapTorzs(params, {}, "/hu/marka/aquamedic", true)
    mocks.markaHandleAlapjan.mockResolvedValueOnce(null)
    await markaLapTorzs(params, {}, "/hu/marka/aquamedic", true)
    expect(mocks.getCollectionByHandle.mock.calls).toEqual([
      ["aquamedic"],
      ["aquamedic"],
      ["aquamedic"],
    ])
  })

  it("a regi gyűjtemény-út a handle-t gyűjteményként veszi, a márkát nem kérdezi", async () => {
    mocks.getCollectionByHandle.mockResolvedValue({ id: "pcol_1" })
    await markaLapTorzs({ handle: "aqua-medic", countryCode: "hu" }, {})
    expect(mocks.markaHandleAlapjan).not.toHaveBeenCalled()
    expect(mocks.getCollectionByHandle).toHaveBeenCalledWith("aqua-medic")
  })

  it("ha a gyűjtemény így sem létezik, 404", async () => {
    mocks.markaHandleAlapjan.mockResolvedValue({
      handle: "aquamedic",
      collection_handle: "nincs-ilyen",
    })
    mocks.getCollectionByHandle.mockResolvedValue(null)
    await expect(
      markaLapTorzs(params, {}, "/hu/marka/aquamedic", true),
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
