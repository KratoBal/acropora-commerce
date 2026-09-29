import {
  FoxpostFetch,
  FoxpostPickupPointsService,
} from "../foxpost-pickup-points";

const configuredEnv = {
  FOXPOST_API_USER: "foxpost-user",
  FOXPOST_API_PASSWORD: "foxpost-password",
  FOXPOST_API_KEY: "foxpost-key",
};

const sourcePickupPoint = {
  operator_id: "HU1234",
  name: "FOXPOST A-BOX Test",
  address: "1111 Budapest, Teszt utca 1.",
  open: { hetfo: "00:00-24:00" },
  geolat: 47.5,
  geolng: 19.1,
};

const fetcherWith =
  (payload: unknown): FoxpostFetch =>
  async () => ({
    ok: true,
    json: async () => payload,
  });

describe("Foxpost pickup-point availability", () => {
  it("marks Foxpost unavailable without every configured API credential", async () => {
    const fetcher = jest.fn(fetcherWith([sourcePickupPoint]));
    const service = new FoxpostPickupPointsService({
      env: { FOXPOST_API_USER: "foxpost-user" },
      fetcher,
    });

    await expect(service.getAvailability()).resolves.toEqual({
      available: false,
      reason: "missing_configuration",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("marks Foxpost unavailable when its pickup-point directory cannot be read", async () => {
    const service = new FoxpostPickupPointsService({
      env: configuredEnv,
      fetcher: async () => Promise.reject(new Error("network unavailable")),
    });

    await expect(service.getAvailability()).resolves.toEqual({
      available: false,
      reason: "service_unavailable",
    });
  });

  it("keeps the server-supplied point details for one day", async () => {
    const fetcher = jest.fn(fetcherWith([sourcePickupPoint]));
    const service = new FoxpostPickupPointsService({
      env: configuredEnv,
      fetcher,
      now: () => 1_000,
    });

    await expect(service.getAvailability()).resolves.toEqual({
      available: true,
      pickup_points: [
        {
          id: "HU1234",
          name: "FOXPOST A-BOX Test",
          address: "1111 Budapest, Teszt utca 1.",
          // the source point carries no zip or city: kept, not dropped
          zip: "",
          city: "",
          opening_hours: { hetfo: "00:00-24:00" },
          latitude: 47.5,
          longitude: 19.1,
        },
      ],
    });
    await service.getAvailability();

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

const point = (
  operator_id: string,
  zip: string,
  city: string,
  name: string,
  address: string,
) => ({
  ...sourcePickupPoint,
  operator_id,
  zip,
  city,
  name,
  address,
});

const DIRECTORY = [
  point("HU3", "2100", "Gödöllő", "FOXPOST A-BOX Gödöllő Spar", "2100 Gödöllő, Dózsa György út 12."),
  point("HU1", "1135", "Budapest", "FOXPOST A-BOX Bp. 13. ker. Szent László", "1135 Budapest, Szent László út 170."),
  point("HU2", "1111", "Budapest", "FOXPOST A-BOX Bp. 11. ker. Allee", "1111 Budapest, Október huszonharmadika utca 8."),
  point("HU4", "1117", "Budapest", "FOXPOST A-BOX Bp. 11. ker. Infopark", "1117 Budapest, Infopark sétány 1."),
];

const searchIn = (points: unknown[] = DIRECTORY) =>
  new FoxpostPickupPointsService({
    env: configuredEnv,
    fetcher: fetcherWith(points),
  });

const ids = (answer: Awaited<
  ReturnType<FoxpostPickupPointsService["searchPickupPoints"]>
>) => (answer.available ? answer.pickup_points.map((p) => p.id) : answer);

describe("Foxpost pickup-point search", () => {
  it("keeps the postcode and the city of every point", async () => {
    const answer = await searchIn().searchPickupPoints({ query: "2100" });
    expect(answer.available && answer.pickup_points[0]).toMatchObject({
      id: "HU3",
      zip: "2100",
      city: "Gödöllő",
    });
  });

  it("finds by postcode prefix, ordered by postcode", async () => {
    await expect(
      searchIn().searchPickupPoints({ query: "11" }).then(ids),
    ).resolves.toEqual(["HU2", "HU4", "HU1"]);
    await expect(
      searchIn().searchPickupPoints({ query: "1117" }).then(ids),
    ).resolves.toEqual(["HU4"]);
  });

  it("finds by city or name without caring about case or accents", async () => {
    await expect(
      searchIn().searchPickupPoints({ query: "godollo" }).then(ids),
    ).resolves.toEqual(["HU3"]);
    await expect(
      searchIn().searchPickupPoints({ query: "INFOPARK" }).then(ids),
    ).resolves.toEqual(["HU4"]);
  });

  it("needs every word of the search", async () => {
    await expect(
      searchIn().searchPickupPoints({ query: "budapest szent" }).then(ids),
    ).resolves.toEqual(["HU1"]);
    await expect(
      searchIn().searchPickupPoints({ query: "budapest gödöllő" }).then(ids),
    ).resolves.toEqual([]);
  });

  it("answers at most the limit, never more than 50, and counts every match", async () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      point(`HU${i}`, "1000", "Budapest", `Pont ${i}`, "1000 Budapest"),
    );
    const two = await searchIn(many).searchPickupPoints({
      query: "budapest",
      limit: 2,
    });
    expect(two.available && two.pickup_points).toHaveLength(2);
    expect(two.available && two.count).toBe(60);

    const capped = await searchIn(many).searchPickupPoints({
      query: "budapest",
      limit: 500,
    });
    expect(capped.available && capped.pickup_points).toHaveLength(50);
  });

  it("passes an unavailable directory through", async () => {
    const service = new FoxpostPickupPointsService({
      env: {},
      fetcher: fetcherWith(DIRECTORY),
    });
    await expect(
      service.searchPickupPoints({ query: "budapest" }),
    ).resolves.toEqual({ available: false, reason: "missing_configuration" });
  });
});

