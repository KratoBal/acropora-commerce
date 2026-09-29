import {
  GlsPickupPointsService,
  glsPointAddress,
  glsPointAllowed,
} from "../gls-pickup-points";
import { glsPointOptionOf, glsPointOptions } from "../../workflows/utils/shipping-option-roles";

// Shaped like the measured hu.json items (2026-09-29).
const pont = (over: Record<string, unknown> = {}) => ({
  id: "1011-ALPHAZOOKF",
  goldId: 1062,
  name: "Alpha Zoo Batthyány tér",
  contact: { countryCode: "HU", postalCode: "1011", city: "BUDAPEST I. KERÜLET", address: "Batthyány tér 5 -6" },
  location: [47.5062, 19.038],
  hours: [],
  features: ["acceptsCard", "pickup", "delivery"],
  type: "parcel-shop",
  ...over,
});

const DIRECTORY = {
  items: [
    pont(),
    pont({ id: "2100-LOCKER", goldId: 2, name: "GLS automata Gödöllő", type: "parcel-locker", contact: { postalCode: "2100", city: "Gödöllő", address: "Fő tér 1." }, lockerSaturation: "lowVolume" }),
    pont({ id: "2100-OOO", goldId: 3, name: "Rossz automata", type: "parcel-locker", contact: { postalCode: "2100", city: "Gödöllő", address: "Piac 2." }, lockerSaturation: "outOfOrder" }),
    pont({ id: "9999-NODELIVERY", goldId: 4, features: ["pickup"] }),
    pont({ id: "8888-ODD", goldId: 5, type: "valami-mas" }),
    { id: "hibas" },
  ],
};

const service = (payload: unknown = DIRECTORY, now = () => 1000) => {
  const fetcher = jest.fn(async () => ({ ok: true, json: async () => payload }));
  return { fetcher, gls: new GlsPickupPointsService({ fetcher, now }) };
};

/**
 * THE GLS DIRECTORY (P4). What must fail: an out-of-order locker, a point
 * without delivery, an unknown type or a malformed row offered to a customer;
 * a heavy parcel offered a locker; the directory fetched on every request;
 * a broken fetch looking like an empty but working list.
 */
describe("the GLS pickup-point directory", () => {
  it("keeps only the points that can take a parcel, with both GLS ids", async () => {
    const { gls } = service();
    const answer = await gls.getAvailability();
    expect(answer.available && answer.pickup_points.map((p) => p.id)).toEqual([
      "1011-ALPHAZOOKF",
      "2100-LOCKER",
    ]);
    expect(answer.available && answer.pickup_points[0]).toEqual({
      id: "1011-ALPHAZOOKF",
      gold_id: 1062,
      name: "Alpha Zoo Batthyány tér",
      zip: "1011",
      city: "BUDAPEST I. KERÜLET",
      address: "Batthyány tér 5 -6",
      type: "parcel-shop",
    });
  });

  it("reads the list once a day", async () => {
    let t = 1000;
    const { gls, fetcher } = service(DIRECTORY, () => t);
    await gls.getAvailability();
    await gls.getAvailability();
    expect(fetcher).toHaveBeenCalledTimes(1);
    t += 24 * 60 * 60 * 1000 + 1;
    await gls.getAvailability();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("a failed or empty list is unavailable, not an empty list", async () => {
    const failing = new GlsPickupPointsService({ fetcher: async () => Promise.reject(new Error("net")) });
    expect(await failing.getAvailability()).toEqual({ available: false, reason: "service_unavailable" });
    expect(await service({ items: [] }).gls.getAvailability()).toEqual({ available: false, reason: "service_unavailable" });
  });

  it("heavy goods search only parcel shops; the ordinary option both kinds", async () => {
    const { gls } = service();
    const both = await gls.searchPickupPoints({ query: "gödöllő", heavy: false });
    expect(both.available && both.pickup_points.map((p) => p.id)).toEqual(["2100-LOCKER"]);
    const heavy = await gls.searchPickupPoints({ query: "2100", heavy: true });
    expect(heavy.available && heavy.pickup_points).toEqual([]);
    const heavyShop = await gls.searchPickupPoints({ query: "1011", heavy: true });
    expect(heavyShop.available && heavyShop.pickup_points.map((p) => p.id)).toEqual(["1011-ALPHAZOOKF"]);
  });

  it("the rule and the address in one place", async () => {
    const { gls } = service();
    const locker = (await gls.findPickupPoint("2100-LOCKER"))!;
    expect(glsPointAllowed(locker, true)).toBe(false);
    expect(glsPointAllowed(locker, false)).toBe(true);
    expect(glsPointAddress(locker)).toBe("2100 Gödöllő, Fő tér 1.");
    expect(await gls.findPickupPoint("2100-OOO")).toBeNull();
  });
});

describe("which GLS options go to a pickup point", () => {
  const env = { ACROPORA_SO_GLS_POINT: "so_pont", ACROPORA_SO_GLS_HEAVY_POINT: "so_nehez" } as unknown as NodeJS.ProcessEnv;

  it("the point option and the heavy point option, by binding; home delivery is not one", () => {
    expect(glsPointOptions(env)).toEqual([
      { option_id: "so_pont", heavy: false },
      { option_id: "so_nehez", heavy: true },
    ]);
    expect(glsPointOptionOf("so_nehez", env)).toEqual({ heavy: true });
    expect(glsPointOptionOf("so_01M0K6P7P1Z9XQQANXE2FRATR7", env)).toBeNull();
  });
});
