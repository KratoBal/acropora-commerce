import type { Szovegek } from "@modules/kezdolap/szovegek"

const VELEMENYEK = [1, 2, 3]

/**
 * A VELEMENYEK SAVJA: az ertekeles osszegzese es harom idezet. Minden szoveg
 * szerkesztheto, a nev es az idezet is: a lapon allo vevoi velemenyeket az OS
 * szerkesztoje adja, nem ez a komponens. Az ot csillag diszites (nem adat).
 */
const Velemenyek = ({ s }: { s: Szovegek }) => (
  <section
    data-testid="velemenyek"
    className="px-4 py-10 small:px-16"
    style={{ color: "var(--kl-szoveg)" }}
  >
    <div className="mb-14 flex flex-col gap-4 small:flex-row small:items-end small:justify-between">
      <h2
        className="font-kiemelt text-4xl font-normal small:text-[46px]"
        style={{ color: "var(--kl-navy)" }}
      >
        {s.szoveg("velemenyek.cim")}
      </h2>
      <div
        className="flex items-center gap-3 text-[15px]"
        style={{ color: "var(--kl-halvany)" }}
      >
        <span
          aria-hidden="true"
          className="tracking-[2px]"
          style={{ color: "var(--kl-narancs)" }}
        >
          ★★★★★
        </span>
        <span>
          <b style={{ color: "var(--kl-szoveg)" }}>{s.szoveg("velemenyek.pont")}</b>{" "}
          · {s.szoveg("velemenyek.szoveg")}
        </span>
      </div>
    </div>
    <div className="grid gap-14 small:grid-cols-3">
      {VELEMENYEK.map((n) => (
        <figure
          key={n}
          className="flex flex-col gap-5 border-t pt-7"
          style={{ borderColor: "var(--kl-navy)" }}
        >
          <blockquote
            className="font-kiemelt text-2xl italic leading-[1.4]"
            style={{ color: "var(--kl-navy)" }}
          >
            {s.szoveg(`velemenyek.${n}.idezet`)}
          </blockquote>
          <figcaption className="text-[14px]" style={{ color: "var(--kl-halvany)" }}>
            <b style={{ color: "var(--kl-szoveg)" }}>{s.szoveg(`velemenyek.${n}.nev`)}</b>{" "}
            · {s.szoveg(`velemenyek.${n}.megjegyzes`)}
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
)

export default Velemenyek
