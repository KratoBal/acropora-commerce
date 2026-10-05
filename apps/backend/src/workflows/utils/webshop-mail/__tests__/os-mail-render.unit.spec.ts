import { renderRequest } from "../facts"
import { osMailRenderConfig, renderWithOs, webshopMailRenderer } from "../os-mail-render"

/**
 * THE OS RENDER CLIENT (nautilus 26557). What must fail: a 400/422 retried
 * like a 5xx (a bad template would be hammered every few minutes), or a 5xx
 * reported as permanent (a short OS outage would drop mail); a wrong token not
 * named as such; an empty answer taken for a mail; no timeout; the token not
 * sent as Bearer; the switch flipping without "os".
 */
const config = { url: "https://os.example.test/webshop-mail/render", token: "tok" }
const request = renderRequest("order-status-closed", {
  customer_name: null,
  order_created_at: null,
  order: { id: "o", display_id: 1, email: null, total: 1, items: [], shipping: [], payment: null },
})
const answer = (status: number, body: unknown) => async () => ({ status, json: async () => body })

describe("renderWithOs", () => {
  it("a rendered mail, asked with the token and the facts", async () => {
    const fetcher = jest.fn(answer(200, { subject: "T", html: "<p>h</p>", text: "h", customized: true }))
    expect(await renderWithOs(request, config, fetcher as never)).toEqual({
      ok: true,
      subject: "T",
      html: "<p>h</p>",
      text: "h",
      customized: true,
    })
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }]
    expect(url).toBe(config.url)
    expect(init.method).toBe("POST")
    expect(init.headers.Authorization).toBe("Bearer tok")
    expect(JSON.parse(init.body)).toEqual(request)
  })

  it("400 and 422 are permanent, with the OS's own sentence", async () => {
    for (const status of [400, 422]) {
      expect(await renderWithOs(request, config, answer(status, { message: "Ismeretlen változó: {{x}}." }) as never)).toEqual({
        ok: false,
        kind: "permanent",
        message: "Ismeretlen változó: {{x}}.",
      })
    }
  })

  it("401/403 and missing settings are config; 5xx, a network error and a timeout are transient", async () => {
    expect(await renderWithOs(request, config, answer(401, {}) as never)).toMatchObject({ ok: false, kind: "config" })
    expect(await renderWithOs(request, config, answer(403, {}) as never)).toMatchObject({ ok: false, kind: "config" })
    expect(await renderWithOs(request, null)).toMatchObject({ ok: false, kind: "config" })
    expect(await renderWithOs(request, config, answer(503, {}) as never)).toMatchObject({ ok: false, kind: "transient" })
    expect(
      await renderWithOs(request, config, (async () => {
        throw new Error("ECONNREFUSED")
      }) as never)
    ).toMatchObject({ ok: false, kind: "transient", message: expect.stringContaining("ECONNREFUSED") })
    const hanging = (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))))
    expect(await renderWithOs(request, config, hanging as never, 20)).toEqual({
      ok: false,
      kind: "transient",
      message: "Az OS nem válaszolt időben.",
    })
  })

  it("an empty or partial answer is not a mail", async () => {
    for (const body of [{}, { subject: "T", html: "", text: "x" }, { subject: " ", html: "<p/>", text: "x" }, null]) {
      expect(await renderWithOs(request, config, answer(200, body) as never)).toMatchObject({ ok: false, kind: "permanent" })
    }
  })
})

describe("the settings", () => {
  it("the switch is os only when it says os", () => {
    expect(webshopMailRenderer({ ACROPORA_WEBSHOP_MAIL_RENDERER: "os" })).toBe("os")
    expect(webshopMailRenderer({ ACROPORA_WEBSHOP_MAIL_RENDERER: "OS" })).toBe("local")
    expect(webshopMailRenderer({})).toBe("local")
  })

  it("the endpoint needs an http(s) address and a token", () => {
    expect(osMailRenderConfig({ ACROPORA_OS_MAIL_RENDER_URL: config.url, ACROPORA_OS_MAIL_TOKEN: " tok " })).toEqual(config)
    expect(osMailRenderConfig({ ACROPORA_OS_MAIL_RENDER_URL: config.url })).toBeNull()
    expect(osMailRenderConfig({ ACROPORA_OS_MAIL_RENDER_URL: "os.example.test", ACROPORA_OS_MAIL_TOKEN: "t" })).toBeNull()
  })
})
