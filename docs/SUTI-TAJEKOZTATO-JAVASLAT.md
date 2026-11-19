# Süti tájékoztató: javasolt szövegrészek (JAVASLAT, nem publikált)

**Állapot:** javaslat a kártya `dc8cabd2` PR-jaihoz. A tájékoztató maga a Fogyasztóbarát jogi dokumentuma (`/jogi/suti`), a
publikálása **Balázs szava**: acrobot a bekötéskor viszi elé. Ez a fájl a kód mellett azért áll, hogy a szöveg és a viselkedés egy
helyen legyen leírva, és egyik se csússzon el a másiktól.

## 1. YouTube videók (ez a PR: a termékleírásokba ágyazott videók)

> **YouTube videók.** Egyes termékeink leírásában YouTube videó található. A videó alapból **nem töltődik be**: helyette egy
> üzenetet látsz, és a videó csak akkor jön be, ha te kéred a „Videó betöltése” gombbal. Ekkor a videó a YouTube
> adatvédelem-barát (`youtube-nocookie.com`) címéről töltődik be, és a YouTube (Google) a saját szabályai szerint sütiket
> helyezhet el az eszközödön és adatokat gyűjthet. A kattintásodat nem jegyezzük meg: a következő oldalon a videó újra a gombra
> vár. Ha nem akarod betölteni, a „Megnyitás a YouTube-on” hivatkozás a videót a YouTube oldalán nyitja meg.

## 2. Névtelen teljesítménymérés (RUM, hozzájárulás nélkül)

> **Teljesítménymérés.** A bolt a lapok betöltési sebességét méri (Core Web Vitals). A mérés **semmit nem ír és nem olvas az
> eszközödön** (nincs süti, nincs helyi tárolás, nincs azonosító), és **nem megy harmadik félhez**: a böngésződ a mért számot
> (például a betöltés ezredmásodpercben) és az oldal típusát (például „termék”) a bolt saját szerverének küldi, a lap címe és
> bármilyen azonosító nélkül. Ezért nem igényel hozzájárulást. Ha ez a mérés valaha tárolást használna az eszközödön, a
> Statisztika kategóriába kerül, és csak a hozzájárulásoddal fut.

(A határ tesztelt: `rum-hozzajarulason-kivul.spec.tsx` pirosra vált, ha a mérés bármilyen tároló-API-t megnevez vagy ír.)

## 3. Mérőkódok (a következő PR-ban kerül be; a szöveg a bekötéskor él)

> **Statisztika (Google Analytics 4).** Csak ha a Statisztika kategóriát elfogadtad. Névtelen látogatottsági adatot gyűjt. Sütik:
> `_ga`, `_ga_<azonosító>` (legfeljebb 2 év), `_gid` (legfeljebb 24 óra).
>
> **Marketing (Google Ads, Meta pixel).** Csak ha a Marketing kategóriát elfogadtad. Hirdetések mérése és személyre szabása. Sütik:
> `_gcl_*` (legfeljebb 90 nap), `_fbp` (legfeljebb 90 nap), `_fbc`.
>
> A hozzájárulásodat a lap alján a „Sütibeállítások” gombbal bármikor visszavonhatod; a visszavonás a már elhelyezett fenti
> sütiket is törli.

A sütik pontos élettartamát a szolgáltatók dokumentációja adja; a végleges számokat a publikálás előtt a jogi szöveg felelőse ellenőrzi.
