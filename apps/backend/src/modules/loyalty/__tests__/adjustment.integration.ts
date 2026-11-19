import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

import { adjustLoyalty, adminEntryView, type LoyaltyOperations } from "../../../workflows/utils/loyalty/loyalty"
import { LoyaltyEntry } from "../models/loyalty-entry"
import type LoyaltyModuleService from "../service"

/*
  THE MANUAL CREDIT ON A REAL POSTGRES (2026-11-19). The test shop answered 500 to every manual credit and debit while the
  row was stored: the create returned the row without `created_at`, and the admin view threw "Invalid time value". The
  unit doubles return a whole row, so only a real database shows it. WHAT TURNS RED: the stored row's answer cannot be
  turned into the admin view; a retry with the same reference stores a second row.

  Runs only against a database (it is not in the CI's unit run):
    DB_HOST=127.0.0.1 DB_PORT=<port> DB_USERNAME=<user> DB_PASSWORD=<password> pnpm test:integration:modules
*/
jest.setTimeout(60_000)

moduleIntegrationTestRunner<LoyaltyModuleService>({
  moduleName: "loyalty",
  resolve: "./src/modules/loyalty",
  // the models file exports the model twice (named and default): the runner's own discovery would register it twice
  moduleModels: [LoyaltyEntry],
  testSuite: ({ service }) => {
    const ops = (): LoyaltyOperations => ({
      customerExists: async () => true,
      balanceOf: (id) => service.balanceOf(id),
      recent: async () => [],
      findByReference: async (reference) =>
        ((await service.listLoyaltyEntries({ reference }, { take: 1 })) as never[])[0] ?? null,
      addEntryChecked: (input) => service.addEntryChecked(input),
    })
    const credit = { customer_id: "cus_repro", points: 40000, reason: "repro", reference: "repro-credit" }

    it("a credit and a debit answer the stored row, which the admin view can show", async () => {
      const made = await adjustLoyalty(ops(), credit, "apk_repro")
      expect(made.status).toBe("created")
      if (made.status !== "created") return
      expect(() => adminEntryView(made.entry)).not.toThrow()
      expect(made.balance).toBe(40000)
      const debit = await adjustLoyalty(
        ops(),
        { customer_id: "cus_repro", points: -40000, reason: "repro", reference: "repro-debit" },
        "apk_repro"
      )
      expect(debit.status).toBe("created")
      if (debit.status !== "created") return
      expect(() => adminEntryView(debit.entry)).not.toThrow()
      expect(debit.balance).toBe(0)
    })

    it("a retry with the same reference stores once and answers the first row", async () => {
      const first = await adjustLoyalty(ops(), credit, "apk_repro")
      const again = await adjustLoyalty(ops(), credit, "apk_repro")
      expect([first.status, again.status]).toEqual(["created", "replayed"])
      expect(await service.balanceOf("cus_repro")).toBe(40000)
      if (first.status === "created" && again.status === "replayed") expect(again.entry.id).toBe(first.entry.id)
    })
  },
})
