import { GET } from "../[handle]/route";
import {
  elsodlegesKategoria,
  explicitAzonositok,
  HASONLO_HATAR,
  HELYETTE_HATAR,
  KIFUTOTT_KULCS,
  kifutott,
  valasztas,
} from "../jeloltek";

/*
  A NEM KAPHATO TERMEK LAPJANAK ADATA (V4.2, kartya 9d0523fa; acrobot 42186).

  MI PIROSIT: ha a publikalt vagy a jelolo nelkuli (keszulo, soha nem publikus)
  termekre valaszol; ha a gepi kategoria+marka jelolt a "helyette" listaba kerul;
  ha egy nem megveheto (vazlat, mas csatorna) termek barmelyik listaba kerul; ha
  a csak-kategoria jelolt (marka nelkul) kimegy; ha a sajat termek a listaban all.
*/

const KAT = { id: "pcat_1", name: "Tápoldatok", handle: "tapoldatok" };

describe("a jeloltek tiszta dontese", () => {
  it('a jelolo csak a pontos "true" ertek', () => {
    expect(KIFUTOTT_KULCS).toBe("discontinued");
    expect(kifutott({ discontinued: "true" })).toBe(true);
    for (const m of [
      null,
      {},
      { discontinued: "false" },
      { discontinued: true },
    ])
      expect(kifutott(m as Record<string, unknown> | null)).toBe(false);
  });

  it("az explicit lista vesszovel elvalasztott, ures es ismetelt elem nelkul", () => {
    expect(
      explicitAzonositok({ unas_similar_ids: " prod_a, ,prod_b,prod_a " }),
    ).toEqual(["prod_a", "prod_b"]);
    expect(explicitAzonositok({ unas_similar_ids: 5 })).toEqual([]);
    expect(explicitAzonositok(null)).toEqual([]);
  });

  it("az elsodleges kategoria a vetites kulcsa, nem az elso elem", () => {
    const masik = { id: "pcat_2", name: "Más", handle: "mas" };
    expect(
      elsodlegesKategoria({ primary_category_id: "pcat_1" }, [masik, KAT]),
    ).toEqual(KAT);
    expect(elsodlegesKategoria({}, [KAT])).toBeNull();
    expect(
      elsodlegesKategoria({ primary_category_id: "pcat_9" }, [KAT]),
    ).toBeNull();
  });

  it("ket kulon lista, csak megveheto termekkel, a sajat termek nelkul, hatarral", () => {
    const explicit = ["sajat", "a", "b", "vazlat"];
    const kategoriaMarkas = ["b", "c", "d"];
    expect(
      valasztas({
        sajatId: "sajat",
        explicit,
        kategoriaMarkas,
        megveheto: new Set(["a", "b", "c", "d", "sajat"]),
      }),
    ).toEqual({ helyette: ["a", "b"], hasonlo: ["c", "d"] });
    const sok = Array.from({ length: 30 }, (_, i) => `p${i}`);
    const r = valasztas({
      sajatId: "x",
      explicit: sok,
      kategoriaMarkas: sok.map((s) => `k${s}`),
      megveheto: new Set([...sok, ...sok.map((s) => `k${s}`)]),
    });
    expect(r.helyette).toHaveLength(HELYETTE_HATAR);
    expect(r.hasonlo).toHaveLength(HASONLO_HATAR);
  });
});

type Termek = {
  id: string;
  title: string;
  handle: string;
  status: string;
  metadata: Record<string, unknown> | null;
  categories: { id: string; name: string; handle: string }[];
};

