import middlewares from "../../../../middlewares";
import { StoreGetGlsPickupPointsParams } from "../validators";

const savedEnv = { ...process.env };
const savedFetch = global.fetch;
afterAll(() => {
  process.env = savedEnv;
  global.fetch = savedFetch;
});

const items = [
  { id: "SHOP", goldId: 1, name: "Bolt", contact: { postalCode: "2100", city: "Gödöllő", address: "Fő tér 1." }, features: ["delivery"], type: "parcel-shop" },
  { id: "LOCKER", goldId: 2, name: "Automata", contact: { postalCode: "2100", city: "Gödöllő", address: "Piac 1." }, features: ["delivery"], type: "parcel-locker" },
  { id: "BROKEN", goldId: 3, name: "Rossz automata", contact: { postalCode: "2100", city: "Gödöllő", address: "Piac 2." }, features: ["delivery"], type: "parcel-locker", lockerSaturation: "outOfOrder" },
];

// The routes build their service at import time, from fetch and the env.
const load = async (fetchOk = true) => {
  jest.resetModules();
  process.env.ACROPORA_SO_GLS_POINT = "so_pont";
  process.env.ACROPORA_SO_GLS_HEAVY_POINT = "so_nehez";
  process.env.ACROPORA_SO_GLS_HOME = "so_haz";
  process.env.ACROPORA_SO_GLS_HEAVY_HOME = "so_nehez_haz";
  global.fetch = jest.fn(async () =>
    fetchOk ? { ok: true, json: async () => ({ items }) } : Promise.reject(new Error("net")),
  ) as never;
  return {
    search: (await import("../route")).GET,
    options: (await import("../../route")).GET,
  };
};

const call = async (GET: (req: never, res: never) => Promise<void>, validatedQuery: object = {}) => {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(b: unknown) { this.body = b; },
  };
  await GET({ validatedQuery } as never, res as never);
  return res;
};

/**
 * THE GLS ROUTES (P4). What must fail: the checkout not learning which options
 * need a GLS point; the heavy rule taken from anything but the option; a search
 * for an option that is not a GLS point one; a broken list answering 200.
 */
describe("GET /store/gls and /store/gls/pickup-points", () => {
  it("names the point options, the home ones, and which are heavy", async () => {
    const { options } = await load();
    expect((await call(options)).body).toEqual({
      options: [
        { option_id: "so_pont", heavy: false },
        { option_id: "so_nehez", heavy: true },
      ],
      home_options: [
        { option_id: "so_haz", heavy: false },
        { option_id: "so_nehez_haz", heavy: true },
      ],
    });
  });

  it("the heavy option searches parcel shops only; the ordinary one both", async () => {
    const { search } = await load();
    const ordinary = await call(search, { q: "2100", option_id: "so_pont", limit: 20 });
    expect((ordinary.body as { pickup_points: { id: string }[] }).pickup_points.map((p) => p.id)).toEqual(["LOCKER", "SHOP"].sort());
    const heavy = await call(search, { q: "2100", option_id: "so_nehez", limit: 20 });
    expect((heavy.body as { pickup_points: { id: string }[] }).pickup_points.map((p) => p.id)).toEqual(["SHOP"]);
  });

  /*
    THE GREYED-OUT LOCKER (the GLS prompt, point 6): only a checkout that asks
    gets it, flagged. What must fail: today's checkout (which would let it be
    clicked) getting it; the asking one not.
  */
  it("an out-of-order locker comes only when asked, flagged", async () => {
    const { search } = await load();
    const ids = (body: unknown) => (body as { pickup_points: { id: string }[] }).pickup_points.map((p) => p.id).sort();
    const plain = await call(search, { q: "2100", option_id: "so_pont", limit: 20, include_unavailable: "false" });
    expect(ids(plain.body)).toEqual(["LOCKER", "SHOP"]);
    const asked = await call(search, { q: "2100", option_id: "so_pont", limit: 20, include_unavailable: "true" });
    expect(ids(asked.body)).toEqual(["BROKEN", "LOCKER", "SHOP"]);
    const broken = (asked.body as { pickup_points: { id: string; locker_saturation: string }[] }).pickup_points.find(
      (p) => p.id === "BROKEN",
    );
    expect(broken?.locker_saturation).toBe("outOfOrder");
    expect(StoreGetGlsPickupPointsParams.parse({ q: "x", option_id: "y" }).include_unavailable).toBe("false");
    expect(StoreGetGlsPickupPointsParams.safeParse({ q: "x", option_id: "y", include_unavailable: "igen" }).success).toBe(false);
  });

  it("refuses an option that is not a GLS point option", async () => {
    const { search } = await load();
    await expect(call(search, { q: "2100", option_id: "so_mas", limit: 20 })).rejects.toThrow(
      "does not go to a GLS pickup point",
    );
  });

  it("an unreachable list is 503", async () => {
    const { search } = await load(false);
    expect((await call(search, { q: "2100", option_id: "so_pont", limit: 20 })).statusCode).toBe(503);
  });

  it("the query needs a search and an option, caps the limit, and takes nothing else", () => {
    expect(StoreGetGlsPickupPointsParams.safeParse({ option_id: "x" }).success).toBe(false);
    expect(StoreGetGlsPickupPointsParams.safeParse({ q: "x" }).success).toBe(false);
    expect(StoreGetGlsPickupPointsParams.safeParse({ q: "x", option_id: "y", limit: "51" }).success).toBe(false);
    expect(StoreGetGlsPickupPointsParams.safeParse({ q: "x", option_id: "y", heavy: "false" }).success).toBe(false);
    expect(StoreGetGlsPickupPointsParams.parse({ q: "x", option_id: "y" }).limit).toBe(20);
  });

  it("is validated on its route", () => {
    const route = middlewares.routes?.find(
      (r) => r.matcher === "/store/gls/pickup-points" && (r as { methods?: string[] }).methods?.includes("GET"),
    );
    expect(route?.middlewares).toHaveLength(1);
  });
});
