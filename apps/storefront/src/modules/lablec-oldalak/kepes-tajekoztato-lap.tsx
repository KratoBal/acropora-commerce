import KepesTajekoztatoBeagyazas from "./kepes-tajekoztato-beagyazas"

/**
 * A KEPES VASARLOI TAJEKOZTATO OLDALA (`/hu/jogi/kepes-tajekoztato`,
 * commerce-audit-p1, lablec). A tartalmat a Fogyasztobarat adja, a regi bolt
 * is csak beagyazza; a kirakat a sajat oldalan teszi ugyanezt.
 */
export function KepesTajekoztatoLap({ cim }: { cim: string }) {
  return (
    <div className="content-container py-12" data-testid="kepes-tajekoztato">
      <h1 className="text-3xl-semi mb-8">{cim}</h1>
      <KepesTajekoztatoBeagyazas />
    </div>
  )
}
