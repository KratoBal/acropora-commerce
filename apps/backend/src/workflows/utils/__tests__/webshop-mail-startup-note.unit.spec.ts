import { webshopMailStartupNote } from "../webshop-mail-config"

const KEYS = {
  GMAIL_WEBSHOP_CLIENT_ID: "id",
  GMAIL_WEBSHOP_CLIENT_SECRET: "secret-value-1",
  GMAIL_WEBSHOP_REFRESH_TOKEN: "refresh-value-2",
}

describe("webshopMailStartupNote", () => {
  it("is null when the mail is on with all three keys", () => {
    expect(webshopMailStartupNote({ ACROPORA_WEBSHOP_MAIL: "on", ...KEYS })).toBeNull()
  })

  it("says the mail is off when the switch is not exactly on (unset, blank, other words)", () => {
    for (const value of [undefined, "", "true", "ON", "yes", "off"]) {
      const note = webshopMailStartupNote({ ACROPORA_WEBSHOP_MAIL: value, ...KEYS })
      expect(note).toContain("nincs bekapcsolva")
      expect(note).toContain("ACROPORA_WEBSHOP_MAIL")
    }
  })

  it("names exactly the missing keys when it is on without all three", () => {
    const note = webshopMailStartupNote({
      ACROPORA_WEBSHOP_MAIL: "on",
      GMAIL_WEBSHOP_CLIENT_ID: "id",
      GMAIL_WEBSHOP_CLIENT_SECRET: "  ",
    })
    expect(note).toContain("GMAIL_WEBSHOP_CLIENT_SECRET, GMAIL_WEBSHOP_REFRESH_TOKEN")
    expect(note).not.toContain("GMAIL_WEBSHOP_CLIENT_ID")
  })

  it("never carries a value", () => {
    const note = webshopMailStartupNote({ ACROPORA_WEBSHOP_MAIL: "on", ...KEYS, GMAIL_WEBSHOP_REFRESH_TOKEN: "" })
    expect(note).not.toContain("secret-value-1")
    expect(note).not.toContain("refresh-value-2")
  })
})
