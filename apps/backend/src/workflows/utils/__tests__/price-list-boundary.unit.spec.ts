import { crossedBoundary, runBoundaryTick, type BoundaryRunState, type PriceListWindow } from "../price-list-boundary"

/*
  WHAT TURNS RED (card 54bb3779). A start or an end that fell between two looks not emptying the cache (the shop keeps
  the old price); a boundary counted twice (it was seen at `since`) or one still in the future counted early; an open end
  read as a boundary; the first tick after a restart not emptying; a failed call advancing the clock, so the boundary is
  never retried.
*/
const at = (iso: string) => new Date(iso)
const sale = (starts: string | null, ends: string | null): PriceListWindow => ({ starts_at: starts, ends_at: ends })

describe("crossedBoundary", () => {
  const since = at("2026-11-19T10:00:00Z")
  const now = at("2026-11-19T10:01:00Z")

  it("sees a start and an end inside (since, now], and takes ISO text as well as dates", () => {
    expect(crossedBoundary([sale("2026-11-19T10:00:30Z", null)], since, now)).toBe(true)
    expect(crossedBoundary([sale("2026-11-01T00:00:00Z", "2026-11-19T10:00:59Z")], since, now)).toBe(true)
    expect(crossedBoundary([{ starts_at: at("2026-11-19T10:00:30Z") }], since, now)).toBe(true)
  })

  it("counts the end of the window (now) and not its beginning (since)", () => {
    expect(crossedBoundary([sale("2026-11-19T10:01:00Z", null)], since, now)).toBe(true)
    expect(crossedBoundary([sale("2026-11-19T10:00:00Z", null)], since, now)).toBe(false)
  })

  it("does not count the past, the future, an open end or nothing", () => {
    expect(crossedBoundary([sale("2026-11-19T09:00:00Z", "2026-11-19T09:30:00Z")], since, now)).toBe(false)
    expect(crossedBoundary([sale("2026-11-19T11:00:00Z", "2026-11-20T00:00:00Z")], since, now)).toBe(false)
    expect(crossedBoundary([sale("2026-11-01T00:00:00Z", null)], since, now)).toBe(false)
    expect(crossedBoundary([{}, { starts_at: "not a date", ends_at: null }], since, now)).toBe(false)
    expect(crossedBoundary([], since, now)).toBe(false)
  })
})

describe("runBoundaryTick", () => {
  const deps = (windows: PriceListWindow[], sent = true) => {
    const send = jest.fn().mockResolvedValue(sent)
    const activeWindows = jest.fn().mockResolvedValue(windows)
    return { deps: { send, activeWindows }, send, activeWindows }
  }

  it("empties once on the first tick without looking at the lists", async () => {
    const { deps: d, send, activeWindows } = deps([])
    const state: BoundaryRunState = { last: null }
    expect(await runBoundaryTick(d, state, at("2026-11-19T10:00:00Z"))).toBe("purged-first")
    expect(send).toHaveBeenCalledTimes(1)
    expect(activeWindows).not.toHaveBeenCalled()
    expect(state.last).toEqual(at("2026-11-19T10:00:00Z"))
  })

  it("is idle while no boundary falls, and empties when one does", async () => {
    const state: BoundaryRunState = { last: at("2026-11-19T10:00:00Z") }
    const quiet = deps([sale("2026-11-19T12:00:00Z", null)])
    expect(await runBoundaryTick(quiet.deps, state, at("2026-11-19T10:01:00Z"))).toBe("idle")
    expect(quiet.send).not.toHaveBeenCalled()
    const crossing = deps([sale("2026-11-19T10:01:30Z", null)])
    expect(await runBoundaryTick(crossing.deps, state, at("2026-11-19T10:02:00Z"))).toBe("purged")
    expect(crossing.send).toHaveBeenCalledTimes(1)
    expect(state.last).toEqual(at("2026-11-19T10:02:00Z"))
  })

  it("keeps the clock when the call fails, so the next tick tries the same boundary again", async () => {
    const state: BoundaryRunState = { last: at("2026-11-19T10:00:00Z") }
    const windows = [sale("2026-11-19T10:00:30Z", null)]
    const failing = deps(windows, false)
    expect(await runBoundaryTick(failing.deps, state, at("2026-11-19T10:01:00Z"))).toBe("failed")
    expect(state.last).toEqual(at("2026-11-19T10:00:00Z"))
    const working = deps(windows, true)
    expect(await runBoundaryTick(working.deps, state, at("2026-11-19T10:02:00Z"))).toBe("purged")
  })

  it("does not take the first tick as done when its call fails", async () => {
    const state: BoundaryRunState = { last: null }
    expect(await runBoundaryTick(deps([], false).deps, state, at("2026-11-19T10:00:00Z"))).toBe("failed")
    expect(state.last).toBeNull()
  })
})
