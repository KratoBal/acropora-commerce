import { oszlopHajtogatva } from "./ekezet-hajtogatas";
import { szoMinta, type Feltetel, type Illesztes } from "./kereses-terv";

/**
 * A KERESESI TERV SQL-JE (V4.1). Minden ertek `?` helyorzobe megy, a felhasznalo
 * szovege sosem kerul a lekerdezes szovegebe; az oszlopneveket ez a fajl adja.
 *
 * Egy feltetel: a termek cime, alcime, leirasa VAGY egy elo valtozatanak
 * cikkszama illeszkedik a feltetel BARMELYIK illesztesere. A feltetelek kozott
 * ES van (mint eddig a szavak kozott).
 */
const TERMEK_OSZLOPOK = [
  "p.title",
  "coalesce(p.subtitle, '')",
  "coalesce(p.description, '')",
];

/** A LIKE harom kulonleges jele (\\, %, _) szo szerint. */
export function likeEscape(ertek: string): string {
  return ertek.replace(/[\\%_]/g, "\\$&");
}

function oszlopIllesztes(
  oszlop: string,
  illesztes: Illesztes,
  ertekek: string[],
): string {
  if (illesztes.fajta === "szo") {
    ertekek.push(szoMinta(illesztes.ertek));
    return `${oszlopHajtogatva(oszlop)} ~ ?`;
  }
  // a felhasznalo % es _ jele betu, nem joker (barracuda, #650): visszaper-escape, ESCAPE-pel
  ertekek.push(`%${likeEscape(illesztes.ertek)}%`);
  return `${oszlopHajtogatva(oszlop)} LIKE ? ESCAPE '\\'`;
}

function barmelyik(
  oszlop: string,
  feltetel: Feltetel,
  ertekek: string[],
): string {
  return `(${feltetel.map((i) => oszlopIllesztes(oszlop, i, ertekek)).join(" OR ")})`;
}

export function sqlFeltetelek(terv: Feltetel[]): {
  feltetelek: string;
  ertekek: string[];
} {
  const ertekek: string[] = [];
  const reszek = terv.map((feltetel) => {
    const termek = TERMEK_OSZLOPOK.map((oszlop) =>
      barmelyik(oszlop, feltetel, ertekek),
    );
    const valtozat = barmelyik("coalesce(v.sku, '')", feltetel, ertekek);
    return `(
      ${termek.join("\n      OR ")}
      OR EXISTS (
        SELECT 1 FROM product_variant v
        WHERE v.product_id = p.id
          AND v.deleted_at IS NULL
          AND ${valtozat}
      )
    )`;
  });
  return { feltetelek: reszek.join(" AND "), ertekek };
}
