import { ORDER_WITHDRAWAL_MODULE } from "../../../modules/order-withdrawal"
import { cleanName } from "../withdrawal/rules"
import { createWithdrawal, listWithdrawalsForOs, markWithdrawalPulled } from "../withdrawal/withdrawal"

/*
  WHAT TURNS THIS RED (V0.3, the Medusa side). Another order's line in a declaration; a line already withdrawn from
  getting a second declaration; two racing sends both standing; a declaration reaching the OS without its name or
  its time of receipt; a second `pulled` changing anything; a name keeping control characters or runs of spaces.
*/
type Row = Record<string, any>

function fakeContainer() {
  const rows: Row[] = []
  let seq = 0
  const matches = (row: Row, filter: Row) => Object.entries(filter).every(([key, value]) => row[key] === value)
  const service = {
    createOrderWithdrawals: async (data: Row) => {
      const row = { id: `wdr_${++seq}`, created_at: new Date(Date.UTC(2026, 10, 5, 18, 0, seq)), pulled_at: null, ...data }
      rows.push(row)
      return row
    },
    listOrderWithdrawals: async (filter: Row, config?: Row) => {
      return rows.filter((row) => matches(row, filter)).slice(0, config?.take ?? 1000)
    },
    updateOrderWithdrawals: async (data: Row) => Object.assign(rows.find((row) => row.id === data.id)!, data),
    deleteOrderWithdrawals: async (id: string) => {
      rows.splice(
        rows.findIndex((row) => row.id === id),
        1,
      )
    },
  }
  const container = {
    resolve: (key: string) => {
      if (key === ORDER_WITHDRAWAL_MODULE) return service
      throw new Error(`unexpected resolve: ${key}`)
    },
  } as never
  return { container, rows }
}

const order = { id: "order_1", itemIds: ["item_1", "item_2", "item_3"] }

describe("createWithdrawal", () => {
  it("records the declaration for the order's own lines, once per line, with the server's time", async () => {
    const { container, rows } = fakeContainer()
    const result = await createWithdrawal(container, order, { customerName: "Kiss Anna", itemIds: ["item_1", "item_1", "item_2"] })
    expect(result).toMatchObject({ status: "created", createdAt: "2026-11-05T18:00:01.000Z" })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ order_id: "order_1", customer_name: "Kiss Anna", item_ids: ["item_1", "item_2"], status: "new" })
  })

  it("refuses a line that is not the order's, or no line, and writes nothing", async () => {
    const { container, rows } = fakeContainer()
    expect(await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_9"] })).toEqual({ status: "bad_items" })
    expect(await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1", "item_9"] })).toEqual({ status: "bad_items" })
    expect(await createWithdrawal(container, order, { customerName: "A", itemIds: [] })).toEqual({ status: "bad_items" })
    expect(rows).toHaveLength(0)
  })

  it("a line already withdrawn from is a duplicate: the standing reference, nothing written", async () => {
    const { container, rows } = fakeContainer()
    const first = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1"] })
    const second = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1", "item_2"] })
    expect(second).toEqual({ status: "duplicate", id: (first as { id: string }).id })
    expect(rows).toHaveLength(1)
  })

  it("another line of the same order is a declaration of its own", async () => {
    const { container, rows } = fakeContainer()
    await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1"] })
    const other = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_3"] })
    expect(other.status).toBe("created")
    expect(rows).toHaveLength(2)
  })

  it("two sends that raced past the check: the earlier row stands, the later one removes itself", async () => {
    const { container, rows } = fakeContainer()
    const svc = (container as unknown as { resolve: (key: string) => Record<string, any> }).resolve(ORDER_WITHDRAWAL_MODULE)
    const create = svc.createOrderWithdrawals as (data: Row) => Promise<Row>
    // "another request" writes its row, with an EARLIER time, between our check and our own insert
    svc.createOrderWithdrawals = async (data: Row) => {
      rows.push({ id: "wdr_early", created_at: new Date("2026-11-05T17:59:59Z"), pulled_at: null, ...data })
      return create(data)
    }
    const result = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1"] })
    expect(result).toEqual({ status: "duplicate", id: "wdr_early" })
    expect(rows.map((row) => row.id)).toEqual(["wdr_early"])
  })
})

describe("what the OS pulls", () => {
  it("lists the declarations with their name and time of receipt, and marks one pulled idempotently", async () => {
    const { container } = fakeContainer()
    const made = (await createWithdrawal(container, order, { customerName: "Kiss Anna", itemIds: ["item_1"] })) as { id: string }
    const list = await listWithdrawalsForOs(container, { status: "new", limit: 10 })
    expect(list).toEqual([
      {
        id: made.id,
        order_id: "order_1",
        customer_name: "Kiss Anna",
        item_ids: ["item_1"],
        status: "new",
        created_at: "2026-11-05T18:00:01.000Z",
        pulled_at: null,
      },
    ])
    const at = new Date("2026-11-05T19:00:00Z")
    expect(await markWithdrawalPulled(container, made.id, at)).toBe("pulled")
    expect(await markWithdrawalPulled(container, made.id, new Date("2026-11-05T20:00:00Z"))).toBe("pulled")
    const pulledList = await listWithdrawalsForOs(container, { status: "pulled", limit: 10 })
    expect(pulledList[0]).toMatchObject({ status: "pulled", pulled_at: at.toISOString() })
    expect(await listWithdrawalsForOs(container, { status: "new", limit: 10 })).toEqual([])
    expect(await markWithdrawalPulled(container, "ordwdr_missing", at)).toBe("not_found")
  })
})

describe("cleanName", () => {
  it("drops control characters, makes runs of whitespace one space, trims", () => {
    expect(cleanName("  Kiss\u0007   Anna\t\n")).toBe("Kiss Anna")
    expect(cleanName("\u0001")).toBe("")
  })
})
