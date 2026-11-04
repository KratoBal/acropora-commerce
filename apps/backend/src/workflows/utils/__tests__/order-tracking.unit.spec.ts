const updateOrder = jest.fn();
jest.mock("@medusajs/medusa/core-flows", () => ({
  updateOrderWorkflow: () => ({ run: (args: unknown) => updateOrder(args) }),
}));

import {
  saveShippingTracking,
  TRACKING_CARRIER_KEY,
  TRACKING_NUMBER_KEY,
  TRACKING_URL_KEY,
  trackingOf,
  withTracking,
} from "../order-tracking";

/*
  WHAT TURNS THIS RED (V1.1). A STUB- number stored as a parcel; the same data written again (a retried
  notice must write nothing); a new number not replacing the old one (a relabelled parcel); a link
  built by the shop (none is ever invented); the rest of the metadata (notes, language, terms record)
  touched; a stale link surviving a notice that carries none.
*/
const rest = {
  acropora_customer_note: "kapucsengő",
  aszf_elfogadas: { verzio: "1" },
};
const notice = {
  carrier: "foxpost",
  tracking_number: "CLFOX0123456789",
  tracking_url: "https://carrier.example/t/1",
};

afterEach(() => updateOrder.mockReset());

describe("trackingOf", () => {
  it("reads the three keys, a missing link is null", () => {
    expect(
      trackingOf({
        [TRACKING_CARRIER_KEY]: "gls",
        [TRACKING_NUMBER_KEY]: "12345",
      }),
    ).toEqual({ carrier: "gls", number: "12345", url: null });
    expect(
      trackingOf({
        [TRACKING_CARRIER_KEY]: "gls",
        [TRACKING_NUMBER_KEY]: "12345",
        [TRACKING_URL_KEY]: "https://x.example/1",
      }),
    ).toEqual({ carrier: "gls", number: "12345", url: "https://x.example/1" });
  });

  it("is null without a number or a carrier, or when they are not text", () => {
    expect(trackingOf(null)).toBeNull();
    expect(trackingOf({})).toBeNull();
    expect(trackingOf({ [TRACKING_NUMBER_KEY]: "1" })).toBeNull();
    expect(trackingOf({ [TRACKING_CARRIER_KEY]: "gls" })).toBeNull();
    expect(
      trackingOf({ [TRACKING_CARRIER_KEY]: "gls", [TRACKING_NUMBER_KEY]: 5 }),
    ).toBeNull();
    expect(
      trackingOf({
        [TRACKING_CARRIER_KEY]: "gls",
        [TRACKING_NUMBER_KEY]: "  ",
      }),
    ).toBeNull();
  });
});

describe("withTracking", () => {
  it("sets the three keys and leaves every other key alone", () => {
    expect(withTracking(rest, notice)).toEqual({
      ...rest,
      [TRACKING_CARRIER_KEY]: "foxpost",
      [TRACKING_NUMBER_KEY]: "CLFOX0123456789",
      [TRACKING_URL_KEY]: "https://carrier.example/t/1",
    });
  });

  it("the same data again writes nothing", () => {
    const stored = withTracking(rest, notice)!;
    expect(withTracking(stored, notice)).toBeNull();
  });

  it("a new number replaces the old one", () => {
    const stored = withTracking(rest, notice)!;
    const next = withTracking(stored, {
      ...notice,
      tracking_number: "CLFOX0000000001",
    })!;
    expect(next[TRACKING_NUMBER_KEY]).toBe("CLFOX0000000001");
  });

  it("a notice without a link removes the link an earlier notice stored, and never builds one", () => {
    const stored = withTracking(rest, notice)!;
    const next = withTracking(stored, {
      carrier: "foxpost",
      tracking_number: "CLFOX0123456789",
    })!;
    expect(TRACKING_URL_KEY in next).toBe(false);
    expect(next[TRACKING_NUMBER_KEY]).toBe("CLFOX0123456789");
    const fresh = withTracking({}, { carrier: "gls", tracking_number: "99" })!;
    expect(TRACKING_URL_KEY in fresh).toBe(false);
  });

  it("a STUB- number or a blank number is never stored", () => {
    expect(
      withTracking(rest, { ...notice, tracking_number: "STUB-123" }),
    ).toBeNull();
    expect(
      withTracking(rest, { ...notice, tracking_number: "stub-123" }),
    ).toBeNull();
    expect(
      withTracking(rest, { ...notice, tracking_number: "   " }),
    ).toBeNull();
  });

  it("works on an order without metadata", () => {
    expect(withTracking(null, notice)?.[TRACKING_NUMBER_KEY]).toBe(
      "CLFOX0123456789",
    );
    expect(withTracking(undefined, notice)?.[TRACKING_NUMBER_KEY]).toBe(
      "CLFOX0123456789",
    );
  });
});

describe("saveShippingTracking", () => {
  const scopeWith = (row: unknown) =>
    ({
      resolve: () => ({ graph: async () => ({ data: row ? [row] : [] }) }),
    }) as never;

  it("no such order: not_found, nothing written", async () => {
    expect(
      await saveShippingTracking(scopeWith(null), "order_1", notice, "user_1"),
    ).toBe("not_found");
    expect(updateOrder).not.toHaveBeenCalled();
  });

  it("saves the merged metadata under the caller's id", async () => {
    expect(
      await saveShippingTracking(
        scopeWith({ id: "order_1", metadata: rest }),
        "order_1",
        notice,
        "user_1",
      ),
    ).toBe("saved");
    expect(updateOrder).toHaveBeenCalledTimes(1);
    const input = updateOrder.mock.calls[0][0].input;
    expect(input.id).toBe("order_1");
    expect(input.user_id).toBe("user_1");
    expect(input.metadata).toMatchObject({
      ...rest,
      [TRACKING_NUMBER_KEY]: "CLFOX0123456789",
    });
  });

  it("already stored: unchanged, nothing written (a retried notice)", async () => {
    const stored = withTracking(rest, notice)!;
    expect(
      await saveShippingTracking(
        scopeWith({ id: "order_1", metadata: stored }),
        "order_1",
        notice,
        "user_1",
      ),
    ).toBe("unchanged");
    expect(updateOrder).not.toHaveBeenCalled();
  });

  it("a STUB- number: unchanged, nothing written", async () => {
    expect(
      await saveShippingTracking(
        scopeWith({ id: "order_1", metadata: rest }),
        "order_1",
        { ...notice, tracking_number: "STUB-1" },
        "user_1",
      ),
    ).toBe("unchanged");
    expect(updateOrder).not.toHaveBeenCalled();
  });
});
