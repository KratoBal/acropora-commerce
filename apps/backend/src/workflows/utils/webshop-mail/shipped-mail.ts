import { escapeHtml, forint, htmlDocument, SHOP_NAME } from "./format"
import type { MailContent } from "./order-placed-mail"

/**
 * THE "FELADTUK" MAIL (Foxpost brief, point 12; Figma 488:109 FOXPOST,
 * 488:131 GLS point, 488:150 GLS home).
 *
 * IT GOES ONLY WITH A TRACKING NUMBER: the OS calls the shipping-notice
 * endpoint when the parcel exists at the carrier, with the carrier's number.
 * It promises no delivery day, and no "Csomag követése" button without a
 * tracking address the OS got from the carrier (we do not build one).
 *
 * The contact line names the shop's own address (webshop@, the sender and the
 * storefront footer's address); the frame shows info@.
 */
export type ShippedCarrier = "foxpost" | "gls"

export type ShippedMailFacts = {
  display_id: number | string
  carrier: ShippedCarrier
  /** "FOXPOST A-BOX …", "GLS csomagpont …", or the delivery method's name. */
  destination_title: string
  destination_address: string
  /** True when the parcel goes to a GLS point (488:131), false for home (488:150). */
  gls_point: boolean
  tracking_number: string
  tracking_url: string | null
  items: { title: string; quantity: number }[]
  /** Cash on delivery: the exact amount due on pickup; null otherwise. */
  cod_amount: number | null
  /** The official FOXPOST logo on the storefront, absolute; null: no image. */
  foxpost_logo_url: string | null
}

export const SHOP_CONTACT = "webshop@acropora.hu"

const carrierName = (facts: ShippedMailFacts) =>
  facts.carrier === "foxpost"
    ? "FOXPOST – Packeta Group"
    : facts.gls_point
      ? "GLS csomagpont"
      : "GLS házhozszállítás"

export const renderShippedMail = (facts: ShippedMailFacts): MailContent => {
  const subject = `Feladtuk a csomagodat (#${facts.display_id})`
  const carrier = carrierName(facts)
  const destination = [facts.destination_title, facts.destination_address]
    .filter((part) => part && part !== carrier)
    .join(" · ")
  const lines = facts.items.map((item) => `${item.title} × ${item.quantity}`)

  const text = [
    "CSOMAG FELADVA",
    `Feladtuk a csomagodat\nRendelés: #${facts.display_id}`,
    "A csomagodat átadtuk a szállítónak. Az alábbi adatokkal tudod követni.",
    [
      carrier,
      destination,
      `Követési szám: ${facts.tracking_number}`,
      ...(facts.tracking_url ? [`Csomag követése: ${facts.tracking_url}`] : []),
    ]
      .filter(Boolean)
      .join("\n"),
    ...(facts.cod_amount !== null ? [`ÁTVÉTELKOR FIZETENDŐ: ${forint(facts.cod_amount)}`] : []),
    ["A csomagban:", ...lines.map((line) => `- ${line}`)].join("\n"),
    `Kérdésed van? Írj nekünk: ${SHOP_CONTACT}`,
    SHOP_NAME,
  ].join("\n\n")

  const logo =
    facts.carrier === "foxpost" && facts.foxpost_logo_url
      ? `<img src="${escapeHtml(facts.foxpost_logo_url)}" alt="FOXPOST – Packeta Group" width="140" style="display:block;margin-bottom:8px;" />`
      : ""
  const button = facts.tracking_url
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(facts.tracking_url)}" style="display:block;background:#0f1720;color:#ffffff;text-align:center;padding:12px 16px;text-decoration:none;font-weight:bold;">Csomag követése</a></p>`
    : ""
  const cod =
    facts.cod_amount !== null
      ? `<div style="margin-top:16px;border:1px solid #d97b2f;background:#fdf3ea;padding:14px 16px;">` +
        `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">ÁTVÉTELKOR FIZETENDŐ</p>` +
        `<p style="margin:6px 0 0;font-size:20px;font-weight:bold;">${escapeHtml(forint(facts.cod_amount))}</p></div>`
      : ""

  const html = htmlDocument(
    [
      `<p style="margin:0;color:#d97b2f;font-size:11px;font-weight:bold;letter-spacing:0.08em;">CSOMAG FELADVA</p>`,
      `<h1 style="font-size:26px;margin:8px 0 4px;">Feladtuk a csomagodat</h1>`,
      `<p style="margin:0;color:#6b7280;">Rendelés: #${escapeHtml(String(facts.display_id))}</p>`,
      `<p>A csomagodat átadtuk a szállítónak. Az alábbi adatokkal tudod követni.</p>`,
      `<div style="border:1px solid #e5e7eb;background:#f4f3ef;padding:16px;">` +
        logo +
        `<p style="margin:0;font-weight:bold;">${escapeHtml(carrier)}</p>` +
        (destination ? `<p style="margin:8px 0 0;color:#6b7280;font-size:13px;">${escapeHtml(destination)}</p>` : "") +
        `<p style="margin:12px 0 0;color:#6b7280;font-size:11px;">Követési szám</p>` +
        `<p style="margin:2px 0 0;font-size:18px;font-weight:bold;">${escapeHtml(facts.tracking_number)}</p>` +
        button +
        `</div>`,
      cod,
      `<h2 style="font-size:16px;margin:20px 0 8px;">A csomagban</h2>`,
      `<ul style="padding-left:18px;margin:0;">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
      `<p style="margin-top:24px;color:#6b7280;font-size:12px;">Kérdésed van? Írj nekünk: ${escapeHtml(SHOP_CONTACT)}</p>`,
    ].join("\n")
  )

  return { subject, text, html }
}
