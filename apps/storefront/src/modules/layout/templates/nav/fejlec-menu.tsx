"use client"

import React, { useState } from "react"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A FEJLEC KATEGORIA-SAVJA: LENYILO, ES GORGETESKOR IS OTT MARAD.
 *
 * Balazs kerese (2026-09-09 09:51): "a fejlecben a menusoron nyiljanak a
 * kategoriak es ne egybol ugorjon a termekek fokategoriara, pl. a lap alsobb
 * reszen tunjon el a kategoria fa".
 *
 * === ITT KORABBAN EGY MASODIK VISELKEDES IS ALLT, ES AZ FELREOLVASAS VOLT ===
 *
 * A mondat masodik felet ("tunjon el a kategoria fa") ugy epitettem meg, hogy
 * ez a sav a 120. pixel folott ELREJTOZIK. Ket meres cafolta:
 *
 *   a "kategoria fa", amit Balazs nem akar latni, a LABLEC racsa volt, nem ez
 *     a sav -- harom kitelepitett lapon merve egyetlen elem felelt meg a
 *     leirasnak (50 link, 917 pixel, a fooldalon gorgetes nelkul lathato)
 *   a mai bolt, amirol azt mondta, hogy "valami hasonlo kell", a sav
 *     ELLENKEZOJET csinalja: nullatol kilencszaz pixelig gorgetve feltapad a
 *     lap tetejere, es vegig ott marad
 *
 * Balazs dontese ezutan: "a fejlec menusav tapadjon". A rejtes tehat kikerult,
 * a nyilo menu maradt.
 *
 * A TAPADAS NEM ITT VAN, hanem a fejlec burkolatan (`index.tsx`, `sticky
 * top-0`), es az mar korabban is allt. Ez a komponens csak annyit tesz, hogy
 * NEM REJTI EL magat -- pontosan ez a valtozas.
 *
 * AMI MEGMARADT: a menupont NYIT, nem navigal.
 *
 * === AMI SZANDEKOSAN NEM VALTOZIK: A TARTALOM ===
 *
 * A menu a mai forrasbol epul (a nem URES gyokerek). Hogy melyik NEGY elem
 * alljon ott, az kulon kerdes, ami Balazsnal van -- a terv ket jovahagyott
 * lapja ket kulonbozo negyest mutat. Amikor a valasz megjon, egy LISTACSERE
 * marad, nem ujraepites: ez a komponens a kapott halmazt rajzolja ki.
 *
 * === A GYOKER MAGA IS HIVATKOZAS MARAD ===
 *
 * A keres az volt, hogy ne UGORJON egybol a fokategoriara. A lenyilo tetejen
 * ezert ott all a gyoker sajat hivatkozasa is, kulon soron -- aki a teljes
 * kategoriat akarja, eleri, csak nem veletlenul.
 */
/**
 * A NEGY MENUPONT, BALAZS SZAVAVAL ES AZ O SORRENDJEBEN (2026-09-09 09:54):
 * "MIndenhol: Termékek, Halak, Korallok, Gerinctelenek".
 *
 * === MIERT ROGZITETT LISTA, ES NEM SZAMOLT SORREND ===
 *
 * A sorrend NEM vezetheto le semmilyen adatbol: meret szerint sem jon ki
 * (Korallok 8 termek, Gerinctelenek 27, tehat a Korallok ELOREBB all a
 * kisebbik ellenere), es a bolt `rank` mezoje is mast ad
 * (Termekek, Gerinctelenek, Halak, Korallok).
 *
 * Egy szamolt sorrend tehat CSENDBEN mast adna, mint amit kertek. Ezert all
 * itt nev szerint, rogzitve -- es ezert nem "javitja ki" senki veletlenul.
 *
 * === ES AMIT EZ NEM MOND MEG ===
 *
 * Ha egy nev nem szerepel a bolt gyokerei kozott, az a menupont egyszeruen
 * kimarad. Nem talalunk ki helyette masikat: egy hianyzo kategoria adat-kerdes,
 * nem elrendezesi.
 */
export const MENU_SORREND = [
  "Termékek",
  "Halak",
  "Korallok",
  "Gerinctelenek",
] as const

