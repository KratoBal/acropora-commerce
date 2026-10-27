import {
  MEGRENDELES_VEGOSSZEG_FELIRAT,
  SZALLITASI_KOLTSEG_FELIRAT,
  SZALLITASI_MODOK,
  SZALLITASI_MODOK_CIM,
  type Reszlet,
} from "./regi-bolt-szovegek"

/**
 * A SZALLITAS OLDALA (`/hu/szallitas`, commerce-audit-p1, lablec): a lablec
 * "Szállítás" linkje eddig a regi UNAS bolt `shop_contact.php?tab=shipping`
 * oldalara mutatott. A szoveg a regi oldalé, szo szerint (`regi-bolt-szovegek.ts`,
 * forras es datum ott). Nem talalunk ki uj szoveget.
 */
function Szoveg({ reszek }: { reszek: readonly Reszlet[] }) {
  return (
    <>
      {reszek.map((resz, i) =>
        typeof resz === "string" ? (
          <span key={i}>{resz}</span>
        ) : (
          <a
            key={i}
            href={resz.href}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {resz.link}
          </a>
        ),
      )}
    </>
  )
}

export function SzallitasLap({ cim }: { cim: string }) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[760px] flex-col gap-8"
        data-testid="szallitas"
      >
        <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
          {cim}
        </h1>
        <h2 className="text-[22px] font-normal text-acr-ink">
          {SZALLITASI_MODOK_CIM}
        </h2>
        <ul className="flex flex-col gap-4">
          {SZALLITASI_MODOK.map((mod) => (
            <li
              key={mod.nev}
              className="border border-acr-line bg-acr-white px-5 py-5 small:px-8 small:py-6"
              data-testid="szallitasi-mod"
            >
              <h3 className="mb-2 text-[17px] font-semibold text-acr-ink">
                {mod.nev}
              </h3>
              {mod.leiras ? (
                <p className="mb-3 text-[15px] text-acr-ink">
                  <Szoveg reszek={mod.leiras} />
                </p>
              ) : null}
              {mod.savok ? (
                <table className="w-full text-left text-[15px] text-acr-ink">
                  <thead>
                    <tr className="text-[13px] text-acr-slate">
                      <th colSpan={2} className="py-1 pr-4 font-normal">
                        {MEGRENDELES_VEGOSSZEG_FELIRAT}
                      </th>
                      <th className="py-1 font-normal">
                        {SZALLITASI_KOLTSEG_FELIRAT}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mod.savok.map((sav) => (
                      <tr key={sav.tol}>
                        <td className="py-1 pr-4">{sav.tol}</td>
                        <td className="py-1 pr-4">{sav.ig}</td>
                        <td className="py-1 font-semibold">{sav.koltseg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[15px] text-acr-ink">
                  <span className="text-[13px] text-acr-slate">
                    {SZALLITASI_KOLTSEG_FELIRAT}
                  </span>{" "}
                  <span className="font-semibold">{mod.koltseg}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
