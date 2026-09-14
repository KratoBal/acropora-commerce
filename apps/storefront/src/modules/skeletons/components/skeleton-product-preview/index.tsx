import { Container } from "@modules/common/components/ui"

const SkeletonProductPreview = () => {
  return (
    <div className="animate-pulse">
      {/*
        A CSONTVAZ ARANYA A VALODI KARTYAEVAL EGYUTT MOZOG (2026-09-14).

        A kepdoboz a `thumbnail/index.tsx` fajlban 9/16-rol negyzetre valtott.
        Ha ez a helykitolto 9/16 maradna, a lista betoltes kozben MAGASABB
        lenne, mint a kesz kartya, es a lap a termekek megerkezesekor
        OSSZEUGRANA. Ez a fajl azert all itt kulon, mert a kereses a valodi
        kartyara nem hozza fel: mas mappaban van es mas a neve.
      */}
      <Container className="aspect-[1/1] w-full bg-gray-100 bg-ui-bg-subtle" />
      <div className="flex justify-between text-base-regular mt-2">
        <div className="w-2/5 h-6 bg-gray-100"></div>
        <div className="w-1/5 h-6 bg-gray-100"></div>
      </div>
    </div>
  )
}

export default SkeletonProductPreview
