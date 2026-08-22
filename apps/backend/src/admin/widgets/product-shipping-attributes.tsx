import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Button, Container, Heading, Label, Switch, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Flags = {
  pickup_only: boolean
  foxpost_forbidden: boolean
  is_frozen: boolean
}

const EMPTY: Flags = {
  pickup_only: false,
  foxpost_forbidden: false,
  is_frozen: false,
}

const FIELDS: { key: keyof Flags; label: string; hint: string }[] = [
  {
    key: "pickup_only",
    label: "Csak bolti átvétel",
    hint: "A teljes rendelést bolti átvételre kényszeríti.",
  },
  {
    key: "foxpost_forbidden",
    label: "Foxpost tiltva",
    hint: "A Foxpost csomagpont nem választható.",
  },
  {
    key: "is_frozen",
    label: "Fagyasztott",
    hint: "Fagyasztott áru, csak bolti átvétellel adható át.",
  },
]

const ProductShippingAttributesWidget = ({
  data,
}: DetailWidgetProps<AdminProduct>) => {
  const [flags, setFlags] = useState<Flags>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/admin/shipping-attributes/${data.id}`, {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const body = await response.json()
        if (!cancelled) {
          setFlags({ ...EMPTY, ...(body.shipping_attribute ?? {}) })
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(`Nem sikerult betolteni a szallitasi jellemzoket: ${e}`)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [data.id])

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/admin/shipping-attributes/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flags),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      toast.success("Szallitasi jellemzok mentve.")
    } catch (e) {
      toast.error(`Nem sikerult menteni: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Szállítás</Heading>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex items-start justify-between gap-x-4">
            <div className="flex flex-col">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Text size="small" className="text-ui-fg-subtle">
                {field.hint}
              </Text>
            </div>
            <Switch
              id={field.key}
              checked={flags[field.key]}
              disabled={loading || saving}
              onCheckedChange={(checked) =>
                setFlags((current) => ({ ...current, [field.key]: checked }))
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end px-6 py-4">
        <Button size="small" onClick={save} isLoading={saving} disabled={loading}>
          Mentés
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductShippingAttributesWidget
