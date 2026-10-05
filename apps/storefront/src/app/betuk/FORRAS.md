# A kirakat betűi, helyben tárolva

A `next/font/google` a betűket a BUILD alatt töltötte le a Google-től, és ez a
stage buildjét kétszer is megállította (`TypeError: Cannot read properties of
null (reading 1)` a next/font-ban, 2026-10-03 21:25 és 2026-10-05 10:15 UTC;
mindkétszer egy kézi újraindítás átment). Itt a fájlok a repóban állnak, a build
nem hív külső szolgáltatást.

## Forrás

- `google/fonts`, commit `9710da1eacb3be272583c3224dcb70f9da6eadbb`
  - `ofl/hankengrotesk/HankenGrotesk[wght].ttf`
  - `ofl/spacegrotesk/SpaceGrotesk[wght].ttf`
  - `ofl/jetbrainsmono/JetBrainsMono[wght].ttf`
  - `ofl/newsreader/Newsreader[opsz,wght].ttf`, `ofl/newsreader/Newsreader-Italic[opsz,wght].ttf`
  - `ofl/belleza/Belleza-Regular.ttf`
- A licenc mind az ötnél SIL Open Font License 1.1: `licencek/`.

## Vágás

Ugyanaz a két tartomány, amit a `next/font/google` a `subsets: ["latin",
"latin-ext"]` beállítással kért. A Google Fonts CSS-éből olvastuk ki
2026-10-05-én. Egy fájlba vágva, a változtatható tengelyek megmaradnak.

    latin      U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD
    latin-ext  U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF

    pipx run --spec "fonttools[woff]==4.60.1" pyftsubset <bemenet.ttf> \
      --unicodes="<a két tartomány, U+ nélkül, vesszővel>" \
      --layout-features='*' --flavor=woff2 --output-file=<kimenet.woff2>

## Visszamérve (fonttools, 2026-10-05)

Mind a hat fájlban megvan: á é í ó ö ő ú ü ű (kis- és nagybetűvel), €, –, „, ”.

| fájl | jelek | tengelyek |
|---|---|---|
| hanken-grotesk.woff2 | 410 | wght 100-900 |
| space-grotesk.woff2 | 556 | wght 300-700 |
| jetbrains-mono.woff2 | 404 | wght 100-800 |
| newsreader.woff2, newsreader-italic.woff2 | 442 | wght 200-800, opsz 6-72 |
| belleza.woff2 | 368 | (statikus) |
