/** A feladatokat legfeljebb `korlat` egyszerre futtatja, az eredmeny a feladatok SORRENDJEBEN jon. */
export async function korlattalFuttat<T>(
  feladatok: Array<() => Promise<T>>,
  korlat: number,
): Promise<T[]> {
  const eredmenyek: T[] = new Array(feladatok.length)
  let kovetkezo = 0
  const dolgozo = async () => {
    while (kovetkezo < feladatok.length) {
      const i = kovetkezo++
      eredmenyek[i] = await feladatok[i]()
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(korlat, feladatok.length) }, dolgozo),
  )
  return eredmenyek
}
