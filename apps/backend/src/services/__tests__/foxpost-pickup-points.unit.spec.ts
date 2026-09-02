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
