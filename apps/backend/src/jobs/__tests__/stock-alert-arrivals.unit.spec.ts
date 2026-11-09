import job, { config } from "../stock-alert-arrivals"

/*
  WHAT TURNS THIS RED. The sweep not scheduled (a name or cron missing), or reading and marking rows while the stock
  alert's or the mail's switch is off (a row would be "told" by a mail that never left).
*/
describe("stock-alert-arrivals job", () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it("runs every ten minutes under its own name", () => {
    expect(config).toEqual({ name: "stock-alert-arrivals", schedule: "*/10 * * * *" })
  })

  it("with a switch off it resolves nothing from the container", async () => {
    const resolve = jest.fn()
    for (const off of [{ ACROPORA_STOCK_ALERT: undefined }, { ACROPORA_STOCK_ALERT: "on", ACROPORA_WEBSHOP_MAIL: undefined }]) {
      process.env = { ...saved, ...off }
      await job({ resolve } as never)
    }
    expect(resolve).not.toHaveBeenCalled()
  })
})
