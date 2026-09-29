import Input from "@modules/common/components/input"

/**
 * A CIM KET UJ MEZOJE a felvetel es a szerkesztes ablakaban (P5, 257:51): a
 * cim neve ("Otthon") es az alapertelmezett szallitasi cim jelolo. A rejtett
 * `alapertelmezett_mezo` mondja meg a mentesnek, hogy a pipa az urlapon volt
 * (egy bejeloletlen pipa semmit nem kuld). Az ablakoknak nincs kerete, ezert a
 * meglevo mezo-alakot kovetik.
 */
export default function CimMezok({
  nev,
  alapertelmezett,
}: {
  nev?: string | null
  alapertelmezett?: boolean | null
}) {
  return (
    <>
      <Input
        label="A cím neve (pl. Otthon)"
        name="address_name"
        defaultValue={nev ?? undefined}
        data-testid="address-name-input"
      />
      <input type="hidden" name="alapertelmezett_mezo" value="1" />
      <label className="flex items-center gap-2 text-small-regular">
        <input
          type="checkbox"
          name="is_default_shipping"
          defaultChecked={!!alapertelmezett}
          className="h-[15px] w-[15px] accent-[var(--acr-color-navy)]"
          data-testid="address-default-checkbox"
        />
        Alapértelmezett szállítási cím
      </label>
    </>
  )
}
