import middlewares from "../../../../middlewares";
import { StoreGetFoxpostPickupPointsParams } from "../validators";

const directory = [
  {
    operator_id: "HU1",
    name: "FOXPOST A-BOX Gödöllő",
    address: "2100 Gödöllő, Fő tér 1.",
    zip: "2100",
    city: "Gödöllő",
    open: {},
    geolat: 47.6,
    geolng: 19.3,
  },
  {
    operator_id: "HU2",
    name: "FOXPOST A-BOX Budapest",
    address: "1111 Budapest, Fő utca 1.",
    zip: "1111",
    city: "Budapest",
    open: {},
    geolat: 47.5,
    geolng: 19.1,
  },
];

const savedEnv = { ...process.env };
const savedFetch = global.fetch;
afterAll(() => {
  process.env = savedEnv;
  global.fetch = savedFetch;
});

// The route builds its service at import time, from process.env and fetch.
const loadRoute = async (configured: boolean) => {
  jest.resetModules();
  process.env.FOXPOST_API_USER = configured ? "u" : "";
  process.env.FOXPOST_API_PASSWORD = configured ? "p" : "";
  process.env.FOXPOST_API_KEY = configured ? "k" : "";
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => directory,
  })) as never;
  return (await import("../route")).GET;
};

const call = async (
  GET: Awaited<ReturnType<typeof loadRoute>>,
  validatedQuery: Record<string, unknown>,
) => {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
    },
  };
  await GET({ validatedQuery } as never, res as never);
  return res;
};

describe("GET /store/foxpost/pickup-points", () => {
  it("with q answers the matches and their count", async () => {
    const res = await call(await loadRoute(true), { q: "godollo", limit: 20 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      available: true,
      count: 1,
      pickup_points: [{ id: "HU1", zip: "2100", city: "Gödöllő" }],
    });
  });

  it("without q answers the whole directory, as before", async () => {
    const res = await call(await loadRoute(true), { limit: 20 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ available: true });
    expect((res.body as { count?: number }).count).toBeUndefined();
    expect(
      (res.body as { pickup_points: unknown[] }).pickup_points,
    ).toHaveLength(2);
  });

  it("an unconfigured Foxpost is 200 and unavailable, not an error", async () => {
    const res = await call(await loadRoute(false), { q: "budapest", limit: 20 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      available: false,
      reason: "missing_configuration",
    });
  });
});

describe("the query of the pickup-point search", () => {
  it("defaults the limit to 20 and caps it at 50", () => {
    expect(StoreGetFoxpostPickupPointsParams.parse({ q: "x" }).limit).toBe(20);
    expect(
      StoreGetFoxpostPickupPointsParams.safeParse({ q: "x", limit: "51" })
        .success,
    ).toBe(false);
    expect(
      StoreGetFoxpostPickupPointsParams.safeParse({ q: "x", limit: "0" })
        .success,
    ).toBe(false);
  });

  it("refuses an over-long search and unknown fields", () => {
    expect(
      StoreGetFoxpostPickupPointsParams.safeParse({ q: "x".repeat(101) })
        .success,
    ).toBe(false);
    expect(
      StoreGetFoxpostPickupPointsParams.safeParse({ q: "x", city: "y" })
        .success,
    ).toBe(false);
  });

  it("is validated on this route", () => {
    // defineMiddlewares turns `method` into `methods`
    const route = middlewares.routes?.find(
      (r) =>
        r.matcher === "/store/foxpost/pickup-points" &&
        (r as { methods?: string[] }).methods?.includes("GET"),
    );
    expect(route?.middlewares).toHaveLength(1);
  });
});
