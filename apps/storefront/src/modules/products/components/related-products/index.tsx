import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"
import {
  KAPCSOLAT_HATAR,
  kapcsolatForras,
  kertSorrendben,
} from "./gondozott-kapcsolatok"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
  /**
   * SAJAT FEJLEC NELKUL, HA MAR VAN CIME A HELYNEK.
   *
   * A starter angol fejlece ("Related products") egy magyar lapon all, es a vaz
   * 13. doboza MAR VISEL magyar cimet a tervbol. A ketto egymas alatt ket cim
   * lenne ugyanannak a listanak. Ez a kapcsolo csak a fejlecet hagyja el; a
   * lista, a lekerdezes es a szures valtozatlan.
   *
   * Alapertelmezesben HAMIS, tehat a mai (elo allat) lap semmit nem valtozik.
   *
   * ES EZERT NEM HOLT KOD A FEJLEC, hanem forditando: merve az elo lapon
   * (2026-09-07, acropora-divaricata), az elo allat termeklapjan MIND A KET
   * felirat megjelenik. Ott nincs vaz, tehat nincs doboz-cim, tehat az
   * elnyomas nem sul el. A muszaki lapon viszont nem latszik.
   */
  fejlecNelkul?: boolean
  /**
   * MELYIK LISTAT MUTATJA. Ket KULONBOZO dolog, nem egy dolog ket valtozata:
   * egy termeknek lehet hasonloja kiegeszito nelkul es forditva.
   *
   * A terv a muszaki lap bal oszlopanak vegen KET listat ker ("Ami meg kellhet
   * hozza" es "Hasonlo lampak"), es a vaznak MINDKETTOHOZ van doboza -- a
   * `kiegeszitok` eddig URESEN allt.
   *
   * ALAPERTELMEZESBEN `hasonlo`, tehat az elo allat lapja betuere valtozatlan.
   */
  kapcsolat?: "hasonlo" | "kiegeszito"
  /**
   * A TARTALEK FORRAS: A TERMEK LEGMELYEBB KATEGORIAJA.
   *
   * Csak a `hasonlo` listara szol, es csak akkor sul el, ha nincs gondozott
   * kapcsolat. A `kiegeszito` lista NEM kap tartalekot: egy kategoria tagjai
   * nem "kellenek hozza" egymashoz, tehat ott a cim valotlan lenne.
   *
   * A hivo szamolja ki (`besorolasUt` utolso eleme), mert ott van a teljes
   * kategoria-katalogus. A termek sajat `categories` tombje csak a LEVEL
   * kategoriakat tartalmazza, az oseiket nem -- ezert nem lehet itt levezetni.
   */
  tartalekKategoriaId?: string | null
}

export default async function RelatedProducts({
  product,
  countryCode,
  fejlecNelkul = false,
  kapcsolat = "hasonlo",
  tartalekKategoriaId,
}: RelatedProductsProps) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  /**
   * A LISTA A GONDOZOTT KAPCSOLATOKBOL JON, ES CSAK ABBOL.
   *
   * ITT KORABBAN A STARTER SZUROJE ALLT: gyujtemeny, cimke, regio,
   * `is_giftcard: false`. Lemertem, mit adott ez MA (2026-09-08, a2fda8d):
   *
   *   collection_id   soha nem allt be -- a boltban NULLA gyujtemeny van
   *   tag_id          soha nem allt be -- a vetites egyetlen tag-et sem ir
   *
   * Marad a regio es az `is_giftcard`, a lapmeret pedig 12. Vagyis a lekerdezes
   * ezt kerdezte: "add az elso tizenket termeket a boltbol, kiveve ezt" -- a
   * doboz cime kozben azt allitotta, hogy hasonlo termekek.
   *
   * Ez nem gyenge tartalom volt, hanem VALOTLAN allitas a vevo fele, es
   * rosszabb az ures doboznal, mert ugy nezett ki, mintha mukodne.
   * (acrobot dontese, msg_id 14892.)
   *
   * A SZABALY VALTOZATLAN: URES SZURO SOHA NEM INDUL. Amit 2026-09-10-en
   * hozzavettunk, az egy MASODIK, VALODI szuro (a legmelyebb kategoria), nem a
   * szuretlen lista visszahozasa -- a kulonbseget a `hasonloForras` fejlece
   * fejti ki.
   */
  const forras = kapcsolatForras(
    kapcsolat,
    product.metadata as Record<string, unknown> | null,
    tartalekKategoriaId,
  )

  if (forras.mod === "nincs") {
    return null
  }

  const valasz = await listProducts({
    queryParams:
      forras.mod === "gondozott"
        ? { id: forras.azonositok, limit: forras.azonositok.length }
        : /*
            EGGYEL TOBBAT KERUNK, MINT AMENNYIT MUTATUNK.

            A kategoria a termek SAJAT kategoriaja, tehat a valaszban benne
            lesz o maga is, es utana szurjuk ki. Ha pontosan a hatart kernenk,
            a sajat kiszurese egy elemet ELVENNE a listabol -- a doboz
            tizenketto helyett tizenegyet mutatna, es senki nem venne eszre.
          */
          {
            category_id: [forras.kategoriaId],
            limit: KAPCSOLAT_HATAR + 1,
          },
    countryCode,
  }).then(({ response }) => response.products)

  const sajatNelkul = valasz.filter(
    (responseProduct) => responseProduct.id !== product.id,
  )

  const products =
    forras.mod === "gondozott"
      ? kertSorrendben(sajatNelkul, forras.azonositok)
      : sajatNelkul.slice(0, KAPCSOLAT_HATAR)

  /*
    NULLA HASONLO NEM URES DOBOZ, HANEM HIANYZO SZAKASZ (acrobot kikotese,
    2026-09-10). Egy egyelemu kategoriaban -- ahol csak maga a termek all --
    a szures utan ures lista marad, es akkor a doboz nem renderelodik.

    Merve ugyanaznap: a legkisebb kategoria HAROM elemu, tehat ez ma nem sul
    el. A katalogus viszont valtozik, es egy ures keretes szakasz rosszabbul
    nez ki, mint a semmi.
  */
  if (!products.length) {
    return null
  }

  return (
    <div className="product-page-constraint">
      {fejlecNelkul ? null : (
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-base-regular text-gray-600 mb-6">
            {kapcsolat === "kiegeszito"
              ? "Ami még kellhet hozzá"
              : "Hasonló termékek"}
          </span>
          <p className="text-2xl-regular text-ui-fg-base max-w-lg">
            {kapcsolat === "kiegeszito"
              ? "Ezekkel egészítik ki."
              : "Ezek is érdekelhetnek."}
          </p>
        </div>
      )}

      <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8">
        {products.map((product) => (
          <li key={product.id}>
            <Product region={region} product={product} />
          </li>
        ))}
      </ul>
    </div>
  )
}
