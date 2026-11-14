import {
  MIAGOND_CIM,
  MIAGOND_FIGYELMEZTETES,
  szovegDarabok,
  TUNET_OLDALAK,
  type TunetOldal,
} from "@lib/util/mi-a-gond"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const LETEZO: ReadonlySet<number> = new Set(TUNET_OLDALAK.map((o) => o.szam))
const SLUG_SZAMRA = new Map(TUNET_OLDALAK.map((o) => [o.szam, o.slug]))

/** A szoveg, az "N. oldal" hivatkozasok linkkel (csak a letezo oldalakra). */
function Szoveg({ szoveg }: { szoveg: string }) {
  return (
    <>
      {szovegDarabok(szoveg, LETEZO).map((darab, i) =>
        "szam" in darab ? (
          <LocalizedClientLink
            key={i}
            href={`/mi-a-gond/${SLUG_SZAMRA.get(darab.szam)}`}
            className="underline"
            data-testid="tunet-kereszt"
          >
            {darab.szoveg}
          </LocalizedClientLink>
        ) : (
          <span key={i}>{darab.szoveg}</span>
        ),
      )}
    </>
  )
}

function Lista({
  elemek,
  rendezett = false,
  testid,
}: {
  elemek: readonly string[]
  rendezett?: boolean
  testid: string
}) {
  if (elemek.length === 0) return null
  const Tag = rendezett ? "ol" : "ul"
  return (
    <Tag
      className={`flex flex-col gap-1 pl-5 text-[15px] text-acr-ink ${rendezett ? "list-decimal" : "list-disc"}`}
      data-testid={testid}
    >
      {elemek.map((elem) => (
        <li key={elem}>
          <Szoveg szoveg={elem} />
        </li>
      ))}
    </Tag>
  )
}

function Szakasz({
  cim,
  testid,
  children,
}: {
  cim: string
  testid: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2" data-testid={testid}>
      <h2 className="text-[22px] font-normal text-acr-ink">{cim}</h2>
      {children}
    </section>
  )
}

/**
 * EGY TUNET OLDALA (V4.3, kartya 85545d1f): hogy nez ki, ELOSZOR EZT MERD MEG, gyakori okok, teendok sorrendben, mit NE csinalj,
 * mikor kerj segitseget, es CSAK A VEGEN a kapcsolodo termekek (meroeszkozok, majd a bolti szoveg altal megnevezett termekek).
 * A termekek cime a bolt valasza (`termekek`: kezelo -> cim, csak a megvehetok), ar es keszlet nem all az oldalon.
 * FEJLECREND: h1 a tunet, h2 a szakaszok, h3 a termek-csoportok (axe heading-order).
 */
