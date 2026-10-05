/**
 * Forint, whole: "14 000 Ft", "3 500 Ft", grouped by three with a no-break
 * space. Written out, not `Intl`: hu-HU leaves four digits ungrouped ("3500"
 * next to "14 000" in one mail), and the backend's TypeScript lib has no
 * `useGrouping: "always"`.
 */
export const forint = (amount: number): string => {
  const whole = Math.round(amount)
  const digits = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")
  return `${whole < 0 ? "-" : ""}${digits} Ft`
}

/** Every text that goes into the HTML body passes here: titles come from the catalogue. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export const SHOP_NAME = "Acropora tengeri akvarisztika"

/** The frame of every shop mail: inline styles only (many clients drop <style>). */
export const htmlDocument = (body: string): string =>
  [
    "<!DOCTYPE html>",
    '<html lang="hu"><head><meta charset="utf-8"></head>',
    '<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1f2937;">',
    body,
    `<p style="margin-top:24px;color:#6b7280;font-size:12px;">${escapeHtml(SHOP_NAME)}</p>`,
    "</body></html>",
  ].join("\n")
