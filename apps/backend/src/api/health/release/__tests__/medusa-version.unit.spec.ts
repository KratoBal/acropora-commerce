import { runningMedusaVersion } from "../medusa-version"

describe("runningMedusaVersion", () => {
  /**
   * The default argument is the INSTALLED package. Its version must look like a
   * release number; the exact number is not pinned here, because pinning it
   * would turn every upgrade into a red test for the wrong reason.
   */
  it("reads a release number from the installed @medusajs/medusa", () => {
    expect(runningMedusaVersion()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it("returns the version it is given", () => {
    expect(runningMedusaVersion({ version: "2.20.1" })).toBe("2.20.1")
  })

  it("answers null rather than a guess when the manifest has no usable version", () => {
    expect(runningMedusaVersion({})).toBeNull()
    expect(runningMedusaVersion({ version: 2 })).toBeNull()
    expect(runningMedusaVersion({ version: "  " })).toBeNull()
  })
})
