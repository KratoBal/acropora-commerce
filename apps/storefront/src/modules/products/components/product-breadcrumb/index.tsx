import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { besorolasUt } from "@lib/util/kategoria-fa"
import { cikkszam } from "@modules/products/components/lap-vaz/valodi-tartalom"

type Category = Pick<
  HttpTypes.StoreProductCategory,
  "id" | "name" | "handle" | "parent_category_id"
>

export default function ProductBreadcrumb({
  product,
  categories,
}: {
  product: HttpTypes.StoreProduct
  categories: Category[]
}) {
  /*
    A LEVEZETES KOZOS A BESOROLAS SORAVAL, ES EZ NEM TAKARITAS.

    Ugyanez a felmeno-kereses allt itt es (2026-09-09 ota) a cim folotti
    besorolas soraban is. Ket levezetes ugyanarra elobb-utobb elcsuszik, es a
    ket sor a lapon EGYMAS ALATT all: egy elteres azonnal latszana, es senki
    nem tudna, melyik a helyes.

    AMI VISZONT KULONBOZIK, ES SZANDEKOSAN: a morzsamenu a TELJES nevet mutatja
    (`WYSIWYG - KORALLOK`), a besorolas sora a rovidet (`WYSIWYG`). Itt az UT
    szamit, ott a besorolas. A ket alak ugyanabbol a hivasbol jon, tehat a
    kulonbseg egy MEZO, nem egy masodik szamitas.

    Hogy a morzsamenu is rovidre valtson-e, KULON tetel (acrobot, 2026-09-09):
    eloszor a besorolas sora megy ki, aztan a ket sort EGYUTT nezzuk meg a
    kitelepitett lapon.
  */
  const byId = new Map(categories.map((category) => [category.id, category]))
  const path = besorolasUt(product, categories)

  return (
    <nav aria-label="Morzsamenü" className="overflow-x-auto whitespace-nowrap">
      {/*
        A MORZSAMENU SZINEI TOKENBOL JONNEK -- ES MA EZ MEG NEM LATSZIK.

        === MIERT MEGY MEGIS ELSONEK ===

        Picasso negyedik pontja szerint a morzsamenunek ugyanabban a sotet
        sikban kell allnia, mint a fejlecnek es a tartalomnak. Ma a vazon KIVUL
        all, vilagos hatteren, tehat a rogzitett szinei helyesek.

        AMINT VISZONT A SOTET FELULETRE KERUL, ugyanaz tortenne, mint az arral
        (415f455c): a `text-ui-fg-muted` es a `text-ui-fg-base` ROGZITETT szin,
        nem ismeri a `data-vilag` kapcsolot, tehat sotet szoveg allna sotet
        feluleten.

        Ezert ez a valtozas ELOBB megy, mint az athelyezes: onmagaban semmit nem
        ront el (a vilagos lapon a token gyakorlatilag ugyanazt adja), es az
        athelyezes utan mar nem lehet elfelejteni. Forditva egy ismert hibat
        szallitanank ki ujra.

        === AMI SZANDEKOSAN MARAD ===

        A `focus-visible:outline-ui-fg-interactive` fokusz-gyuru. Az nem
        szoveg-szin, es hogy a fokusz milyen szint kapjon, tervezoi dontes --
        nem vezetem le magamtol egy szoveg-token cserejebol.

        A `hover:text-ui-fg-base` KIKERULT: a lebegtetett allapot ma a
        rogzitett alapszinre valtott volna, ami a sotet lapon eppen olvashatatlan.

        === ES MEGJOTT A DONTES (acrobot, msg 15614) ===

        "A link a lista szinet orokolje, ahogy most csinaltad, ES a lebegtetes
        a `--terv-szoveg` tokent kapja."

        Ez UGYANAZ a token, amit a sor VEGE visel (a mai termek neve). Vagyis a
        lebegtetes nem egy harmadik hangero, hanem a lista felhozasa arra a
        szintre, amin a jelenlegi elem all -- es epp ezert nem kellett hozza uj
        token.

        MIND A KET VILAGBAN ERTELMES, es ez a lenyeg: a `--terv-szoveg` vilagosban
        sotet (0.2), soteten vilagos (0.95), tehat a lebegtetes mindket lapon
        "kicsit hangosabb". A regi rogzitett szin csak az egyiken volt az.

        MIERT OSZTALY ES NEM BEAGYAZOTT STILUS: egy beagyazott `style` nem ismer
        allapotot. A tokent ezert a Tailwind konfig nevesiti
        (`textColor: { "terv-szoveg" }`), ugyanugy, mint a szerif betut a #235-ben.
      */}
      {/*
        A TERVLAP ALAKJA: NAGYBETUS, ALLO SZELESSEGU BETU, ES NINCS "FOOLDAL".

        A tervlapon a sor igy all: `KORALLOK / WYSIWYG / SPS / A-1042`. Harom
        elteres a mai alakhoz kepest, es mind a harom a TERVBOL jon, nem tolem:

          nincs "Fooldal" elem   a logo mar hazavisz, es a terven nem szerepel
          NAGYBETUS              a terven mindegyik szegmens nagybetus
          allo szelessegu betu   ugyanaz a `--terv-betu-mono-lanc`, amit a
                                 cikkszam is visel a cim alatt

        AMIT NEM VETTEM AT: a betukozt. A terven van, de a kuldott kepbol NEM
        szamolhato ki: a fo sav ott 128 pixel magas, a terv szerinti 78 CSS
        pixel helyett, tehat a leptek 1.64 -- egy nem egesz nagyitasu kivagas.
        Ebbol CSS-erteket olvasni hamis pontossag lenne. Ha kell, kulon meres.

        A NAGYBETUS ALAK CSS-BEN VAN, NEM AZ ADATBAN: a kategoria neve tovabbra
        is ugy megy at, ahogy a boltban all. Egy `toUpperCase()` a szovegen a
        cimkeket is atirna, es a magyar ekezetes kisbetuk visszaalakitasa a
        kereso es a masolas szempontjabol is rosszabb.
      */}
      <ol
        className="flex min-w-max items-center gap-2 text-sm uppercase"
        style={{
          color: "var(--terv-szoveg-halvany)",
          fontFamily: "var(--terv-betu-mono-lanc)",
        }}
        data-testid="morzsamenu-lista"
      >
        {path.map((category) => (
          <li key={category.id} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <LocalizedClientLink
              className="hover:text-terv-szoveg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
              href={`/categories/${byId.get(category.id)?.handle ?? ""}`}
            >
              {category.teljesNev}
            </LocalizedClientLink>
          </li>
        ))}
        {/*
          AZ UTOLSO ELEM A CIKKSZAM, NEM A TERMEK NEVE.

          A tervlapon `A-1042` all a sor vegen, a termek neve pedig a cim-blokk
          H1-eben. A ketto igy nem ismetlodik, es a sor rovid marad: egy
          "Acropora tenuis „Miami Vice"" hosszu cim a morzsamenuben eddig
          csonkolva allt (`max-w-48 truncate`).

          HA NINCS CIKKSZAM, A NEV MARAD. Az `elolNev` tartalek nem dísz: a
          teszt bolton merve nem minden valtozaton all `sku`, es egy URES
          utolso elem rosszabb lenne a hosszunal -- a latogato nem latna, hol
          all.
        */}
        <li
          className="flex min-w-0 items-center gap-2"
          style={{ color: "var(--terv-szoveg)" }}
          data-testid="morzsamenu-jelenlegi"
          aria-current="page"
        >
          <span aria-hidden="true">/</span>
          <span className="max-w-48 truncate">
            {cikkszam(product) ?? product.title}
          </span>
        </li>
      </ol>
    </nav>
  )
}
