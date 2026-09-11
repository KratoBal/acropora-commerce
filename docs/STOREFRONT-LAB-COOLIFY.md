# Storefront Lab telepítése Coolify-ban

Ez az alkalmazás az új Acropora vásárlói felület tesztkörnyezete. A forrása
az `apps/storefront-lab` könyvtárban van, ezért sem a meglévő
`apps/storefront`, sem annak domainje nem változik.

## Coolify szolgáltatás

Hozz létre egy új, külön **Application** szolgáltatást ugyanabból a
`Kratobal/acropora-commerce` repositoryból.

| Coolify mező  | Érték                               |
| ------------- | ----------------------------------- |
| Branch        | `feat/acropora-storefront-lab`      |
| Build Pack    | Dockerfile                          |
| Dockerfile    | `apps/storefront-lab/Dockerfile`    |
| Build context | repository root                     |
| Port          | `8010`                              |
| Domain        | egy új, elkülönített staging domain |

A meglévő staging storefront szolgáltatást és domainjét ne szerkeszd. A lab
szolgáltatás saját konténert és saját domainnevet kap.

## Környezeti változók

Mind a build, mind a runtime környezetben add meg az alábbi változókat:

```
MEDUSA_BACKEND_URL=https://commerce-stage.acropora.hu
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://commerce-stage.acropora.hu
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<staging publishable key>
NEXT_PUBLIC_DEFAULT_REGION=hu
NEXT_PUBLIC_BASE_URL=https://<lab-storefront-domain>
```

A `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` publikus Store API-kulcs. Admin
kulcsot, Medusa secretet vagy adatbázis-jelszót ne adj meg.

## Staging backend

Amennyiben a staging Medusa backend Store CORS listája korlátozott, add hozzá
az új lab domain originjét is. A lab katalógus- és kosárhívásai szerveroldalon
mennek, de ez a beállítás szükséges marad a későbbi böngészős Store API funkciókhoz.

## Mit lehet ellenőrizni

- a saját domainen megnyíló, Acropora arculatú kezdőoldal;
- Medusából érkező termékkártyák;
- élőlény és felszerelés termékoldal eltérő vizuális kezelése;
- többképes termékgaléria;
- a lab saját HTTP-only cookie-jába mentett Medusa tesztkosár.

A fizetési folyamat ebben az első lab verzióban szándékosan nincs bekapcsolva.
A SimplePay csak akkor kapcsolható ide, ha a staging backendhez külön,
tesztelésre szánt fizetési konfiguráció tartozik.

## Helyi indítás

```bash
pnpm storefront-lab:dev
```

A lab ekkor a `http://localhost:8010/hu` címen nyílik meg. A változókat
`apps/storefront-lab/.env.template` alapján kell beállítani.
