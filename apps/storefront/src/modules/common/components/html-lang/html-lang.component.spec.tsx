import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import HtmlLang from "./index"

/** MI PIROSIT: az angol lap `<html lang>`-ja nem `en`; a lap elhagyasa utan `en` marad (a magyar lap angol nyelvu lenne). */
afterEach(() => {
  cleanup()
  document.documentElement.lang = ""
})

describe("HtmlLang", () => {
  it("sets the document language, and gives the old one back when the page is left", () => {
    document.documentElement.lang = "hu"
    const { unmount } = render(<HtmlLang lang="en" />)
    expect(document.documentElement.lang).toBe("en")
    unmount()
    expect(document.documentElement.lang).toBe("hu")
  })
})
