/**
 * A kérés törzse FOLYAMKÉNT, legfeljebb `legfeljebbBajt` bajtig. A `content-length` hiányozhat (darabolt átvitel) vagy
 * hazudhat, ezért a korlát a beolvasás közben érvényesül: a határ fölött az olvasás megszakad, a maradékot nem olvassuk
 * be, és az eredmény `null` (a hívó 413-at ad). Egy kép-feltöltő útnak ez a törzskorlátja, a szerver-műveletekét
 * (alapértelmezés 1 MB) nem kell miatta megemelni.
 */
export async function korlatosTorzs(
  request: Request,
  legfeljebbBajt: number,
): Promise<string | null> {
  if (!request.body) return ""
  const olvaso = request.body.getReader()
  const darabok: Uint8Array[] = []
  let hossz = 0
  for (;;) {
    const { done, value } = await olvaso.read()
    if (done) break
    hossz += value.byteLength
    if (hossz > legfeljebbBajt) {
      await olvaso.cancel().catch(() => undefined)
      return null
    }
    darabok.push(value)
  }
  const egyben = new Uint8Array(hossz)
  let hely = 0
  for (const darab of darabok) {
    egyben.set(darab, hely)
    hely += darab.byteLength
  }
  return new TextDecoder().decode(egyben)
}
