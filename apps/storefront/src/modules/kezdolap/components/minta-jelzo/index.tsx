/**
 * A MINTA-ADAT JELZOJE.
 *
 * Minden sav, ami a `minta-adat.ts` fajlbol olvas, ezt a cimket viseli. Nem
 * dekoracio: ez a kulonbseg egy hirdetes es egy helykitolto kozott.
 *
 * MIERT A LAPON ALL ES NEM CSAK A KODBAN: a kezdolap kepernyokepen utazik
 * tovabb (atadas, dontes, visszajelzes). Egy kodbeli megjegyzes a kepre nem
 * kerul ra, a cimke igen.
 *
 * MIERT NEM `title` VAGY `aria-label`: azok csak akkor latszanak, ha valaki
 * rajuk mozog. A jelzonek akkor is ott kell lennie, amikor senki nem keresi.
 */
const MintaJelzo = ({ mit }: { mit: string }) => {
  return (
    <span
      data-testid="minta-jelzo"
      className="inline-flex items-center gap-2 border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        borderColor: "var(--terv-kiemel)",
        color: "var(--terv-kiemel-tinta)",
        background: "var(--terv-hatter-lap)",
      }}
    >
      Minta adat
      <span className="font-normal normal-case opacity-80">{mit}</span>
    </span>
  )
}

export default MintaJelzo
