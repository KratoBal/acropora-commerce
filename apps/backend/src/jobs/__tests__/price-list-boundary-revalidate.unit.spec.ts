import job, { config } from "../price-list-boundary-revalidate"

/*
  WHAT TURNS RED (card 54bb3779). The job not scheduled every minute under its own name; it reading the pricing module
  while the storefront's address or secret is missing (it could not empty anything, and would still look).
*/
describe("price-list-boundary-revalidate job", () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  it("runs every minute under its own name", () => {
    expect(config).toEqual({ name: "price-list-boundary-revalidate", schedule: "* * * * *" })
  })

  it("without the storefront settings it resolves nothing from the container", async () => {
    delete process.env.ACROPORA_STOREFRONT_URL
    delete process.env.STOREFRONT_REVALIDATE_SECRET
    const resolve = jest.fn()
    await job({ resolve } as never)
    expect(resolve).not.toHaveBeenCalled()
  })
})
