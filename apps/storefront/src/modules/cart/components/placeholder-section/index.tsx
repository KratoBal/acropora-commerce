/**
 * A TERV EGY DOBOZA, AMI MÖGÖTT MÉG NINCS FUNKCIÓ.
 *
 * === MIÉRT ÁLL ITT EGYÁLTALÁN ===
 *
 * Balázs kérése a vázra (2026-09-07): „ha ugy epul fel ahogy a tervben van de
 * meg nem mukodik a funkcio engem az se zavar! sot! annak orulnek a legjobban".
 * A doboz tehát a HELYÉT tartja: a lap elrendezése akkor is a terv szerinti,
 * amikor a tartalom még nem elérhető.
 *
 * === ÉS AMI EBBEN A NEHEZEBB RÉSZ: ÜRESEN KELL HAGYNI ===
 *
 * A tervben ezekben a dobozokban KONKRÉT értékek állnak („Foxpost automata
 * 1 490 Ft", „GLS futár 2 490 Ft"). Ezek ÉLŐ adatok: a szállítási módok és az
 * áraik a kosár tartalmától és a bolt beállításaitól függnek, és a kosár lap ma
 * nem kérdezi le őket -- a fizetési menet teszi.
 *
 * Beírva statikus szövegként a lap ÁRAT ÁLLÍTANA, amit semmi nem igazol. Egy
 * doboz, ami üresen áll, becsületes; egy doboz, amiben kitalált ár áll, nem az
 * -- és a különbséget a vevő nem látja, mert egy szám nem hibázik.
 *
 * Egy állítás tartja zárva: ezekben a dobozokban nem állhat számjegy.
 */
export default function PlaceholderSection({
  title,
  testId,
}: {
  /** A szakasz címe a tervből, változatlanul. */
  title: string
  testId: string
}) {
  return (
    <section className="flex flex-col gap-2" data-testid={testId}>
      <span
        className="text-[10.5px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--terv-szoveg-halvany)" }}
      >
        {title}
      </span>
      {/*
        A MELEG KERET, NEM A HIDEG -- ES EZ MERES, NEM IZLES.

        A ket token egyetlen szamban ter el, es az a SZINEZET:

          --terv-keret        oklch(0.88 0.005 250)   hideg
          --terv-keret-meleg  oklch(0.88 0.008 70)    meleg

        A kosar-tervben kiolvasva a keret-szinek MIND meleg szinezetuek
        (0.88/0.008/70 tizennegy elemen, plusz 0.9, 0.85, 0.89, 0.78, 0.82
        ugyanezen a szinezeten). A hideg, 250-es szinezetu keret a kosar
        tervlapjan EGYETLEN elemen sem fordul elo.

        Nautilus jelezte a ket token osszekeveresenek a veszelyet (14462), es
        igaza volt: itt tenyleg a hideg allt. Nem hibazik es nem hasal el --
        pontosan az a fajta elteres, ami senkinek nem tunik fel.
      */}
      <div
        className="min-h-[88px] border"
        style={{
          borderColor: "var(--terv-keret-meleg)",
          background: "var(--terv-hatter-lap)",
        }}
        aria-hidden="true"
      />
    </section>
  )
}

/** A két szakasz neve a tervből. */
export const PICKUP_SECTION_TITLE = "Átvétel"
export const PAYMENT_SECTION_TITLE = "Fizetés"