function futtat({
  termek,
  markaKotesek = [],
  kategoriaMarkas = [],
  csatornas = {},
  csatornak = ["sc_kirakat"],
}: {
  termek: Termek | null;
  markaKotesek?: { product_id: string; os_brand_id: string }[];
  kategoriaMarkas?: string[];
  /** id -> [status, csatornak] */
  csatornas?: Record<string, [string, string[] | null]>;
  csatornak?: string[];
}) {
  const listaKeresek: unknown[] = [];
  const scope = {
    resolve: (kulcs: string) => {
      if (kulcs === "product")
        return {
          listProducts: async (filters: Record<string, unknown>) => {
            listaKeresek.push(filters);
            if ("handle" in filters) return termek ? [termek] : [];
            return kategoriaMarkas.map((id) => ({ id }));
          },
        };
      if (kulcs === "brand")
        return {
          listProductBrands: async (f: {
            product_id?: string[];
            os_brand_id?: string[];
          }) =>
            markaKotesek.filter(
              (k) =>
                f.product_id?.includes(k.product_id) ||
                f.os_brand_id?.includes(k.os_brand_id),
            ),
        };
      if (kulcs === "query")
        return {
          graph: async (q: { filters: { id: string[] } }) => ({
            data: q.filters.id
              .filter((id) => id in csatornas)
              .map((id) => ({
                id,
                status: csatornas[id]![0],
                sales_channels:
                  csatornas[id]![1]?.map((c) => ({ id: c })) ?? null,
              })),
          }),
        };
      if (kulcs === "logger") return { warn: () => undefined };
      throw new Error(`ismeretlen: ${kulcs}`);
    },
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  return GET(
    {
      params: { handle: "regi-termek" },
      scope,
      publishable_key_context: { sales_channel_ids: csatornak },
    } as never,
    res as never,
  ).then(() => ({ res, listaKeresek }));
}

const kifutottTermek: Termek = {
  id: "prod_regi",
  title: "Régi tápoldat",
  handle: "regi-termek",
  status: "draft",
  metadata: {
    discontinued: "true",
    primary_category_id: "pcat_1",
    unas_similar_ids: "prod_a,prod_vazlat,prod_masik_csatorna",
  },
  categories: [KAT],
};

describe("GET /store/nem-kaphato/:handle", () => {
  it("a kifutott termekre a nevet, a kategoriat es a ket listat adja", async () => {
    const { res, listaKeresek } = await futtat({
      termek: kifutottTermek,
      markaKotesek: [
        { product_id: "prod_regi", os_brand_id: "b1" },
        { product_id: "prod_m1", os_brand_id: "b1" },
        { product_id: "prod_a", os_brand_id: "b1" },
      ],
      kategoriaMarkas: ["prod_m1", "prod_a"],
      csatornas: {
        prod_a: ["published", ["sc_kirakat"]],
        prod_vazlat: ["draft", ["sc_kirakat"]],
        prod_masik_csatorna: ["published", ["sc_pult"]],
        prod_m1: ["published", ["sc_kirakat"]],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      termek: {
        id: "prod_regi",
        title: "Régi tápoldat",
        handle: "regi-termek",
        kategoria: KAT,
      },
      helyette: ["prod_a"],
      hasonlo: ["prod_m1"],
    });
    // a gepi jelolt csak publikalt, ugyanabban a kategoriaban, a marka termekeibol
    expect(listaKeresek[1]).toEqual({
      id: ["prod_m1", "prod_a"],
      status: "published",
      categories: { id: ["pcat_1"] },
    });
  });

  it("a publikalt, a jelolo nelkuli es a nem letezo termekre 404", async () => {
    for (const termek of [
      { ...kifutottTermek, status: "published" },
      { ...kifutottTermek, metadata: { primary_category_id: "pcat_1" } },
      null,
    ]) {
      const { res } = await futtat({ termek });
      expect(res.statusCode).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain("Régi");
    }
  });

  it("marka nelkul nincs gepi jelolt (a csak-kategoria jelolt nem megy ki)", async () => {
    const { res, listaKeresek } = await futtat({
      termek: {
        ...kifutottTermek,
        metadata: { ...kifutottTermek.metadata, unas_similar_ids: undefined },
      },
      kategoriaMarkas: ["prod_m1"],
      csatornas: { prod_m1: ["published", ["sc_kirakat"]] },
    });
    expect(res.body).toMatchObject({ helyette: [], hasonlo: [] });
    expect(listaKeresek).toHaveLength(1);
  });

  it("ha a valasz nem hordozza a csatornat, nem szur ki mindent", async () => {
    const { res } = await futtat({
      termek: kifutottTermek,
      csatornas: { prod_a: ["published", null] },
    });
    expect(res.body).toMatchObject({ helyette: ["prod_a"] });
  });
});
