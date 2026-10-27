import { CEG } from "@modules/layout/templates/footer/hivatkozasok"

/**
 * AZ ELERHETOSEGEK OLDALA (commerce-audit-p1, P1/11): a lablec "Elérhetőségek"
 * linkje eddig a regi UNAS boltra mutatott, ami a domainvaltas utan a sajat bolt
 * lenne. Az oldal CSAK a kodban mar allo ceg-adatokat mutatja (`CEG`, a lablec
 * forrasa): nev, cim, telefon, e-mail, nyitvatartas. Nem talal ki uj tartalmat
 * (szallitasi, fizetesi vagy atveteli szoveget nem tartalmaz; azok kulon
 * tartalmi dontesek, a Fizetes es Szallitas lapok sorsa nyitott).
 *
 * A telefon kattinthato (`tel:`, csak a szamjegyek es a `+`), az e-mail `mailto:`.
 * Ha a lablec adata valtozik, ez az oldal vele valtozik: egy forras.
 */
export const telHref = (telefon: string) =>
  `tel:${telefon.replace(/[^\d+]/g, "")}`

export function ElerhetosegekLap({ cim }: { cim: string }) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[760px] flex-col gap-8"
        data-testid="elerhetosegek"
      >
        <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
          {cim}
        </h1>
        <section className="border border-acr-line bg-acr-white px-5 py-6 small:px-8 small:py-8">
          <h2 className="mb-4 text-[22px] font-normal text-acr-ink">
            {CEG.nev}
          </h2>
          <dl className="flex flex-col gap-5 text-[15px] text-acr-ink">
            <div>
              <dt className="text-[13px] text-acr-slate">Cím</dt>
              <dd data-testid="elerhetoseg-cim">{CEG.cim}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-acr-slate">Telefon</dt>
              <dd>
                <a
                  href={telHref(CEG.telefon)}
                  className="underline"
                  data-testid="elerhetoseg-telefon"
                >
                  {CEG.telefon}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-acr-slate">E-mail</dt>
              <dd>
                <a
                  href={`mailto:${CEG.email}`}
                  className="underline"
                  data-testid="elerhetoseg-email"
                >
                  {CEG.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-acr-slate">Nyitvatartás</dt>
              <dd>
                <ul
                  className="flex flex-col gap-1"
                  data-testid="elerhetoseg-nyitvatartas"
                >
                  {CEG.nyitvatartas.map((sor) => (
                    <li key={sor}>{sor}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
