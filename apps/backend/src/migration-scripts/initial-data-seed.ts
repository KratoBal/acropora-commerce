import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
} from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * The settings this shop actually runs on, so they are typed once and not twice.
 *
 * WHY THIS FILE CHANGED COMPLETELY. Until now it held Medusa's factory example:
 * British, German, Danish, Swedish, French and Italian regions, a "Default
 * Sales Channel" described as "Created by Medusa", and two example shipping
 * options at 10 EUR. Not one line of it was ours. Balázs asked whether the
 * settings that exist on the test machine have to be typed again on production;
 * the answer is no, and this is where that answer lives.
 *
 * All seven values were MEASURED on the test machine on 2026-09-02 by acrobot,
 * with direct read-only SQL, and not derived from names. Where a name looked
 * obvious it was still asked for: the region is called "Hungary", not
 * "Magyarország" - the Hungarian form was a guess in the request and would have
 * produced a second, wrong region.
 *
 * ===================================================================
 * WHAT THIS SCRIPT DOES NOT DO, AND WILL NOT
 * ===================================================================
 *
 * IT CREATES NO SECRETS. Two publishable/secret keys exist on the test machine;
 * production needs NEW ones, issued by hand. A key in a seed is a key in the
 * repository, and this repository is public - see `scripts/scan-secrets.mjs`
 * for what that costs.
 *
 * IT WRITES NO `shipping_payment_rule` ROWS, AND THE REASON WRITTEN HERE FIRST
 * WAS WRONG. It said the pairings were "a separate decision". Measured
 * afterwards: they are decided. `SHIPPING_PAYMENT_RULE_SEED` in
 * `workflows/utils/shipping-payment-rules.ts` holds all eight pairs, and a unit
 * test asserts them against the code matrix.
 *
 * WHAT IS ACTUALLY TRUE IS NARROWER, AND IT IS WHY THE ROWS STILL DO NOT BELONG
 * HERE YET: the table has no reader. `toShippingRolePayments` is called by
 * nothing but its own test, and no production code queries the table - the
 * eligibility rules run from the code matrix. Seeding rows today would store a
 * second copy of a decision nothing consults, in a table whose first consumer
 * arrives later; at that moment there would be two sources, one of them written
 * months earlier by a seed and never looked at since.
 *
 * So the rows belong in the change that wires the reader, together with
 * retiring the code matrix - one change, one source. Not before.
 *
 * IT ATTACHES NO SHIPPING RULES. The `shipping_class` rules are applied by
 * `src/scripts/configure-shipping-rules.ts`, which reads the role bindings and
 * runs dry by default. Duplicating that logic here would give two places to
 * change and one to forget.
 *
 * IT DOES NOT RUN ITSELF ANYWHERE. Writing to the live shop needs Balázs's
 * permission for that occasion, every time.
 *
 * ===================================================================
 * THE ONE THING IT CANNOT CARRY ACROSS, AND THE REASON IS STRUCTURAL
 * ===================================================================
 *
 * `CreateShippingOptionDTO` has NO `id` field - measured in the installed
 * package. Medusa generates the id, and a caller cannot ask for a specific one.
 *
 * That matters more here than it would elsewhere, because this codebase
 * identifies shipping options BY ID in three places: the role table in
 * `workflows/utils/shipping-option-roles.ts`, the calculated-pricing contract
 * (`data.id` equals the option's own id), and the six `ACROPORA_SO_*`
 * overrides.
 *
 * So on a fresh database the five other settings transfer exactly, and the
 * shipping options do NOT: their ids are new. This script therefore prints the
 * six override lines at the end, ready to paste, and says what breaks without
 * them. A plan that promised the same guarantee for all seven would have failed
 * at the sixth, in production.
 *
 * ===================================================================
 * IDEMPOTENT, BECAUSE THE FACTORY VERSION WAS NOT
 * ===================================================================
 *
 * The factory seed left twenty-one sales channels and twenty-eight API keys on
 * the test machine, which is what running a non-idempotent seed repeatedly
 * looks like. Every step here asks whether the thing exists first, by name, and
 * skips it if it does. Running this twice creates nothing the second time.
 */

/**
 * A MERT ERTEKEK, EXPORTALVA, HOGY ALLITAST LEHESSEN RAJUK TENNI.
 *
 * Eddig modul-szintu, nem exportalt konstansok voltak, es ezert SEMMI nem
 * merte oket: egy elirt nev vagy egy kiesett szallitasi mod ugyanugy lefordult
 * volna. Egy seed, ami het mert erteket ir be, es amirol egyetlen allitas sem
 * szol, pontosan az az alak, amit a lapunk "megneveztem a lyukat, es kikuldtem
 * rajta a funkciot" nev alatt gyujt.
 *
 * A HOZZA TARTOZO TESZT (`__tests__/initial-data-seed.unit.spec.ts`) a MERESt
 * tartalmazza kulon leirva, nem ebbol szamolja -- kulonben az allitas azt
 * mondana, hogy a konstans egyenlo onmagaval.
 */
const REGIO_NEVE = "Hungary";
const CSATORNA_NEVE = "Acropora Webshop";
const RAKTAR_NEVE = "Acropora Budapest";
const PICKUP_SET_NEVE = "Acropora Budapest pick up";
const SHIPPING_SET_NEVE = "Acropora Budapest shipping";
const PICKUP_ZONA = "Bolti átvétel";
const SHIPPING_ZONA = "Házhozszállítás";

/**
 * A hat szállítási mód, a szerepével együtt.
 *
 * A NEVEK ÉS A SORREND a `workflows/utils/shipping-option-roles.ts` táblájából
 * valók, hogy a kiírt környezeti változók és a szerep-tábla ne tudjanak
 * elcsúszni. A `calculated` mezők a mérésből: öt tétel calculated, egy flat.
 */
const SZALLITASI_MODOK = [
  {
    name: "Bolti átvétel",
    env: "ACROPORA_SO_PICKUP",
    zona: PICKUP_ZONA,
    calculated: false,
  },
  {
    name: "GLS házhozszállítás",
    env: "ACROPORA_SO_GLS_HOME",
    zona: SHIPPING_ZONA,
    calculated: true,
  },
  {
    name: "GLS csomagpont",
    env: "ACROPORA_SO_GLS_POINT",
    zona: SHIPPING_ZONA,
    calculated: true,
  },
  {
    name: "GLS nehézáru házhozszállítás",
    env: "ACROPORA_SO_GLS_HEAVY_HOME",
    zona: SHIPPING_ZONA,
    calculated: true,
  },
  {
    name: "GLS nehézáru csomagpont",
    env: "ACROPORA_SO_GLS_HEAVY_POINT",
    zona: SHIPPING_ZONA,
    calculated: true,
  },
  {
    name: "Foxpost csomagpont",
    env: "ACROPORA_SO_FOXPOST",
    zona: SHIPPING_ZONA,
    calculated: true,
  },
] as const;

/**
 * A SEED HET TETELE, EGY HELYEN, OLVASHATO ALAKBAN.
 *
 * Nem uj forras: ugyanazokat a konstansokat mutatja meg, amikbol a szkript
 * dolgozik. Azert all itt, hogy a teszt ne a fuggveny FUTASABOL kovetkeztessen
 * (ahhoz adatbazis kellene), hanem az ERTEKEKET nezhesse meg.
 */
export const SEED_SETTINGS = {
  regio: { nev: REGIO_NEVE, penznem: "huf" },
  ado: { orszag: "hu", kulcsNeve: "Áfa", szazalek: 27 },
  csatorna: CSATORNA_NEVE,
  raktar: RAKTAR_NEVE,
  szallitasiModok: SZALLITASI_MODOK,
  fizetesiSzolgaltatok: ["pp_system_default", "pp_acropora_cod"],
} as const;

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT,
  );

  /** Létezik-e már egy adott nevű sor. Ez az idempotencia egyetlen eszköze. */
  const letezik = async (entity: string, name: string) => {
    const { data } = await query.graph({
      entity,
      fields: ["id", "name"],
      filters: { name },
    });
    return data?.[0] ?? null;
  };

  // --- 1. RÉGIÓ -----------------------------------------------------------
  let region = await letezik("region", REGIO_NEVE);
  if (region) {
    logger.info(`A(z) "${REGIO_NEVE}" régió már létezik, kihagyva.`);
  } else {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: SEED_SETTINGS.regio.nev,
            currency_code: SEED_SETTINGS.regio.penznem,
            countries: [SEED_SETTINGS.ado.orszag],
            // MIND A KETTO ENGEDELYEZVE a teszt gepen. A pp_acropora_cod a sajat
            // utanvet-szolgaltatonk, a pp_system_default a beepitett.
            payment_providers: [...SEED_SETTINGS.fizetesiSzolgaltatok],
          },
        ],
      },
    });
    region = result[0];
    logger.info(
      `Régió létrehozva: ${SEED_SETTINGS.regio.nev} (${SEED_SETTINGS.regio.penznem})`,
    );
  }

  // --- 2. ADÓTERÜLET ÉS A 27 SZÁZALÉKOS KULCS -----------------------------
  const { data: adoteruletek } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
    filters: { country_code: SEED_SETTINGS.ado.orszag },
  });
  if (adoteruletek?.length) {
    logger.info("A magyar adóterület már létezik, kihagyva.");
  } else {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: SEED_SETTINGS.ado.orszag,
          provider_id: "tp_system",
          // A `default_tax_rate` MAGA az alapertelmezes: a tipusban nincs
          // `is_default` mezo, es a fordito ezt meg is mondta. A mert
          // "is_default igaz" allapotot eppen ez allitja elo.
          default_tax_rate: {
            name: SEED_SETTINGS.ado.kulcsNeve,
            rate: SEED_SETTINGS.ado.szazalek,
          },
        },
      ],
    });
    logger.info(
      `Adóterület létrehozva: ${SEED_SETTINGS.ado.orszag}, ` +
        `${SEED_SETTINGS.ado.szazalek} százalékos alapkulccsal.`,
    );
  }

  // --- 3. ÉRTÉKESÍTÉSI CSATORNA -------------------------------------------
  let csatorna = await letezik("sales_channel", CSATORNA_NEVE);
  if (csatorna) {
    logger.info(`A(z) "${CSATORNA_NEVE}" csatorna már létezik, kihagyva.`);
  } else {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: CSATORNA_NEVE }] },
    });
    csatorna = result[0];
    logger.info(`Értékesítési csatorna létrehozva: ${CSATORNA_NEVE}`);
  }

  // --- 4. RAKTÁR ----------------------------------------------------------
  let raktar = await letezik("stock_location", RAKTAR_NEVE);
  if (raktar) {
    logger.info(`A(z) "${RAKTAR_NEVE}" raktár már létezik, kihagyva.`);
  } else {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: RAKTAR_NEVE,
            // A PONTOS UTCA NEM VOLT A MERESBEN, es nem talalom ki: a varos es
            // az orszag a nevbol es a regiobol kovetkezik, az utca ures marad,
            // ugyanugy, ahogy a gyari peldaban is ures volt. Ha szamit, a Medusa
            // adminban egy sor.
            address: { city: "Budapest", country_code: "hu", address_1: "" },
          },
        ],
      },
    });
    raktar = result[0];
    logger.info(`Raktár létrehozva: ${RAKTAR_NEVE}`);

    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: raktar.id, add: [csatorna.id] },
    });
    logger.info("A raktár és az értékesítési csatorna összekötve.");
  }

  // --- 5. FULFILLMENT SETEK ÉS ZÓNÁK --------------------------------------
  //
  // KETTO A MIENK: egy pickup (bolti atvetel) es egy shipping (hazhozszallitas),
  // mindketto magyar orszag-zonaval. A gyari "European Warehouse delivery" NEM
  // kerul letrehozasra: az a peldabol valo.
  const { data: meglevoSetek } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "type", "service_zones.id", "service_zones.name"],
  });
  const setNevSzerint = new Map(
    (meglevoSetek ?? []).map((s: { name: string }) => [s.name, s]),
  );

  const setEloallit = async (
    name: string,
    type: "pickup" | "shipping",
    zona: string,
  ) => {
    const meglevo = setNevSzerint.get(name);
    if (meglevo) {
      logger.info(`A(z) "${name}" fulfillment set már létezik, kihagyva.`);
      return meglevo;
    }
    const letrehozott = await fulfillmentModuleService.createFulfillmentSets({
      name,
      type,
      service_zones: [
        { name: zona, geo_zones: [{ country_code: "hu", type: "country" }] },
      ],
    });
    logger.info(`Fulfillment set létrehozva: ${name} (${type})`);
    return letrehozott;
  };

  const pickupSet = await setEloallit(PICKUP_SET_NEVE, "pickup", PICKUP_ZONA);
  const shippingSet = await setEloallit(
    SHIPPING_SET_NEVE,
    "shipping",
    SHIPPING_ZONA,
  );

  const zonaAzonosito = (set: unknown, nev: string) => {
    const zonak = (set as { service_zones?: { name: string; id: string }[] })
      .service_zones;
    const zona = zonak?.find((z) => z.name === nev);
    if (!zona) {
      throw new Error(
        `Nem találom a(z) "${nev}" szolgáltatási zónát. A seed itt megáll, mert egy zóna nélkül a szállítási módok rossz helyre kerülnének.`,
      );
    }
    return zona.id;
  };

  // A SZALLITASI PROFIL A GYARI, es ez szandekos: a teszt gepen is egyetlen
  // profil all, a "Default Shipping Profile". Nem cserelni valo.
  const { data: profilok } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  });
  const profil = profilok?.[0];
  if (!profil) {
    throw new Error(
      "Nincs szállítási profil. A seed itt megáll: profil nélkül egyetlen szállítási mód sem hozható létre.",
    );
  }

  // --- 6. A HAT SZÁLLÍTÁSI MÓD --------------------------------------------
  const kiirandoAzonositok: { env: string; id: string }[] = [];

  for (const mod of SZALLITASI_MODOK) {
    const meglevo = await letezik("shipping_option", mod.name);
    if (meglevo) {
      logger.info(`A(z) "${mod.name}" szállítási mód már létezik, kihagyva.`);
      kiirandoAzonositok.push({ env: mod.env, id: meglevo.id });
      continue;
    }

    const zonaId = zonaAzonosito(
      mod.zona === PICKUP_ZONA ? pickupSet : shippingSet,
      mod.zona,
    );

    // A KET ALAK KULON AG, ES NEM EGY OBJEKTUM FELTETELES MEZOKKEL.
    //
    // A `price_type` DISZKRIMINAL: a flat alak megkoveteli a `prices` tombot, a
    // calculated pedig tiltja. Az elso valtozatom egy objektumot epitett
    // feltételes spreadekkel, es a fordito jogosan utasitotta el -- pontosan azt
    // az ellenorzest utotte ki, ami itt a leghasznosabb.
    const kozos = {
      name: mod.name,
      service_zone_id: zonaId,
      shipping_profile_id: profil.id,
      type: { label: mod.name, description: mod.name, code: mod.env },
    };

    const { result } = await createShippingOptionsWorkflow(container).run({
      input: [
        mod.calculated
          ? {
              ...kozos,
              price_type: "calculated" as const,
              provider_id: "acropora_shipping",
            }
          : {
              ...kozos,
              price_type: "flat" as const,
              provider_id: "manual_manual",
              data: { id: "manual-fulfillment" },
              // A BOLTI ATVETEL ARA NULLA, ES KI VAN IRVA, NEM ELHAGYVA. Egy ar
              // nelkuli flat opcio MAST jelent, mint egy nulla forintos: az
              // elso arazatlan, a masodik ingyenes.
              prices: [
                { currency_code: "huf", amount: 0 },
                { currency_code: "eur", amount: 0 },
                { currency_code: "usd", amount: 0 },
              ],
            },
      ],
    });

    const letrehozott = result[0];
    kiirandoAzonositok.push({ env: mod.env, id: letrehozott.id });

    // A SZAMITOTT ARAZAS SZERZODESE: a szolgaltato option data-jaban a `data.id`
    // MEGEGYEZIK az opcio sajat azonositojaval. Ezt csak a letrehozas UTAN lehet
    // beallitani, mert az azonositot a Medusa generalja.
    if (mod.calculated) {
      await updateShippingOptionsWorkflow(container).run({
        input: [{ id: letrehozott.id, data: { id: letrehozott.id } }],
      });
    }

    logger.info(
      `Szállítási mód létrehozva: ${mod.name} (${mod.calculated ? "calculated" : "flat"})`,
    );
  }

  // --- A HAT SOR, AMIT KÉZZEL KELL ÁTVINNI --------------------------------
  logger.info("");
  logger.info("=== A HAT SOR, AMI NEM MEGY AT MAGATOL ===");
  logger.info("");
  for (const { env, id } of kiirandoAzonositok) {
    logger.info(`${env}=${id}`);
  }
  logger.info("");
  logger.info(
    "Ezek a sorok az apps/backend/.env fajlba valok, ebben a kornyezetben.",
  );
  logger.info("");
  logger.info("HA KIMARADNAK, EZ TORIK EL, ES CSENDBEN:");
  logger.info(
    "  1. A szerep-tabla beegetett azonositoi egy MASIK kornyezet opcioira mutatnak,",
  );
  logger.info(
    "     tehat egyetlen szallitasi mod sem kap szerepet. A fizetesi jogosultsag ures",
  );
  logger.info("     listat ad: a vevo nem tud fizetesi modot valasztani.");
  logger.info(
    "  2. A configure-shipping-rules szkript ugyanezt a tablat olvassa, tehat a",
  );
  logger.info("     shipping_class szabalyok sem a helyes opciokra kerulnek.");
  logger.info("");
  logger.info(
    "Egyik sem ad hibauzenetet. A bolt elindul, es a kassza nem mukodik.",
  );
  logger.info("");
  logger.info("A kovetkezo lepes, miutan a hat sor a helyen van:");
  logger.info(
    "  npx medusa exec ./src/scripts/configure-shipping-rules.ts        # terv",
  );
  logger.info(
    "  npx medusa exec ./src/scripts/configure-shipping-rules.ts apply  # alkalmazas",
  );
}
