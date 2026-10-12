import { feedCache } from "../../../../services/merchant-feed-cache"
import { noindexHandlesGet } from "../handles"

/*
  THE NOINDEX HANDLES (t13). What turns it red: a product on the second page
  missed (the paging stops early); a product without the flag listed; a "none"
  value not counted; an unpublished product asked for.
*/
describe("GET /store/noindex-products", () => {
  it("pages through every published product and returns only the noindex handles", async () => {
    const calls: { skip: number; filters: unknown }[] = []
    const products = Array.from({ length: 501 }, (_, i) => ({
      handle: `p-${i}`,
      metadata:
        i === 3
          ? { seo_robots: "noindex, nofollow" }
          : i === 500
            ? { seo_robots: "none" }
            : i === 7
              ? { seo_robots: "index, follow" }
              : null,
    }))
    const scope = {
      resolve: () => ({
        graph: async (q: {
          filters: unknown
          pagination: { skip: number; take: number }
        }) => {
          calls.push({ skip: q.pagination.skip, filters: q.filters })
          return {
            data: products.slice(
              q.pagination.skip,
              q.pagination.skip + q.pagination.take
            ),
          }
        },
      }),
    }
    const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
    const GET = noindexHandlesGet(feedCache(60_000))
    await GET({ scope } as never, res as never)
    expect(res.body).toEqual({ handles: ["p-3", "p-500"] })
    expect(calls.map((c) => c.skip)).toEqual([0, 500])
    expect(calls[0].filters).toEqual({ status: "published" })
  })

  it("a second call within the TTL does not read the products again (barracuda #550)", async () => {
    let calls = 0
    const scope = {
      resolve: () => ({
        graph: async () => {
          calls++
          return { data: [{ handle: "p-1", metadata: { seo_robots: "noindex" } }] }
        },
      }),
    }
    let clock = 0
    const GET = noindexHandlesGet(feedCache(1000, () => clock))
    const res = { body: undefined as unknown, json: (b: unknown) => (res.body = b) }
    await GET({ scope } as never, res as never)
    await GET({ scope } as never, res as never)
    expect(calls).toBe(1)
    expect(res.body).toEqual({ handles: ["p-1"] })
    clock = 2000
    await GET({ scope } as never, res as never)
    expect(calls).toBe(2)
  })
})
