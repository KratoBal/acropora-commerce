const savedEnv = { ...process.env };
const savedFetch = global.fetch;
afterAll(() => {
  process.env = savedEnv;
  global.fetch = savedFetch;
});

// The route builds its service at import time, from process.env and fetch.
const loadRoute = async (configured: boolean, soFoxpost?: string) => {
  jest.resetModules();
  process.env.FOXPOST_API_USER = configured ? "u" : "";
  process.env.FOXPOST_API_PASSWORD = configured ? "p" : "";
  process.env.FOXPOST_API_KEY = configured ? "k" : "";
  if (soFoxpost) process.env.ACROPORA_SO_FOXPOST = soFoxpost;
  else delete process.env.ACROPORA_SO_FOXPOST;
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => [
      {
        operator_id: "HU1",
        name: "A",
        address: "1111 Budapest",
        open: {},
        geolat: 47.5,
        geolng: 19.1,
      },
    ],
  })) as never;
  return (await import("../route")).GET;
};

const call = async (GET: Awaited<ReturnType<typeof loadRoute>>) => {
  const res = { body: undefined as unknown, json(b: unknown) { this.body = b; } };
  await GET({} as never, res as never);
  return res.body;
};

/**
 * WHICH OPTION IS FOXPOST (P4). What must fail: the checkout not learning the
 * Foxpost option id (it would set the method without a point and be refused);
 * an unconfigured Foxpost looking available.
 */
describe("GET /store/foxpost", () => {
  it("names the bound Foxpost option and says it is available", async () => {
    expect(await call(await loadRoute(true, "so_fox"))).toEqual({
      option_id: "so_fox",
      available: true,
    });
  });

  it("an unconfigured Foxpost is not available", async () => {
    expect(await call(await loadRoute(false, "so_fox"))).toEqual({
      option_id: "so_fox",
      available: false,
    });
  });
});
