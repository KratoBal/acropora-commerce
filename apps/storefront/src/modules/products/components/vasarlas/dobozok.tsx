"use client"

import { Button } from "@modules/common/components/ui"
import OptionSelect from "@modules/products/components/product-actions/option-select"

import ProductPrice from "../product-price"
import StockState from "../stock-state"
import { useVasarlas } from "./kontextus"

/**
 * A NEGY VASARLASI DOBOZ, KULON-KULON -- A TERV SZERINT.
 *
 * A terv a jobb oszlopot negy dobozra bontja, es eddig mind a negy tartalma
 * EGY dobozban allt (a `mennyiseg` slotban), mert egyetlen komponens volt.
 * Az allapot most az `allapot.tsx`-ben lakik, tehat a negy doboz kulon
 * olvashatja ugyanazt -- a viselkedes valtozatlan.
 *
 * MINDEGYIK `null`-t ad provider nelkul, es ez SZANDEKOS: a vaz ilyenkor a
 * varakozo szoveget mutatja, ami a helyes valasz. A varrat merese nem itt van,
 * hanem a megepitett lapon.
 */

/** 6. doboz: AR. */
export function ArDoboz() {
  const a = useVasarlas()
  if (!a) return null
  return <ProductPrice product={a.product} variant={a.selectedVariant} />
}

/**
 * 7. doboz: ELERHETOSEG.
 *
 * A terv felirata "Keszlet, szallitas, bolti atvetel". Ebbol MA a keszlethez
 * kotodo ket teny letezik, es mind a ketto MAR MEGVOLT, csak rossz helyen:
 *
 *   a kiszereles (`Kiszereles: ...`)   eddig is itt allt, a `vazTartalom`-bol
 *   a minimalis rendelesi mennyiseg    eddig a GOMB ALATT, a 9. dobozban
 *
 * A szallitas es a bolti atvetel NEM letezik adatkent, tehat nem kerul ide
 * kitalalt sor.
 *
 * ES AMI SZANDEKOSAN NEM KERUL IDE: a keszlet-allapot SZOVEGE ("Kosarba",
 * "Nincs raktaron", "Eladva"). Azt a 9. doboz gombja MONDJA KI, ugyanabbol az
 * `availabilityLabel` terkepbol. Ha ide is kiirnank, ket allitas allna
 * ugyanarrol a lapon, es a ketto elcsuszasa NEM hibazna, csak mast mutatna --
 * ugyanaz az alak, amiert a ragados sav sem szamol sajat arat.
 */
export function ElerhetosegDoboz({
  kiszereles,
  rendelesiMondat,
}: {
  kiszereles?: string
  rendelesiMondat?: string | null
}) {
  /**
   * A MONDAT KESZEN ERKEZIK, ES EZ A VALTOZAS LENYEGE.
   *
   * Eddig a doboz a MINIMUM SZAMAT kapta, es maga fogalmazta meg a mondatot.
   * Harom parameter (minimum, lepeskoz, maximum) mellett ez azt jelentene,
   * hogy a szoveg KET helyen all: itt es a `product-actions/index.tsx`-ben --
   * es a ketto szet tudna csuszni ugy, hogy semmi nem hibazik, csak mast
   * mondanak ugyanarrol a termekrol.
   *
   * Ezert a szoveget az `orderQuantityHint` allitja elo, es a doboz csak
   * megjeleniti. A `null` tovabbra is azt jelenti, hogy nincs mit mondani.
   */
  const minimumSor = rendelesiMondat ? (
    /**
     * A RENDELESI MONDAT NEM CIMKE-ERTEK PAR, TEHAT NEM IS AZ LESZ.
     *
     * A tervbeli sorok mind ketreszuek (bal oldalt cimke, jobb oldalt ertek).
     * Ez egy MONDAT ("legalabb 2 darab rendelheto"), aminek nincs cimkeje. Ha
     * eroltetnenk ra egyet, kitalalt szoveg kerulne a lapra -- ezert teljes
     * szelessegben all a melyedesen belul.
     */
    <p
      className="text-[13.5px]"
      style={{ color: "var(--terv-szoveg-halvany)" }}
      data-testid="vaz-rendelesi-mondat"
    >
      {rendelesiMondat}
    </p>
  ) : null

  /**
   * TISZTA MEGJELENITES, KONTEXT NELKUL -- ES EZ SZANDEKOS.
   *
   * A masik harom doboz allapotot olvas; ez ketto TENYT, es mindketto a
   * termekbol szamolhato (`unas_unit`, `unas_minimum_order_quantity`). Ha
   * kontextbol venne oket, egy provider nelkuli lapon URESEN allna ugy, hogy a
   * vaz TELINEK jeloli -- rosszabb, mint a varakozas.
   */
  if (!kiszereles && !minimumSor) return null

  /**
   * A DOBOZ MELYEDES A PANELEN BELUL, ES EZ A TERVBOL MERT ALAK (2026-09-08).
   *
   * A terv sotet lapjan a keszlet-sor igy all:
   *
   *     margin-top:18px; padding:14px;
   *     background:oklch(0.17 0.016 250);
   *     display:flex; flex-direction:column; gap:6px
   *
   * es a benne allo sorok ketreszuek: `justify-content:space-between`,
   * 13,5 pixel, a cimke halvany, az ertek 600-as vastagsagu.
   *
   * A 0.17 a `--terv-hatter`, vagyis a LAP erteke -- a doboz tehat a panelbol
   * KIVAGOTT melyedes, nem egy rateett kartya. Uj token nem kellett hozza.
   * A `margin-top:18px` sem kerul ide: a kozos panel belso terkoze mar 18 pixel.
   *
   * === A KET VILAG ITT IS ELLENTETES IRANYBA MEGY, UGYANABBOL AZ OKBOL ===
   *
   * Sotetben a melyedes (0.17) SOTETEBB a panelnel (0.205). Vilagosban a
   * `--terv-hatter` 0.99, a panel 0.955, tehat VILAGOSABB lesz -- kiemelkedes,
   * nem melyedes. Nem javitjuk: a terv ket vilagos lapjan NINCS ilyen panel,
   * tehat nincs mihez igazodni, es egy kitalalt ertek tervbelinek latszana.
   *
   * === A CIMKE SZINE A MEGLEVO TOKEN, ES A KULONBSEG MERVE 0,02 ===
   *
   * A tervben a cimke `oklch(0.74 0.012 250)`, a tokenunk `oklch(0.72 ...)`.
   * A sotet tervlap HAT kulonbozo halvany szovegszint hasznal 0.68 es 0.74
   * kozott (13, 12, 9, 9, 7 es 6 elofordulassal). Hat ertek egy ilyen szuk
   * savban nem hat szerep, hanem a tervfajl zaja -- ezert a meglevo token megy
   * ide, nem egy uj a 0,02-ert.
   *
   * === ES AMI SZANDEKOSAN NEM KERUL IDE, VALTOZATLANUL ===
   *
   * A tervbeli harom sorbol ("Keszlet", "Eloallat-szallitas", "Bolti atvetel")
   * ma egyiknek sincs adata ilyen alakban. A szallitas es az atvetel nem
   * letezik adatkent, a keszlet SZOVEGET pedig a 9. doboz gombja mondja ki --
   * ha ide is kiirnank, ket allitas allna ugyanarrol. A melyedes tehat a
   * MEGLEVO ket tenyt kapja meg, uj sor nelkul.
   */
  return (
    <div
      className="flex flex-col gap-[6px] p-[14px]"
      style={{ background: "var(--terv-hatter)" }}
      data-testid="elerhetoseg-melyedes"
    >
      {kiszereles ? (
        <div
          className="flex items-baseline justify-between gap-4 text-[13.5px]"
          data-testid="vaz-egyseg"
        >
          <span style={{ color: "var(--terv-szoveg-halvany)" }}>
            Kiszerelés
          </span>
          <span className="font-semibold">{kiszereles}</span>
        </div>
      ) : null}
      {minimumSor}
    </div>
  )
}