export const menuSorrendben = (
  kategoriak: HttpTypes.StoreProductCategory[],
): HttpTypes.StoreProductCategory[] =>
  MENU_SORREND.map((nev) => kategoriak.find((k) => k.name === nev)).filter(
    (k): k is HttpTypes.StoreProductCategory => Boolean(k),
  )

/**
 * A PANEL ALAKJA A MAI BOLT MEGA-MENUJEBOL JON, A SZAMAI PEDIG MERESBOL.
 *
 * Balazs kepernyokepet kuldott a mai UNAS bolt menujerol, egy mondattal:
 * "valami hasonlo kell csak szebben". Amit a kep a VISELKEDESROL mond, es amit
 * ez a komponens atvesz:
 *
 *   szeles, tobb oszlopos panel nyilik, nem szuk egyoszlopos lista
 *   a panelben CSOPORTOK allnak: egy nagybetus fejlec, alatta nehany elem
 *   ha egy csoportnak tobb eleme van, mint amennyi kifer, a lista alatt
 *     egy "Tobb" hivatkozas all -- NEM sorolja fel mindet
 *   a panel a lapot LEFELE TAKARJA, nem tolja szet
 *
 * AMI A KEPEN VAN, DE NEM VESSZUK AT: a HET menupont (Akciok, Blog, Rolunk is
 * all rajta) es a mai bolt kekesege. A menupontok szamat Balazs kulon mondta
 * meg (negy, a `MENU_SORREND` szerint), a szineket pedig a terv-tokenjeink.
 *
 * === A KET SZAM, ES HONNAN JON ===
 *
 * OSZLOPOK: 5. A kepen ot oszlop all.
 *
 * CSOPORTONKENTI ELEMSZAM: 5, es ez NEM talalgatas. A kepen hat csoport
 * ellenorizheto, es mind a hat egybevag a "legfeljebb otot mutat, aztan Tobb"
 * szaballyal:
 *
 *     csoport                        a kepen        nalunk
 *     Akvarium epitesi eszkozok      5 + Tobb          6
 *     Aramoltatok                    5 + Tobb         12
 *     Akvariumkarbantartas           5, nincs Tobb     5
 *     Aminosavak es vitaminok        4, nincs Tobb     4
 *     Lehabzok                       4, nincs Tobb     4
 *     Eledelek                       3, nincs Tobb     3
 *
 * Vagyis a hatar pontosan ott van, ahol az otodik elem utan meg jonne tovabbi.
 * Ha valaha mast kernek, ez az egy szam cserelodik.
 */
const OSZLOPOK = 5
const CSOPORT_MAX = 5

/**
 * AZ OSZLOPSZAM A TOLTOTT CELLAK SZAMA, LEGFELJEBB OT.
 *
 * === MIERT NEM ALLANDO OT, HOLOTT A KEPEN OT ALL ===
 *
 * A kepen huszonharom csoport van, tehat ot oszlop TELE van. A mi fankban nem
 * mindenhol: merve 2026-09-09 a kitelepitett kategoria-lapokrol,
 *
 *     gyoker           cella   allando ot oszlop mellett
 *     Termekek            23   mind az ot tele
 *     Halak               15   mind az ot tele
 *     Gerinctelenek        7   ot, majd ketto
 *     Korallok             1   EGY toltott, NEGY URES
 *
 * A Korallok panelje igy egy teljes szelessegu sav lenne, benne EGYETLEN
 * csoportcimmel es egy elemmel. Nem hibazik, csak toresnek latszik.
 *
 * A hiba nem a csoportos/listas dontesben volt (az az adatbol helyesen jon),
 * hanem abban, hogy az oszlopszamot a MINTAROL vettem at szam szerint, ahelyett
 * hogy a sajat adatunkbol szamolnam. Ugyanaz a csalad, mint a beegetett
 * kategoria-nev: ma egybeesik a helyes eredmennyel, de nem AZERT adja azt.
 *
 * A `Math.max(1, ...)` azert kell, mert egy nulla oszlopos racs ervenytelen
 * CSS -- ures gyerek-lista mellett a panel amugy sem jelenik meg, de a racs
 * ertelmes marad.
 */
