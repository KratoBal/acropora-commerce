import { getProductPrice } from "@lib/util/get-product-price"
import { listProducts } from "@lib/data/products"
import type { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CimLink from "@modules/kezdolap/components/cim-link"
import Konteiner from "@modules/kezdolap/components/konteiner"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { Szovegek } from "@modules/kezdolap/szovegek"
import PreviewPrice from "@modules/products/components/product-preview/price"
import Thumbnail from "@modules/products/components/thumbnail"

const LEPESEK = [1, 2, 3]
const MINTA_KULCSOK = [
  "korall.szoveg",
  "korall.1.cim",
  "korall.1.szoveg",
  "korall.2.cim",
  "korall.2.szoveg",
  "korall.3.cim",
  "korall.3.szoveg",
  "korall.gomb.felirat",
]

/**
 * AZ "EGYEDI KORALLOK" SAV: az OS-ben jelolt termekek (handle-jeik a bolt
 * `homepage-content` rekordjaban, sorrendben), egy nagy es tobb kisebb kartya,
 * a bal oldalon a szoveg es a harom lepes. Minden szoveg szerkesztheto.
 *
 * === A SAV ELTUNIK, HA NINCS MIT MUTATNI ===
 *
 * Nincs jelolt termek (a lista ures vagy `null`), vagy a bolt egyiket sem adja
 * vissza (torolt, nem publikalt, mas regio): a sav NEM jelenik meg. Egy "Ezt a
 * darabot kapod." fejlec ures racs folott rosszabb a hianyzo savnal.
 *
 * === A SORREND A LISTAE, NEM A BOLTE ===
 *
 * A bolt `handle` szurese a talalatot sajat sorrendjeben adja; a sav az OS
 * listajanak sorrendjeben rajzol, es amit a bolt nem adott vissza, azt kihagyja.
 * Az elso kartya a nagy.
 *
 * Az ar a termek legolcsobb valtozatanak ara a bolt aktualis regiojaban (ugyanaz
 * a `getProductPrice`, mint a termeklistan), a kod az elso valtozat cikkszama.
 */
export async function termekekHandleSzerint(
  handles: readonly string[],
  countryCode: string,
): Promise<HttpTypes.StoreProduct[]> {
  if (!handles.length) return []
  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: { handle: [...handles], limit: handles.length },
  })
  const byHandle = new Map(products.map((p) => [p.handle, p]))
  return handles.flatMap((h) => {
    const p = byHandle.get(h)
    return p ? [p] : []
  })
}

/**
 * A SAV MAGA, A TERMEKEKKEL. Kulon all, hogy az OS elo elonezete (kliensoldalon,
 * a handle-ekbol maga kerdezi le a termekeket) UGYANAZT rajzolja, mint a valodi
 * kezdolap; a valodi kezdolap az aszinkron burkolon at hivja.
 */
export const EgyediKorallokSav = ({
  s,
  termekek,
}: {
  s: Szovegek
  termekek: readonly HttpTypes.StoreProduct[]
}) => {
  if (!termekek.length) return null
  const gomb = s.link("korall.gomb.link")
  const gombFelirat = s.szoveg("korall.gomb.felirat")

  return (
    <section
      data-testid="egyedi-korallok"
      className="py-10"
      style={{ background: "#F6F4F0", color: "var(--kl-szoveg)" }}
    >
      <Konteiner>
        <div className="grid gap-10 small:grid-cols-[420px_1fr]">
          <div className="flex flex-col gap-8">
            <div>
              <div
                className="text-[13px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "var(--kl-narancs-tinta)" }}
              >
                {s.szoveg("korall.felirat")}
              </div>
              <h2
                className="mt-5 font-kiemelt text-5xl font-normal leading-[1.02] tracking-[-0.02em] small:text-[60px]"
                style={{ color: "var(--kl-navy)" }}
              >
                {s.szoveg("korall.cim")}
              </h2>
              <p
                className="mt-6 text-[17px]"
                style={{ color: "var(--kl-halvany)", textWrap: "pretty" }}
              >
                {s.szoveg("korall.szoveg")}
              </p>
            </div>
            <div
              className="border-t"
              style={{ borderColor: "var(--kl-keret)" }}
            >
              {LEPESEK.map((n) => (
                <div
                  key={n}
                  className="flex gap-[18px] border-b py-[14px]"
                  style={{ borderColor: "var(--kl-keret)" }}
                >
                  <span
                    className="w-[22px] font-kiemelt text-[22px]"
                    style={{ color: "var(--kl-kek)" }}
                  >
                    {n}
                  </span>
                  <div>
                    <div className="font-semibold">
                      {s.szoveg(`korall.${n}.cim`)}
                    </div>
                    <div
                      className="text-[15px]"
                      style={{ color: "var(--kl-halvany)" }}
                    >
                      {s.szoveg(`korall.${n}.szoveg`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {MINTA_KULCSOK.some((k) => s.minta(k)) ? (
              <div>
                <MintaJelzo mit="üzemi állítások és darabszám" />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-5 small:grid-cols-4">
            {termekek.map((termek, i) => {
              const ar = getProductPrice({ product: termek }).cheapestPrice
              const kod = termek.variants?.[0]?.sku
              return (
                <LocalizedClientLink
                  key={termek.id}
                  href={`/termek/${encodeURIComponent(termek.handle ?? "")}`}
                  className={`group flex flex-col gap-2 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                >
                  <div data-testid={i === 0 ? "korall-nagy" : "korall-kicsi"}>
                    <Thumbnail
                      alt={termek.title ?? ""}
                      thumbnail={termek.thumbnail}
                      images={termek.images}
                      size="full"
                      /*
                        NEM prioritas, az elsonek sem (commerce-audit-p1, T3):
                        a sav a kezdolap hajtasa ALATT all, tehat az elso
                        belyegkep elotoltese es fetchpriority=high-ja sávszélességet
                        vett el a hero H1-jetol, az LCP-elemtol.
                      */
                    />
                  </div>
                  {kod ? (
                    <div
                      className="text-[12px] uppercase tracking-[0.08em]"
                      style={{ color: "var(--kl-halvany)" }}
                    >
                      {kod}
                    </div>
                  ) : null}
                  <div
                    className="font-kiemelt text-xl"
                    style={{ color: "var(--kl-navy)" }}
                  >
                    {termek.title}
                  </div>
                  {termek.subtitle ? (
                    <div
                      className="text-[14px]"
                      style={{ color: "var(--kl-halvany)" }}
                    >
                      {termek.subtitle}
                    </div>
                  ) : null}
                  <div
                    className="flex items-center gap-x-2 text-sm font-semibold"
                    style={{ color: "var(--kl-szoveg)" }}
                  >
                    {ar ? <PreviewPrice price={ar} /> : null}
                  </div>
                </LocalizedClientLink>
              )
            })}
          </div>
        </div>
        {gomb && gombFelirat ? (
          <div className="mt-10 flex justify-center">
            <CimLink
              cim={gomb}
              className="rounded-[28px] px-6 py-[15px] text-[15px] font-semibold"
              style={{ background: "var(--kl-navy)", color: "var(--kl-lap)" }}
            >
              {gombFelirat}
            </CimLink>
          </div>
        ) : null}
      </Konteiner>
    </section>
  )
}

const EgyediKorallok = async ({
  s,
  handles,
  countryCode,
}: {
  s: Szovegek
  handles: readonly string[]
  countryCode: string
}) => (
  <EgyediKorallokSav
    s={s}
    termekek={await termekekHandleSzerint(handles, countryCode)}
  />
)

export default EgyediKorallok
