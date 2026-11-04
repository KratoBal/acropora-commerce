import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { resolveBrandService } from "../../../admin/brands/helpers";
import {
  elsodlegesKategoria,
  explicitAzonositok,
  kifutott,
  valasztas,
  type Kategoria,
} from "../jeloltek";

/**
 * A NEM KAPHATO TERMEK LAPJANAK ADATA (V4.2, kartya 9d0523fa).
 *
 * A kifutott termek a vetitesben `draft`, es nincs a kirakat csatornajan, tehat
 * a mai `/store/products` nem adja vissza, es a kirakat 404-et ad. Ez az
 * utvonal handle alapjan a lap MINIMUMAT adja: nev, handle, elsodleges
 * kategoria, es ket jelolt-lista azonositokkal (`jeloltek.ts`). A termekkartyakat
 * a kirakat a mai uton keri le (ar, kep, csatorna), mint a kereso.
 *
 * MIRE VALASZOL: csak NEM publikalt termekre, amin a kifutott jelolo all. A
 * publikalt termeknek a rendes lapja van; a jelolo nelkuli vazlat (egy keszulo
 * OS-termek) 404, ugyanazzal a valasszal, mint egy nem letezo handle, tehat az
 * utvonal nem arulja el, mi letezik.
 *
 * MEGVENNI ITT SEM LEHET: az utvonal nem ad valtozatot, arat vagy keszletet, es
 * a termek csatorna nelkul all.
 */
const DARAB = 100;
/** A kategoria+marka jeloltek lekerdezesenek felso hatara (a valasz ennel kevesebbet ad). */
const JELOLT_KERES_HATAR = 50;

const nincs = (res: MedusaResponse) =>
  res.status(404).json({ message: "Nincs ilyen nem kaphato termek." });

export const GET = async (req: MedusaStoreRequest, res: MedusaResponse) => {
  const handle = req.params.handle;
  const termekModul = req.scope.resolve(Modules.PRODUCT);
  const [termek] = await termekModul.listProducts(
    { handle },
    {
      select: ["id", "title", "handle", "status", "metadata"],
      relations: ["categories"],
      take: 1,
    },
  );
  if (!termek || termek.status === "published" || !kifutott(termek.metadata))
    return nincs(res);

  const kategoria = elsodlegesKategoria(
    termek.metadata,
    (termek.categories ?? []) as Kategoria[],
  );
  const explicit = explicitAzonositok(termek.metadata);

  /*
    A GEPI JELOLT: ugyanaz az elsodleges kategoria ES ugyanaz a marka. Ha
    barmelyik hianyzik, nincs gepi jelolt (a csak-kategoria jelolt ebben a
    szeletben nem megy ki, acrobot 42186).
  */
  let kategoriaMarkas: string[] = [];
  const markak = resolveBrandService(req.scope);
  const [kotes] = await markak.listProductBrands(
    { product_id: [termek.id] },
    { take: 1 },
  );
  if (kategoria && kotes) {
    const markaTermekei = (
      await markak.listProductBrands(
        { os_brand_id: [kotes.os_brand_id] },
        { take: null },
      )
    )
      .map((k: { product_id: string }) => k.product_id)
      .filter((id: string) => id !== termek.id);
    if (markaTermekei.length)
      kategoriaMarkas = (
        await termekModul.listProducts(
          {
            id: markaTermekei,
            status: "published",
            categories: { id: [kategoria.id] },
          },
          {
            select: ["id"],
            order: { created_at: "DESC", id: "DESC" },
            take: JELOLT_KERES_HATAR,
          },
        )
      ).map((t) => t.id);
  }

  const megveheto = await kirakatonMegveheto(req, [
    ...new Set([...explicit, ...kategoriaMarkas]),
  ]);
  const { helyette, hasonlo } = valasztas({
    sajatId: termek.id,
    explicit,
    kategoriaMarkas,
    megveheto,
  });

  res.json({
    termek: {
      id: termek.id,
      title: termek.title,
      handle: termek.handle,
      kategoria: kategoria
        ? { id: kategoria.id, name: kategoria.name, handle: kategoria.handle }
        : null,
    },
    helyette,
    hasonlo,
  });
};

/**
 * A jeloltek kozul a publikalt, a kirakat csatornajan allo termekek. A csatorna
 * a publishable kulcsbol jon (a landing-pages utvonal mintaja); kulcs-kontextus
 * nelkul csak a publikaltsag szur.
 */
async function kirakatonMegveheto(
  req: MedusaStoreRequest,
  azonositok: string[],
): Promise<Set<string>> {
  if (!azonositok.length) return new Set();
  const csatornak = req.publishable_key_context?.sales_channel_ids ?? [];
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const publikalt: { id: string; csatornai: string[] | null }[] = [];
  for (let i = 0; i < azonositok.length; i += DARAB) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "status", "sales_channels.id"],
      filters: { id: azonositok.slice(i, i + DARAB) },
    });
    for (const t of data as {
      id: string;
      status?: string | null;
      sales_channels?: { id: string }[] | null;
    }[])
      if (t.status === "published")
        publikalt.push({
          id: t.id,
          csatornai: Array.isArray(t.sales_channels)
            ? t.sales_channels.map((c) => c?.id)
            : null,
        });
  }
  /*
    AZ ORZO (a landing-pages utvonal mintaja, barracuda #544): ha EGYETLEN
    termeken sem jott meg a `sales_channels` mezo, a valasz nem hordozta az
    adatot, es a szukites minden jeloltet kiejtene, hiba nelkul. Ilyenkor nem
    szur, es nyomot hagy.
  */
  const vanMezo = publikalt.some((t) => t.csatornai !== null);
  if (csatornak.length && publikalt.length && !vanMezo)
    req.scope
      .resolve(ContainerRegistrationKeys.LOGGER)
      .warn(
        "[nem-kaphato] the candidates came without sales_channels; the lists are not narrowed to the storefront's channel",
      );
  return new Set(
    publikalt
      .filter(
        (t) =>
          !csatornak.length ||
          !vanMezo ||
          t.csatornai?.some((c) => csatornak.includes(c)),
      )
      .map((t) => t.id),
  );
}
