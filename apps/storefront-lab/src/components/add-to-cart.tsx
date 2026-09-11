"use client";

import { useState } from "react";

export function AddToCart({
  variantId,
  disabled,
}: {
  variantId?: string;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "adding" | "added" | "error">(
    "idle",
  );

  async function addItem() {
    if (!variantId) return;
    setState("adding");
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId, quantity: 1, countryCode: "hu" }),
      });
      if (!response.ok) throw new Error("A kosár frissítése nem sikerült.");
      setState("added");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="add-to-cart">
      <button
        disabled={disabled || !variantId || state === "adding"}
        onClick={addItem}
        type="button"
      >
        {state === "adding" ? "Kosár frissítése…" : "Kosárba teszem"}
      </button>
      <p aria-live="polite">
        {state === "added" && "A termék a Medusa tesztkosárba került."}
        {state === "error" &&
          "A termék most nem került a kosárba. Próbáld újra."}
        {disabled && "Ez a termék jelenleg nem rendelhető."}
      </p>
    </div>
  );
}
