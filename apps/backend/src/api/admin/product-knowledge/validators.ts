import { z } from "@medusajs/framework/zod"

/** The JEV statuses, passed through unchanged (never flattened). */
export const PRODUCT_KNOWLEDGE_STATUSES = [
  "VERIFIED",
  "SUGGESTED",
  "CONFLICTING_SOURCES",
  "MISSING",
  "UNVERIFIED",
  "POSSIBLE_WRONG_VALUE",
] as const

/**
 * What the BUYER may see (D5, Balázs 2026-10-07; card 4622f1ac): only VERIFIED.
 * The admin route keeps every row, because the OS diffs against it; only the
 * store route filters.
 */
export const PUBLIC_PRODUCT_KNOWLEDGE_STATUSES: readonly string[] = ["VERIFIED"]

export const PRODUCT_KNOWLEDGE_BLOCKS = ["lead", "body"] as const

const Fact = z
  .object({
    field: z.string().min(1).max(48),
    value: z.string().nullable(),
    unit: z.string().nullable(),
    status: z.enum(PRODUCT_KNOWLEDGE_STATUSES),
    source_type: z.string().nullable(),
    revision: z.number().int().min(0),
  })
  .strict()
  // the conflict rule (PD-014): a conflict carries no value; both values and
  // their sources stay in the OS evidence
  .refine((f) => f.status !== "CONFLICTING_SOURCES" || f.value === null, {
    message: "A CONFLICTING_SOURCES fact carries no value",
    path: ["value"],
  })

const Copy = z
  .object({
    block: z.enum(PRODUCT_KNOWLEDGE_BLOCKS),
    body: z.string().min(1),
    revision: z.number().int().min(0),
  })
  .strict()

const unique = <T>(key: (item: T) => string) => (items: T[]) =>
  new Set(items.map(key)).size === items.length

export const AdminPutProductKnowledge = z
  .object({
    facts: z
      .array(Fact)
      .refine(unique((f) => f.field), { message: "A field appears twice" }),
    copy: z
      .array(Copy)
      .refine(unique((c) => c.block), { message: "A block appears twice" }),
  })
  .strict()

export type AdminPutProductKnowledgeType = z.infer<
  typeof AdminPutProductKnowledge
>
