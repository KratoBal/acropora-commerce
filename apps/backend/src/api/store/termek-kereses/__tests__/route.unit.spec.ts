import { GET } from "../route";

/**
 * A KERESES VEGPONTJA NEM VAG LE KETSZAZNAL (kartya 30b376de).
 *
 * A regebbi talalatok kiestek, mert a vegpont 200 azonositot adott vissza, es a kirakat az osszeset egy lekerdezes
 * cimebe tette. A kirakat most csomagokban kerdez, a vegpont hatara a valasz merete elleni vedelem. A spec az SQL
 * `LIMIT` ertekebol ES a valaszbol is meri a hatart: 201-et is visszaad, es csak a hatar felett jelzi a `csonkolt`
 * mezot.
 */
const HATAR = 3000;

const hivas = async (sorokSzama: number) => {
  const sql: string[] = [];
  const sorok = Array.from({ length: sorokSzama }, (_, i) => ({ id: `prod_${i}` }));
  const req = {
    query: { q: "szűrő" },
    scope: {
      resolve: () => ({
        raw: async (szoveg: string) => {
          sql.push(szoveg);
          // az SQL `LIMIT` ertekeig ad sorokat, ahogy a Postgres
          const limit = Number(/LIMIT (\d+)/.exec(szoveg)?.[1] ?? 0);
          return { rows: sorok.slice(0, limit) };
        },
      }),
    },
  };
  let body: { ids: string[]; count: number; csonkolt: boolean } | undefined;
  const res = {
    json(valasz: typeof body) {
      body = valasz;
    },
  };
  await GET(req as never, res as never);
  return { body: body!, sql: sql[0] };
};

describe("GET /store/termek-kereses, a felso hatar", () => {
  it("a 201. azonositot is visszaadja, es nem jelzi csonkoltnak", async () => {
    const { body } = await hivas(250);

    expect(body.ids).toHaveLength(250);
    expect(body.ids[200]).toBe("prod_200");
    expect(body.count).toBe(250);
    expect(body.csonkolt).toBe(false);
  });

  it("a hatar felett levag, es KIMONDJA: csonkolt, a darabszam a hatar", async () => {
    const { body, sql } = await hivas(HATAR + 500);

    expect(sql).toContain(`LIMIT ${HATAR + 1}`);
    expect(body.ids).toHaveLength(HATAR);
    expect(body.count).toBe(HATAR);
    expect(body.csonkolt).toBe(true);
  });

  it("pontosan a hataron meg nem csonkolt", async () => {
    const { body } = await hivas(HATAR);

    expect(body.ids).toHaveLength(HATAR);
    expect(body.csonkolt).toBe(false);
  });
});