export const oszlopSzam = (cellak: number): number =>
  Math.min(OSZLOPOK, Math.max(1, cellak))

/**
 * CSOPORTOS ALAK VAGY SIMA LISTA -- ES A DONTES AZ ADATBOL JON, NEM A NEVBOL.
 *
 * A fa merve (2026-09-09): a Termekek alatt 23 gyerek es 86 unoka all, a Halak
 * (15), a Gerinctelenek (7) es a Korallok (1) alatt viszont GYAKORLATILAG
 * nincs unoka. Csoportos alakban azok a panelek csupa fejlec es nulla elem
 * lennenek.
 *
 * Ezert a komponens megkerdezi, hordoz-e a gyerekek TOBBSEGE sajat gyereket.
 * Egy beegetett "ha Termekek" ugyanezt adna ma, es a katalogus elso
 * atrendezesenel csendben rossz lapot adna.
 */
export const csoportosAlak = (
  gyerekek: HttpTypes.StoreProductCategory[],
): boolean =>
  gyerekek.filter((gy) => (gy.category_children ?? []).length > 0).length >
  gyerekek.length / 2

export const FejlecMenu = ({
  kategoriak,
}: {
  kategoriak: HttpTypes.StoreProductCategory[]
}) => {
  const [nyitott, setNyitott] = useState<string | null>(null)
  const sorrendben = menuSorrendben(kategoriak)

  if (sorrendben.length === 0) return null

  return (
    /*
      A ZARAS A TELJES SAVROL SZOL, NEM MENUPONTONKENT -- ES EZ MERT HIBA
      JAVITASA.

      Balazs szava: "a felso menusor lenyilik de ha lehozom onna az egeret akkor
      eltunik tehat nem kattinthato".

      A MERES (kitelepitett lap, 1440 pixel, 2026-09-09 12:3x):

          a gomb alja        50 px
          a panel teteje     78 px
          RES                28 px

      A panel a FEJLECHEZ igazodik (`top-full`), a gomb viszont a 78 pixeles sav
      KOZEPEN all. A koztuk levo 28 pixel egyik elemhez sem tartozott, tehat
      lefele indulva a mutato ELHAGYTA a menupontot, es a `mouseleave` bezarta a
      panelt, mielott elerte volna. Merve: mar 55 pixelnel bezarult.

      A JAVITAS KET RESZE, ES MIND A KETTO KELL:

        - a zaras a KULSO savra kerul, nem az egyes menupontokra. Igy a
          menupontok kozotti 22 pixeles kozok is a savhoz tartoznak, tehat egy
          ATLOS mozgas sem zar be.
        - a sav `h-full`, vagyis a 78 pixeles fejlec TELJES magassagat elfoglalja.
          Ezzel a sav alja pontosan ott van, ahol a panel teteje: nincs res.

      A panel a savon BELUL all a DOM-ban, tehat a bele lepes nem `mouseleave`.
      Ez a resze mar eddig is igy volt -- csak a res miatt sosem jutott el odaig
      a mutato.
    */
    <div
      className="hidden h-full items-center gap-[22px] lg:flex"
      data-testid="fejlec-menu"
      onMouseLeave={() => setNyitott(null)}
    >
      {sorrendben.map((k) => {
        const gyerekek = k.category_children ?? []
        const nyitva = nyitott === k.id
        const csoportos = csoportosAlak(gyerekek)
        const oszlopok = oszlopSzam(gyerekek.length)

        return (
          <div key={k.id} className="flex h-full items-center">
            <button
              type="button"
              aria-expanded={nyitva}
              aria-haspopup={gyerekek.length > 0}
              onClick={() => setNyitott(nyitva ? null : k.id)}
              onMouseEnter={() => setNyitott(k.id)}
              className="whitespace-nowrap text-[14px] font-medium"
              data-testid="fejlec-menu-tetel"
            >
              {k.name}
            </button>

            {nyitva && gyerekek.length > 0 && (
              /*
                A PANEL A FEJLECHEZ IGAZODIK, NEM A MENUPONTHOZ.

                Az `absolute` a legkozelebbi POZICIONALT osnek szol, es az itt a
                `header` (`relative`). Ezert nem all `relative` a menupont
                burkolatan: ha ott allna, a panel egy 60 pixeles gomb szelesseget
                orokolne. A `left-0 right-0` igy a fejlec teljes szelessege.

                A `z-50` es a fejlec sajat `z-50`-je nem utkozik: a panel a
                fejlec GYEREKE, tehat vele egy retegben all, es a lap tartalma
                (ami alacsonyabb) alatta marad. Ez a "lefele takarja, nem tolja
                szet" viselkedes.
              */
              <div
                className="absolute inset-x-0 top-full z-50 max-h-[70vh] overflow-y-auto border-b border-t px-4 py-8"
                style={{
                  borderColor: "var(--terv-keret)",
                  background: "var(--terv-hatter)",
                }}
                data-testid="fejlec-menu-lenyilo"
                data-alak={csoportos ? "csoportos" : "listas"}
              >
                <div
                  className="mx-auto flex w-full flex-col gap-6"
                  style={{ maxWidth: "1352px" }}
                >
                  <LocalizedClientLink
                    href={`/categories/${k.handle}`}
                    className="text-[13.5px] font-semibold hover:text-terv-kiemel-tinta"
                    data-testid="fejlec-menu-gyoker-link"
                  >
                    {k.name}
                  </LocalizedClientLink>

                  {/*
                    AZ OSZLOPSZAM CSS-VALTOZON MEGY AT, ES EZ NEM STILUS-KERDES.

                    Az elso valtozatban a szam KETSZER allt: egyszer a racs
                    stilusaban, egyszer egy `data-oszlopok` jelolon, amit a spec
                    olvasott. A kalibracio ezt azonnal megfogta: elrontottam a
                    STILUST, es nulla teszt lett piros, mert az allitas a
                    JELOLOT nezte. Ket hely, egy szam, es a teszt a rossz felet
                    orizte.

                    Igy egyetlen helyen all, es a spec ugyanazt olvassa, amit a
                    bongeszo hasznal. A lablec ugyanezt a mintat hasznalja
                    (`--lablec-oszlopok`), tehat nem uj alak a repoban.
                  */}
                  <div
                    className="grid gap-x-8 gap-y-8 grid-cols-[repeat(var(--panel-oszlopok),minmax(0,1fr))]"
                    style={
                      { "--panel-oszlopok": oszlopok } as React.CSSProperties
                    }
                  >
                    {gyerekek.map((gy) => {
                      const unokak = gy.category_children ?? []
                      const mutatott = csoportos
                        ? unokak.slice(0, CSOPORT_MAX)
                        : []

                      return (
                        <div
                          key={gy.id}
                          className="flex flex-col gap-2"
                          data-testid="fejlec-menu-csoport"
                        >
                          <LocalizedClientLink
                            href={`/categories/${gy.handle}`}
                            className={
                              csoportos
                                ? "text-[13px] font-semibold uppercase tracking-[0.04em] hover:text-terv-kiemel-tinta"
                                : "text-[13.5px] hover:text-terv-kiemel-tinta"
                            }
                            style={
                              csoportos
                                ? undefined
                                : { color: "var(--terv-szoveg-halvany)" }
                            }
                            data-testid={
                              csoportos
                                ? "fejlec-menu-csoport-cim"
                                : "fejlec-menu-gyerek"
                            }
                          >
                            {gy.name}
                          </LocalizedClientLink>

                          {mutatott.map((u) => (
                            <LocalizedClientLink
                              key={u.id}
                              href={`/categories/${u.handle}`}
                              className="text-[13.5px] hover:text-terv-kiemel-tinta"
                              style={{ color: "var(--terv-szoveg-halvany)" }}
                              data-testid="fejlec-menu-gyerek"
                            >
                              {u.name}
                            </LocalizedClientLink>
                          ))}

                          {csoportos && unokak.length > CSOPORT_MAX && (
                            <LocalizedClientLink
                              href={`/categories/${gy.handle}`}
                              className="text-[13px] hover:text-terv-kiemel-tinta"
                              style={{ color: "var(--terv-szoveg-halvany)" }}
                              data-testid="fejlec-menu-tobb"
                            >
                              Több
                            </LocalizedClientLink>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
