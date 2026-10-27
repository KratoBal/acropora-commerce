import type { Marka } from "@lib/data/brands"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A MARKALISTA TORZSE: a markak nev szerint, betunkent csoportositva. Logo
 * nincs rajta (a logok gyujtese all, acrobot 36605); amig nincs marka, egy
 * mondat mondja meg, hogy a lista ures, nem egy ures racs.
 */
export function MarkaListaLap({
  cim,
  markak,
}: {
  cim: string
  markak: ReadonlyArray<Pick<Marka, "name" | "handle">>
}) {
  const betuk = new Map<string, Array<Pick<Marka, "name" | "handle">>>()
  for (const marka of [...markak].sort((a, b) =>
    a.name.localeCompare(b.name, "hu"),
  )) {
    const betu = (marka.name.trim()[0] ?? "#").toLocaleUpperCase("hu")
    // betu az, aminek van kis- es nagybetus alakja (az ekezetes is)
    const kulcs = betu.toLocaleLowerCase("hu") !== betu ? betu : "#"
    betuk.set(kulcs, [...(betuk.get(kulcs) ?? []), marka])
  }

  return (
    <div className="content-container py-12" data-testid="marka-lista-lap">
      <h1
        className="text-3xl-semi mb-8"
        style={{ color: "var(--terv-szoveg)" }}
      >
        {cim}
      </h1>
      {markak.length === 0 ? (
        <p
          className="txt-medium"
          style={{ color: "var(--terv-szoveg-halvany)" }}
          data-testid="marka-lista-ures"
        >
          Jelenleg nincs megjeleníthető márka.
        </p>
      ) : (
        <div className="flex flex-col gap-y-8">
          {Array.from(betuk.entries()).map(([betu, sor]) => (
            <section key={betu} aria-labelledby={`marka-betu-${betu}`}>
              <h2
                id={`marka-betu-${betu}`}
                className="txt-large-plus mb-3"
                style={{ color: "var(--terv-szoveg)" }}
              >
                {betu}
              </h2>
              <ul
                className="grid grid-cols-2 gap-x-6 gap-y-2 small:grid-cols-4 txt-medium"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                {sor.map((marka) => (
                  <li key={marka.handle}>
                    <LocalizedClientLink
                      className="hover:text-terv-szoveg"
                      href={`/marka/${encodeURIComponent(marka.handle)}`}
                    >
                      {marka.name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