/**
 * 8. doboz: VALTOZAT-VALASZTO.
 *
 * A harom allapot (valodi valaszto / ott all de nem valaszthato / meg sem
 * jelenik) VALTOZATLAN, a `ProductActions` torzsebol kerult ide, betuhiven.
 * A ket feltetel indoka is valtozatlan, es a `product-actions/index.tsx`
 * fejlece orzi a teljes levezetest -- ide csak a rovid alak kerul, hogy a ket
 * peldany ne csusszon el egymastol.
 */
export function ValasztoDoboz() {
  const a = useVasarlas()
  if (!a) return null
  if (a.uniquePiece) return null
  if ((a.product.options?.length ?? 0) === 0) return null

  return (
    <div className="flex flex-col gap-y-4">
      {(a.product.options || []).map((option) => (
        <div key={option.id}>
          <OptionSelect
            option={option}
            current={a.options[option.id]}
            updateOption={a.setOptionValue}
            title={option.title ?? ""}
            data-testid="product-options"
            disabled={
              a.disabled || a.isAdding || (a.product.variants?.length ?? 0) <= 1
            }
          />
        </div>
      ))}
    </div>
  )
}

/**
 * 9. doboz: MENNYISEG ES KOSARBA TETEL.
 *
 * A lap alji sav (14. doboz) NEM ehhez meri magat: az a sav `sticky`, es a
 * gombja UGRIK ide (`#vaz-mennyiseg`), nem onallo kosarba-tetel. Ezert itt
 * nincs `ref` es nincs lathatosag-figyelo -- a regi lap lebego sávja az, ami
 * ilyet igenyelt, es az a `ProductActions`-ben maradt, a regi uton.
 */
export function MennyisegDoboz() {
  const a = useVasarlas()
  if (!a) return null

  if (!a.selectedVariant) {
    return (
      <div>
        <Button
          disabled
          variant="primary"
          className="w-full h-10"
          data-testid="add-product-button"
        >
          Válassz változatot
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {!a.uniquePiece && (
        <div className="flex items-center rounded-md border border-ui-border-base">
          <button
            type="button"
            aria-label="Mennyiség csökkentése"
            className="h-10 w-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            onClick={() =>
              a.setQuantity(a.normaliseQuantity(a.quantity - a.quantityStep))
            }
          >
            −
          </button>
          <input
            aria-label="Mennyiség"
            className="h-10 w-12 bg-transparent text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            inputMode="numeric"
            value={a.quantity}
            onChange={(event) =>
              a.setQuantity(a.normaliseQuantity(Number(event.target.value)))
            }
            onBlur={() => a.setQuantity(a.normaliseQuantity(a.quantity))}
          />
          <button
            type="button"
            aria-label="Mennyiség növelése"
            className="h-10 w-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            onClick={() =>
              a.setQuantity(a.normaliseQuantity(a.quantity + a.quantityStep))
            }
            disabled={!a.novelheto}
          >
            +
          </button>
        </div>
      )}
      <StockState
        availability={a.availability}
        similarHref={a.similarHref}
        onAddToCart={a.handleAddToCart}
        isAdding={a.isAdding}
        disabled={a.disabled || a.isAdding}
      />
    </div>
  )
}
