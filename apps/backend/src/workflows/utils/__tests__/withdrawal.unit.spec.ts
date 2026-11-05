import { ORDER_WITHDRAWAL_MODULE } from "../../../modules/order-withdrawal"
import { cleanName } from "../withdrawal/rules"
import { createWithdrawal, listWithdrawalsForOs, markWithdrawalPulled } from "../withdrawal/withdrawal"

/*
  WHAT TURNS THIS RED (V0.3, the Medusa side). Another order's line in a declaration; a line already withdrawn from
  getting a second declaration; two racing sends both standing (the database's unique claim per line is the referee,
  faked here as all-or-nothing); a partly taken request refused whole instead of recording the free lines and naming
  the taken ones; a lost claim leaving its declaration behind; a failure that is not a lost race swallowed; a
  declaration reaching the OS without its name or its time of receipt; a second `pulled` changing anything; a name
  keeping control characters or runs of spaces.
*/
type Row = Record<string, any>

function fakeContainer() {
  const rows: Row[] = []
  const lines: Row[] = []
  let seq = 0
  let lineSeq = 0
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
    listOrderWithdrawalItems: async (filter: Row) =>
      lines.filter((row) => row.order_id === filter.order_id && (filter.item_id as string[]).includes(row.item_id)),
    // the unique claim per (order, line), all or nothing, like the one bulk insert behind the real unique index
    createOrderWithdrawalItems: async (data: Row[]) => {
      if (data.some((d) => lines.some((l) => l.order_id === d.order_id && l.item_id === d.item_id)))
        throw new Error("duplicate key value violates unique constraint")
      for (const d of data) lines.push({ id: `wdi_${++lineSeq}`, created_at: new Date(Date.UTC(2026, 10, 5, 18, 0, 30 + lineSeq)), ...d })
    },
    // the declaration and the claim of its lines in ONE transaction: a refused claim writes nothing at all
    declareWithClaims: async (input: Row) => {
      if (input.item_ids.some((id: string) => lines.some((l) => l.order_id === input.order_id && l.item_id === id)))
        throw new Error("duplicate key value violates unique constraint")
      const row = await service.createOrderWithdrawals({
        order_id: input.order_id,
        customer_name: input.customer_name,
        item_ids: input.item_ids,
        status: "new",
      })
      await service.createOrderWithdrawalItems(
        input.item_ids.map((item_id: string) => ({ withdrawal_id: row.id, order_id: input.order_id, item_id })),
      )
      return row
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
  return { container, rows, lines, service }
}

const order = { id: "order_1", itemIds: ["item_1", "item_2", "item_3"] }

describe("createWithdrawal", () => {
  it("records the declaration for the order's own lines, once per line, with the server's time, and claims each line", async () => {
    const { container, rows, lines } = fakeContainer()
    const result = await createWithdrawal(container, order, { customerName: "Kiss Anna", itemIds: ["item_1", "item_1", "item_2"] })
    expect(result).toMatchObject({ status: "created", createdAt: "2026-11-05T18:00:01.000Z", itemIds: ["item_1", "item_2"], skipped: [] })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ order_id: "order_1", customer_name: "Kiss Anna", item_ids: ["item_1", "item_2"], status: "new" })
    expect(lines.map((l) => [l.withdrawal_id, l.item_id])).toEqual([
      [rows[0].id, "item_1"],
      [rows[0].id, "item_2"],
    ])
  })

  it("refuses a line that is not the order's, or no line, and writes nothing", async () => {
    const { container, rows, lines } = fakeContainer()
    expect(await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_9"] })).toEqual({ status: "bad_items" })
    expect(await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1", "item_9"] })).toEqual({ status: "bad_items" })
    expect(await createWithdrawal(container, order, { customerName: "A", itemIds: [] })).toEqual({ status: "bad_items" })
    expect(rows).toHaveLength(0)
    expect(lines).toHaveLength(0)
  })

  it("when EVERY requested line is already withdrawn from it is a duplicate: the standing reference and the lines, nothing written", async () => {
    const { container, rows } = fakeContainer()
    const first = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1", "item_2"] })
    const second = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_2", "item_1"] })
    expect(second).toEqual({ status: "duplicate", id: (first as { id: string }).id, itemIds: ["item_2", "item_1"] })
    expect(rows).toHaveLength(1)
  })

  it("a PARTLY taken request records the free lines and names the taken one with the declaration that holds it", async () => {
    const { container, rows, lines } = fakeContainer()
    const first = (await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1"] })) as { id: string }
    const second = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1", "item_2"] })
    expect(second).toMatchObject({
      status: "created",
      itemIds: ["item_2"],
      skipped: [{ itemId: "item_1", withdrawalId: first.id }],
    })
    expect(rows).toHaveLength(2)
    expect(rows[1]!.item_ids).toEqual(["item_2"])
    expect(lines.map((l) => l.item_id)).toEqual(["item_1", "item_2"])
  })

  it("another line of the same order is a declaration of its own", async () => {
    const { container, rows } = fakeContainer()
    await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1"] })
    const other = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_3"] })
    expect(other.status).toBe("created")
    expect(rows).toHaveLength(2)
  })

  it("two sends that raced past the check: the later one's transaction is refused and leaves nothing, the earlier stands", async () => {
    const { container, rows, lines, service } = fakeContainer()
    const declare = service.declareWithClaims as (data: Row) => Promise<Row>
    // "another request" writes its declaration AND its claim between our check and our own transaction
    service.declareWithClaims = async (data: Row) => {
      rows.push({ id: "wdr_early", created_at: new Date("2026-11-05T17:59:59Z"), pulled_at: null, order_id: data.order_id, item_ids: ["item_1"] })
      lines.push({ id: "wdi_early", order_id: data.order_id, item_id: "item_1", withdrawal_id: "wdr_early", created_at: new Date("2026-11-05T17:59:59Z") })
      return declare(data)
    }
    const result = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1"] })
    expect(result).toEqual({ status: "duplicate", id: "wdr_early", itemIds: ["item_1"] })
    expect(rows.map((row) => row.id)).toEqual(["wdr_early"])
  })

  it("a race on one of two lines refuses the whole transaction, then the free line is recorded in the next round", async () => {
    const { container, rows, lines, service } = fakeContainer()
    const declare = service.declareWithClaims as (data: Row) => Promise<Row>
    let once = true
    service.declareWithClaims = async (data: Row) => {
      if (once) {
        once = false
        rows.push({ id: "wdr_early", created_at: new Date("2026-11-05T17:59:59Z"), pulled_at: null, order_id: data.order_id, item_ids: ["item_1"] })
        lines.push({ id: "wdi_early", order_id: data.order_id, item_id: "item_1", withdrawal_id: "wdr_early", created_at: new Date("2026-11-05T17:59:59Z") })
      }
      return declare(data)
    }
    const result = await createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1", "item_2"] })
    expect(result).toMatchObject({ status: "created", itemIds: ["item_2"], skipped: [{ itemId: "item_1", withdrawalId: "wdr_early" }] })
    // no declaration of ours ever held item_1, and no claim without its declaration
    expect(rows.filter((row) => (row.item_ids as string[]).includes("item_1")).map((row) => row.id)).toEqual(["wdr_early"])
    expect(lines.filter((l) => l.item_id === "item_1")).toHaveLength(1)
    for (const l of lines) expect(rows.some((row) => row.id === l.withdrawal_id)).toBe(true)
  })

  it("a transaction that fails for another reason leaves nothing and rethrows the error", async () => {
    const { container, rows, lines, service } = fakeContainer()
    service.declareWithClaims = async () => {
      throw new Error("connection lost")
    }
    await expect(createWithdrawal(container, order, { customerName: "A", itemIds: ["item_1"] })).rejects.toThrow("connection lost")
    expect(rows).toHaveLength(0)
    expect(lines).toHaveLength(0)
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
