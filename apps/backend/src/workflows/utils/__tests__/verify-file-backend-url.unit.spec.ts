import {
  describeFileBackendUrlProblem,
  verifyFileBackendUrl,
} from "../verify-file-backend-url"

/**
 * THE PUBLIC IMAGE PREFIX.
 *
 * The failure this guards against is silent: with nothing configured the
 * provider falls back to `http://localhost:9000/static`, the deploy looks
 * healthy, and only the CUSTOMER sees a broken image. These assertions hold the
 * refusals in place - and, just as importantly, hold the ACCEPTANCE in place,
 * so the guard cannot quietly become "refuse everything".
 */

describe("the public image prefix", () => {
  it("accepts a full public address that carries the /static path", () => {
    /*
      THE POSITIVE CONTROL, AND IT IS NOT DECORATION. Without it a version that
      refuses every value would satisfy all the refusal assertions below - and
      the shop would simply never start.
    */
    const check = verifyFileBackendUrl(
      "https://commerce-stage.acropora.hu/static",
    )
    expect(check.ok).toBe(true)
  })

  it("accepts a trailing slash, because path.join swallows it", () => {
    /*
      `.../static` and `.../static/` produce identical addresses, so refusing
      the second would be a rule about typing rather than about behaviour.
    */
    expect(
      verifyFileBackendUrl("https://commerce-stage.acropora.hu/static/").ok,
    ).toBe(true)
  })

  it("refuses a missing value instead of falling back", () => {
    /*
      WHAT TURNS THIS RED: a default. The deploy would come up, look healthy,
      and serve localhost addresses to customers - the exact fault being fixed.
    */
    const check = verifyFileBackendUrl(undefined)
    expect(check.ok).toBe(false)
    expect(!check.ok && check.problem).toBe("missing")
  })

  it("treats whitespace as missing, not as a value", () => {
    // A variable set to an empty string in a deploy file is indistinguishable
    // from an unset one for the person reading it, and the provider would fall
    // back either way.
    expect(verifyFileBackendUrl("   ").ok).toBe(false)
  })

  it("refuses a value the provider could not parse", () => {
    /*
      Left to the provider, this throws on the FIRST upload, deep inside the
      module and long after the deploy looked successful. Catching it at boot
      moves the same failure to where it is attributable.
    */
    const check = verifyFileBackendUrl("commerce-stage.acropora.hu/static")
    expect(!check.ok && check.problem).toBe("malformed")
  })

  it("refuses the site root, which is the mistake that looks correct", () => {
    /*
      THE MOST IMPORTANT ASSERTION HERE. A value without the path parses, looks
      like a sensible public address, and produces a wrong URL for EVERY image -
      in a way that reads like a typo in one product.

      WHAT TURNS THIS RED: dropping the path check and validating only the host.
    */
    const check = verifyFileBackendUrl("https://commerce-stage.acropora.hu")
    expect(!check.ok && check.problem).toBe("wrong-path")
  })
})

describe("what we say about it", () => {
  it("gives the three problems three different sentences", () => {
    /*
      The remedy differs: a missing variable, a mistyped value, and a value that
      looks right and points at the wrong place. One shared "bad value" sentence
      would fit all three and help with none.
    */
    const missing = describeFileBackendUrlProblem("missing")
    const malformed = describeFileBackendUrlProblem("malformed")
    const wrongPath = describeFileBackendUrlProblem("wrong-path")
    expect(missing).not.toBe(malformed)
    expect(missing).not.toBe(wrongPath)
    expect(malformed).not.toBe(wrongPath)
  })

  it("names the variable and shows the shape in every sentence", () => {
    /*
      The price of refusing to start is only fair if the message says what to
      fix. A refusal without the variable name is expensive.
    */
    for (const problem of ["missing", "malformed", "wrong-path"] as const)
      expect(describeFileBackendUrlProblem(problem)).toContain(
        "MEDUSA_FILE_BACKEND_URL",
      )
    expect(describeFileBackendUrlProblem("missing")).toContain("/static")
  })
})