export default function TunetOldalLap({
  oldal,
  termekek,
}: {
  oldal: TunetOldal
  /** bolti kezelo -> bolti cim; amelyik hianyzik, nem jelenik meg */
  termekek: Readonly<Record<string, string>>
}) {
  const t = oldal.termekek
  const meroeszkozok = t.meroeszkozok.filter((x) => termekek[x.handle])
  const kezelok = t.kezelok
    .map((k) => ({
      ...k,
      kaphato: k.termekek.filter((x) => termekek[x.handle]),
    }))
    .filter((k) => k.kaphato.length > 0)
  const vanTermekSzakasz =
    meroeszkozok.length > 0 ||
    t.meroSzoveg !== "" ||
    t.meroTovabba !== "" ||
    t.eszkozMondat !== "" ||
    t.ovatossag.length > 0 ||
    kezelok.length > 0 ||
    t.utolso.length > 0
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[760px] flex-col gap-8"
        data-testid="tunet-oldal"
      >
        <header className="flex flex-col gap-3">
          <p className="text-[14px] text-acr-slate">
            <LocalizedClientLink href="/mi-a-gond" className="underline">
              {MIAGOND_CIM}
            </LocalizedClientLink>
          </p>
          <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
            {oldal.cim}
          </h1>
        </header>
        <Szakasz cim="Hogy néz ki, és mit jelent" testid="tunet-kinez">
          {oldal.kinez.map((bekezdes) => (
            <p key={bekezdes} className="text-[15px] text-acr-ink">
              <Szoveg szoveg={bekezdes} />
            </p>
          ))}
          {oldal.lasdMeg.map((sor) => (
            <p key={sor} className="text-[15px] text-acr-slate">
              <strong className="font-medium">Lásd még: </strong>
              <Szoveg szoveg={sor} />
            </p>
          ))}
        </Szakasz>
        {oldal.merd.length > 0 ? (
          <Szakasz cim="Először ezt mérd meg" testid="tunet-merd">
            <Lista elemek={oldal.merd} testid="tunet-merd-lista" />
          </Szakasz>
        ) : null}
        {oldal.okok.length > 0 ? (
          <Szakasz cim="Gyakori okok" testid="tunet-okok">
            <Lista elemek={oldal.okok} testid="tunet-okok-lista" />
          </Szakasz>
        ) : null}
        {oldal.teendok.length > 0 ? (
          <Szakasz cim="Teendők sorrendben" testid="tunet-teendok">
            <Lista
              elemek={oldal.teendok}
              rendezett
              testid="tunet-teendok-lista"
            />
          </Szakasz>
        ) : null}
        {oldal.nene.length > 0 ? (
          <Szakasz cim="Mit ne csinálj" testid="tunet-nene">
            <Lista elemek={oldal.nene} testid="tunet-nene-lista" />
          </Szakasz>
        ) : null}
        {oldal.segitseg.length > 0 ? (
          <Szakasz cim="Mikor kérj segítséget" testid="tunet-segitseg">
            {oldal.segitseg.map((bekezdes) => (
              <p key={bekezdes} className="text-[15px] text-acr-ink">
                <Szoveg szoveg={bekezdes} />
              </p>
            ))}
          </Szakasz>
        ) : null}
        {vanTermekSzakasz ? (
          <Szakasz cim="Kapcsolódó termékek" testid="tunet-termekek">
            {t.ovatossag.map((mondat) => (
              <p key={mondat} className="text-[15px] text-acr-ink">
                {mondat}
              </p>
            ))}
            {meroeszkozok.length > 0 ||
            t.meroSzoveg !== "" ||
            t.meroTovabba !== "" ||
            t.eszkozMondat !== "" ? (
              <div
                className="flex flex-col gap-2"
                data-testid="tunet-meroeszkozok"
              >
                {meroeszkozok.length > 0 && t.meroSzoveg === "" ? (
                  <h3 className="text-[17px] font-medium text-acr-ink">
                    Mérőeszközök
                  </h3>
                ) : null}
                {t.meroSzoveg !== "" ? (
                  <p className="text-[15px] text-acr-ink">{t.meroSzoveg}</p>
                ) : null}
                {meroeszkozok.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {meroeszkozok.map((x) => (
                      <li
                        key={x.handle}
                        className="border border-acr-line bg-acr-white px-5 py-3"
                      >
                        <LocalizedClientLink
                          href={`/termek/${x.handle}`}
                          className="text-[15px] underline"
                          data-testid="tunet-termek"
                        >
                          {termekek[x.handle]}
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {t.meroTovabba !== "" ? (
                  <p
                    className="text-[15px] text-acr-ink"
                    data-testid="tunet-mero-tovabba"
                  >
                    {meroeszkozok.length > 0 ? "Továbbá" : "Mérőeszközök"}:{" "}
                    {t.meroTovabba}.
                  </p>
                ) : null}
                {t.eszkozMondat !== "" ? (
                  <p
                    className="text-[15px] text-acr-ink"
                    data-testid="tunet-eszkoz"
                  >
                    {t.eszkozMondat}
                  </p>
                ) : null}
              </div>
            ) : null}
            {kezelok.length > 0 ? (
              <div className="flex flex-col gap-2" data-testid="tunet-kezelok">
                <h3 className="text-[17px] font-medium text-acr-ink">
                  A bolti szöveg szerint a tünetet említő termékek
                </h3>
                {t.bevezeto ? (
                  <p className="text-[13px] text-acr-slate">{t.bevezeto}</p>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {kezelok.map((k) => (
                    <li
                      key={k.termekek.map((x) => x.handle).join("+")}
                      className="flex flex-col gap-1 border border-acr-line bg-acr-white px-5 py-3"
                    >
                      {k.kaphato.map((x) => (
                        <LocalizedClientLink
                          key={x.handle}
                          href={`/termek/${x.handle}`}
                          className="text-[15px] underline"
                          data-testid="tunet-termek"
                        >
                          {termekek[x.handle]}
                        </LocalizedClientLink>
                      ))}
                      {k.megjegyzes ? (
                        <span className="text-[13px] text-acr-slate">
                          {k.megjegyzes}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {t.utolso.map((mondat) => (
              <p key={mondat} className="text-[15px] text-acr-ink">
                <Szoveg szoveg={mondat} />
              </p>
            ))}
          </Szakasz>
        ) : null}
        <p className="text-[13px] text-acr-slate">{MIAGOND_FIGYELMEZTETES}</p>
      </div>
    </div>
  )
}
