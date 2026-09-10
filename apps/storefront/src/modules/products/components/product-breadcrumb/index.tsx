import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { besorolasUt } from "@lib/util/kategoria-fa"
import { cikkszam } from "@modules/products/components/lap-vaz/valodi-tartalom"
import { vilagaTermeknek } from "@modules/products/components/lap-vaz/vilag-valto"

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

        A BETUKOZ 2026-09-09 OTA MEGVAN, ES EZ A BEKEZDES AZERT VALTOZOTT MEG.

        Itt korabban az allt, hogy a betukoz "a kuldott kepbol NEM szamolhato
        ki", mert a kep leptekét 1.64-nek mertem. Ket dolog dontotte meg: a
        leptek valojaban 2.2222 (a savok hatarait mertem, nem a kereso mezo
        eleit), es a tervFORRAS azota megvan, ami kiirja az erteket
        (`letter-spacing:0.08em`). A korlat tehat nem "elavult" -- soha nem a
        vilagrol szolt, hanem a meresemrol.

        A NAGYBETUS ALAK CSS-BEN VAN, NEM AZ ADATBAN: a kategoria neve tovabbra
        is ugy megy at, ahogy a boltban all. Egy `toUpperCase()` a szovegen a
        cimkeket is atirna, es a magyar ekezetes kisbetuk visszaalakitasa a
        kereso es a masolas szempontjabol is rosszabb.
      */}
      {/*
        A MERET, A BETUKOZ ES A KOZ A TERVFORRASBOL JON.

            padding:20px 44px 0
            font-family:'JetBrains Mono',monospace
            font-size:11px
            letter-spacing:0.08em
            gap:9px

        Ugyanez a ket valasztott lapon (2a es 1b), beture azonos deklaracioval.

        ITT KORABBAN `text-sm` (14 px) ALLT, betukoz nelkul, es a fajl egy
        megjegyzese azt allitotta, hogy a betukoz "a kuldott kepbol NEM
        szamolhato ki". Az akkor igaz volt; a forras viszont KIIRJA. Egy
        korlat, amit egy ujabb meres megdont, nem marad allo -- ezert kerult
        ki az a bekezdes is.
      */}
      <ol
        className="flex min-w-max items-center gap-[9px] text-[11px] uppercase tracking-[0.08em]"
        style={{
          /*
            AZ UTVONAL SAJAT TOKENJE, NEM A HALVANY SZOVEGE.

            A terv mind a ket lapon MASKEPP allitja be a ketto, es kulonbozo
            iranyba (soteten 0.66 kontra 0.72, vilagoson 0.52 kontra 0.5). Az
            indoklas a `globals.css`-ben all, a token mellett.
          */
          color: "var(--terv-utvonal)",
          fontFamily: "var(--terv-betu-mono-lanc)",
        }}
        data-testid="morzsamenu-lista"
      >
        {/*
          AZ ELVALASZTO A TAGOK KOZE KERUL, NEM MINDEGYIK ELE.

          A tervben a sor igy all: `KORALLOK / WYSIWYG / SPS / A-1042` -- az
          elso elem elott NINCS jel. Nalunk minden `li` a sajat `/` jelevel
          kezdodott, tehat a sor egy felesleges karakterrel indult:
          `/ KORALLOK / WYSIWYG ...`. Merve a kitelepitett lapon, 2026-09-09.
        */}
        {path.map((category, index) => (
          <li key={category.id} className="flex items-center gap-[9px]">
            {index > 0 && <span aria-hidden="true">/</span>}
            <LocalizedClientLink
              className="hover:text-terv-szoveg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
              href={`/categories/${byId.get(category.id)?.handle ?? ""}`}
            >
              {/*
                A ROVID NEV ALL ITT, A SZULO UTOTAGJA NELKUL.

                A bolt neveiben a szulo neve is ott all (`SPS - Korallok`), a
                menu 92 gyermek-nevebol 92-nel. A morzsamenuben ez azt jelenti,
                hogy MINDEN lepesben masodszor is kiirodik az elozo lepes neve:

                    elotte   Termékek / Lehabzók - Termékek / Nyos - Lehabzók
                    mostol   Termékek / Lehabzók / Nyos

                Az indok nem a rovidseg magaban, hanem hogy az UT MAGA mondja
                ki a szulot: a morzsamenuben a bal szomszed EPP az a kategoria,
                aminek a nevet az utotag megismetli.

                Merve az adalek-lapon: 96 karakter allt 34 helyett, UGYANAZOKKAL
                a fogalmakkal.

                (acrobot dontese, 2026-09-09, ket sor egymas melletti merese
                utan. A `rovidNev` pontos egyezest vag le, es a levagas
                indoklasa a `kategoria-fa.ts` fajlban all.)
              */}
              {category.nev}
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
          className="flex min-w-0 items-center gap-[9px]"
          style={{ color: "var(--terv-szoveg)" }}
          data-testid="morzsamenu-jelenlegi"
          aria-current="page"
        >
          {/*
            A JELENLEGI ELEM ELE IS JEL KERUL -- DE CSAK HA VAN ELOTTE VALAMI.
            Kategoria nelkuli termeknel ez az elso elem, es akkor a sor megint
            egy felesleges karakterrel indulna.
          */}
          {path.length > 0 && <span aria-hidden="true">/</span>}
          {/*
            A SOR VEGE VILAGONKENT MAS, ES EZ A TERVBOL JON -- NEM EGY REGI DONTES
            FELULIRASA.

            Merve a tervfajlon (2026-09-10, ket agens egymastol fuggetlenul):

                2a (sotet)    KORALLOK / WYSIWYG / SPS / A-1042             a vegen CIKKSZAM
                1b (vilagos)  TECHNIKA / VILÁGÍTÁS / LED / REEF LED 160 PRO  a vegen NEV

            A #274 dontese (a sor vege a cikkszam) a SOTET lapra szolt, es ott ma is all.
            A vilagos lapon a terv mast mond, es ott a cikkszam a cim FOLE kerul, eyebrow
            alakban (`vaz-eyebrow`). Vagyis nem meressel irunk felul egy dontest, hanem egy
            EGY VILAGRA szolo dontest nem terjesztunk ki a masikra.

            ES A KETTO EGYUTT JAR: eyebrow nelkul a vilagos lap ELVESZTENE a cikkszamot,
            a sor vegenek atirasa nelkul pedig KETSZER mutatna. Egyik allapotban sem
            akarunk megallni, ezert megy a ket valtozas egy PR-ben.

            AMIT NE OLVASS KI EBBOL: hogy a terv "pontosan egyszer" mutatja a cikkszamot.
            A soteten KETSZER all -- a sor vegen ES az ar-blokkban ("Bruttó ár · Cikkszám
            A-1042 · Egyedi példány, nem pótolható"). Ami vilagonkent kulonbozik, az a
            MORZSAMENU VEGE, nem a cikkszam darabszama. (acrobot pontositasa, 2026-09-10.)

            A CIKKSZAM-TARTALEK A SOTET AGON MEGMARAD: a teszt bolton merve nem minden
            valtozaton all `sku`, es egy URES utolso elem rosszabb lenne a hosszunal.
          */}
          <span className="max-w-48 truncate">
            {vilagaTermeknek(product, categories) === "vilagos"
              ? product.title
              : (cikkszam(product) ?? product.title)}
          </span>
        </li>
      </ol>
    </nav>
  )
}
