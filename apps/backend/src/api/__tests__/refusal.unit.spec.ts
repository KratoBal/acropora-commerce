import { getHttpResponseFromError } from "@medusajs/framework/http"
import { MedusaError, serializeError } from "@medusajs/framework/utils"

import { answerRefusal } from "../refusal"

/**
 * WHAT `answerRefusal` ANSWERS. What must fail: a serialized CONFLICT (a
 * workflow's) left to the handler; a plain object with `type: "conflict"` that
 * is not a MedusaError answered as one; any other MedusaError answered here.
 */
const res = () => {
  const sent: unknown[] = []
  const statuses: number[] = []
  const r = {
    json: (body: unknown) => void sent.push(body),
    status: (code: number) => {
      statuses.push(code)
      return r
    },
  }
  return { sent, statuses, r }
}

describe("answerRefusal", () => {
  const sentence = "Ez a rendelés nem előre utalással fizet."

  it("the handler's own mapping loses the sentence for both shapes: this is why it exists", () => {
    const error = new MedusaError(MedusaError.Types.CONFLICT, sentence)
    expect(getHttpResponseFromError(error).body.message).not.toBe(sentence)
    expect(getHttpResponseFromError(serializeError(error)).body.message).not.toBe(sentence)
  })

  it.each([
    ["an instance", new MedusaError(MedusaError.Types.CONFLICT, sentence)],
    ["a serialized one", serializeError(new MedusaError(MedusaError.Types.CONFLICT, sentence))],
  ])("answers %s with 409 and its sentence", (_name, error) => {
    const { sent, statuses, r } = res()
    expect(answerRefusal(r as never, error)).toBe(true)
    expect(statuses).toEqual([409])
    expect(sent).toEqual([{ type: "conflict", code: "refused", message: sentence }])
  })

  it.each([
    ["a NOT_FOUND", new MedusaError(MedusaError.Types.NOT_FOUND, "x")],
    ["a plain Error", new Error("x")],
    ["a look-alike object", { type: "conflict", message: "x" }],
  ])("leaves %s to the handler", (_name, error) => {
    const { sent, statuses, r } = res()
    expect(answerRefusal(r as never, error)).toBe(false)
    expect([statuses, sent]).toEqual([[], []])
  })
})
