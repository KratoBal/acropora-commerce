// GENERÁLT FÁJL, kézzel ne írd: a kirakat szótárából jön (apps/storefront/src/lib/i18n/vevoi-szoveg-katalogus.ts).
// Újragenerálás: KATALOGUS_IRAS=1 npx vitest run src/lib/i18n/vevoi-szoveg-katalogus.spec.ts (az apps/storefront-ból).
export type CustomerTextGroup =
  | "penztar"
  | "rendeles-leadva"
  | "rendeles-allapota"
  | "elallas"
  | "hibabejelentes"
  | "fiok"
  | "hirlevel"
  | "suti"

export const CUSTOMER_TEXT_GROUPS: readonly CustomerTextGroup[] = ["penztar","rendeles-leadva","rendeles-allapota","elallas","hibabejelentes","fiok","hirlevel","suti"]

export const CUSTOMER_TEXT_CATALOG: readonly { key: string; group: CustomerTextGroup; hu: string; en: string }[] = [
  {
    "key": "cart.add",
    "group": "penztar",
    "hu": "Kosárba",
    "en": "Add to cart"
  },
  {
    "key": "cart.adding",
    "group": "penztar",
    "hu": "Kosárba teszem…",
    "en": "Adding to cart…"
  },
  {
    "key": "cart.added",
    "group": "penztar",
    "hu": "Kosárba került",
    "en": "Added to cart"
  },
  {
    "key": "cart.failed",
    "group": "penztar",
    "hu": "Nem sikerült, próbáld újra",
    "en": "That did not work, try again"
  },
  {
    "key": "cart.addAria",
    "group": "penztar",
    "hu": "{name} kosárba",
    "en": "Add {name} to cart"
  },
  {
    "key": "cartMenu.title",
    "group": "penztar",
    "hu": "Kosár",
    "en": "Cart"
  },
  {
    "key": "cartMenu.quantity",
    "group": "penztar",
    "hu": "Mennyiség: {count}",
    "en": "Quantity: {count}"
  },
  {
    "key": "cartMenu.remove",
    "group": "penztar",
    "hu": "Eltávolítás",
    "en": "Remove"
  },
  {
    "key": "cartMenu.subtotal",
    "group": "penztar",
    "hu": "Részösszeg",
    "en": "Subtotal"
  },
  {
    "key": "cartMenu.subtotalNote",
    "group": "penztar",
    "hu": "(adók nélkül)",
    "en": "(excl. taxes)"
  },
  {
    "key": "cartMenu.goToCart",
    "group": "penztar",
    "hu": "Ugrás a kosárhoz",
    "en": "Go to the cart"
  },
  {
    "key": "cartMenu.empty",
    "group": "penztar",
    "hu": "A kosarad üres.",
    "en": "Your cart is empty."
  },
  {
    "key": "cartMenu.allProducts",
    "group": "penztar",
    "hu": "Ugrás az összes termékhez",
    "en": "Go to all products"
  },
  {
    "key": "cartMenu.discover",
    "group": "penztar",
    "hu": "Termékek felfedezése",
    "en": "Explore products"
  },
  {
    "key": "account.auth.eyebrow",
    "group": "fiok",
    "hu": "Fiók",
    "en": "Account"
  },
  {
    "key": "account.auth.login.title",
    "group": "fiok",
    "hu": "Bejelentkezés",
    "en": "Sign in"
  },
  {
    "key": "account.auth.login.description",
    "group": "fiok",
    "hu": "Lépj be a rendeléseidhez, címeidhez és számláidhoz.",
    "en": "Sign in to see your orders, addresses and invoices."
  },
  {
    "key": "account.auth.login.mobileDescription",
    "group": "fiok",
    "hu": "Lépj be a rendeléseidhez és számláidhoz.",
    "en": "Sign in to see your orders and invoices."
  },
  {
    "key": "account.auth.login.verificationStart",
    "group": "fiok",
    "hu": "A belépés előtt ellenőrizni kell ezt az e-mail-címet:",
    "en": "This e-mail address has to be verified before you can sign in:"
  },
  {
    "key": "account.auth.login.verificationEnd",
    "group": "fiok",
    "hu": "Az ellenőrző levél küldése még nincs bekötve, ezért kérjük, vedd fel velünk a kapcsolatot.",
    "en": "The verification e-mail is not set up yet, so please contact us."
  },
  {
    "key": "account.auth.login.email",
    "group": "fiok",
    "hu": "E-mail",
    "en": "Email"
  },
  {
    "key": "account.auth.login.emailTitle",
    "group": "fiok",
    "hu": "Adj meg érvényes e-mail-címet.",
    "en": "Enter a valid e-mail address."
  },
  {
    "key": "account.auth.login.password",
    "group": "fiok",
    "hu": "Jelszó",
    "en": "Password"
  },
  {
    "key": "account.auth.login.submit",
    "group": "fiok",
    "hu": "Bejelentkezés",
    "en": "Sign in"
  },
  {
    "key": "account.auth.login.noAccount",
    "group": "fiok",
    "hu": "Nincs még fiókod?",
    "en": "Do not have an account yet?"
  },
  {
    "key": "account.auth.login.toRegister",
    "group": "fiok",
    "hu": "Regisztráció",
    "en": "Register"
  },
  {
    "key": "account.auth.login.forgot",
    "group": "fiok",
    "hu": "Elfelejtett jelszó?",
    "en": "Forgot your password?"
  },
  {
    "key": "account.auth.forgot.title",
    "group": "fiok",
    "hu": "Elfelejtett jelszó",
    "en": "Forgot your password"
  },
  {
    "key": "account.auth.forgot.description",
    "group": "fiok",
    "hu": "Add meg az e-mail-címedet. Ha van fiókod ezzel a címmel, levélben küldünk egy linket, amin új jelszót állíthatsz be.",
    "en": "Enter your e-mail address. If there is an account with this address, we will send you a link where you can set a new password."
  },
  {
    "key": "account.auth.forgot.mobileDescription",
    "group": "fiok",
    "hu": "Add meg az e-mail-címedet, és levélben küldünk egy linket.",
    "en": "Enter your e-mail address and we will send you a link."
  },
  {
    "key": "account.auth.forgot.email",
    "group": "fiok",
    "hu": "E-mail",
    "en": "Email"
  },
  {
    "key": "account.auth.forgot.emailTitle",
    "group": "fiok",
    "hu": "Adj meg érvényes e-mail-címet.",
    "en": "Enter a valid e-mail address."
  },
  {
    "key": "account.auth.forgot.submit",
    "group": "fiok",
    "hu": "Link küldése",
    "en": "Send the link"
  },
  {
    "key": "account.auth.forgot.sent",
    "group": "fiok",
    "hu": "Megkaptuk a kérésedet. Ha ehhez a címhez tartozik fiók, hamarosan levelet küldünk rá a linkkel. A link rövid ideig érvényes, ezért érdemes hamar megnyitni. Ha pár perc múlva sem érkezik meg, nézd meg a levélszemét mappát is.",
    "en": "We have received your request. If there is an account with this address, we will soon send a mail to it with the link. The link is valid for a short time, so it is best to open it soon. If it has not arrived in a few minutes, check your spam folder too."
  },
  {
    "key": "account.auth.forgot.toLogin",
    "group": "fiok",
    "hu": "Vissza a bejelentkezéshez",
    "en": "Back to sign in"
  },
  {
    "key": "account.auth.reset.title",
    "group": "fiok",
    "hu": "Új jelszó beállítása",
    "en": "Set a new password"
  },
  {
    "key": "account.auth.reset.description",
    "group": "fiok",
    "hu": "Add meg az új jelszavadat. A link, amelyen idejöttél, egyszer használható.",
    "en": "Enter your new password. The link you came here from works once."
  },
  {
    "key": "account.auth.reset.mobileDescription",
    "group": "fiok",
    "hu": "Add meg az új jelszavadat.",
    "en": "Enter your new password."
  },
  {
    "key": "account.auth.reset.password",
    "group": "fiok",
    "hu": "Új jelszó",
    "en": "New password"
  },
  {
    "key": "account.auth.reset.passwordAgain",
    "group": "fiok",
    "hu": "Új jelszó újra",
    "en": "New password again"
  },
  {
    "key": "account.auth.reset.submit",
    "group": "fiok",
    "hu": "Jelszó mentése",
    "en": "Save password"
  },
  {
    "key": "account.auth.reset.done",
    "group": "fiok",
    "hu": "Az új jelszavad mentve. Most már beléphetsz vele.",
    "en": "Your new password is saved. You can sign in with it now."
  },
  {
    "key": "account.auth.reset.toLogin",
    "group": "fiok",
    "hu": "Bejelentkezés",
    "en": "Sign in"
  },
  {
    "key": "account.auth.reset.noLink",
    "group": "fiok",
    "hu": "Ez a link nem érvényes. Kérj újat az „Elfelejtett jelszó” oldalon.",
    "en": "This link is not valid. Ask for a new one on the \"Forgot your password\" page."
  },
  {
    "key": "account.auth.reset.askNew",
    "group": "fiok",
    "hu": "Új link kérése",
    "en": "Ask for a new link"
  },
  {
    "key": "account.auth.register.title",
    "group": "fiok",
    "hu": "Regisztráció",
    "en": "Register"
  },
  {
    "key": "account.auth.register.description",
    "group": "fiok",
    "hu": "Hozd létre az Acropora fiókodat a gyorsabb vásárláshoz.",
    "en": "Create your Acropora account for faster shopping."
  },
  {
    "key": "account.auth.register.mobileDescription",
    "group": "fiok",
    "hu": "Hozd létre az Acropora fiókodat.",
    "en": "Create your Acropora account."
  },
  {
    "key": "account.auth.register.lastName",
    "group": "fiok",
    "hu": "Vezetéknév",
    "en": "Last name"
  },
  {
    "key": "account.auth.register.firstName",
    "group": "fiok",
    "hu": "Keresztnév",
    "en": "First name"
  },
  {
    "key": "account.auth.register.email",
    "group": "fiok",
    "hu": "E-mail",
    "en": "Email"
  },
  {
    "key": "account.auth.register.password",
    "group": "fiok",
    "hu": "Jelszó",
    "en": "Password"
  },
  {
    "key": "account.auth.register.passwordAgain",
    "group": "fiok",
    "hu": "Jelszó újra",
    "en": "Password again"
  },
  {
    "key": "account.auth.register.acceptStart",
    "group": "fiok",
    "hu": "Elfogadom az",
    "en": "I accept the"
  },
  {
    "key": "account.auth.register.termsLink",
    "group": "fiok",
    "hu": "ÁSZF-et",
    "en": "terms and conditions"
  },
  {
    "key": "account.auth.register.acceptMiddle",
    "group": "fiok",
    "hu": "és az",
    "en": "and the"
  },
  {
    "key": "account.auth.register.privacyLink",
    "group": "fiok",
    "hu": "adatkezelési tájékoztatót",
    "en": "privacy notice"
  },
  {
    "key": "account.auth.register.submit",
    "group": "fiok",
    "hu": "Fiók létrehozása",
    "en": "Create account"
  },
  {
    "key": "account.auth.register.haveAccount",
    "group": "fiok",
    "hu": "Már van fiókod?",
    "en": "Already have an account?"
  },
  {
    "key": "account.auth.register.toLogin",
    "group": "fiok",
    "hu": "Bejelentkezés",
    "en": "Sign in"
  },
  {
    "key": "account.auth.verify.title",
    "group": "fiok",
    "hu": "E-mail-cím ellenőrzése",
    "en": "Verifying your e-mail address"
  },
  {
    "key": "account.auth.verify.verifying",
    "group": "fiok",
    "hu": "Az e-mail-cím ellenőrzése folyamatban...",
    "en": "Verifying your e-mail address..."
  },
  {
    "key": "account.auth.verify.success",
    "group": "fiok",
    "hu": "Az e-mail-címed ellenőrizve. Most már beléphetsz a fiókodba.",
    "en": "Your e-mail address is verified. You can sign in now."
  },
  {
    "key": "account.auth.verify.failure",
    "group": "fiok",
    "hu": "Ez az ellenőrző link érvénytelen vagy lejárt. Jelentkezz be új ellenőrző e-mail kéréséhez.",
    "en": "This verification link is invalid or has expired. Sign in to ask for a new verification e-mail."
  },
  {
    "key": "account.auth.verify.signIn",
    "group": "fiok",
    "hu": "Belépés",
    "en": "Sign in"
  },
  {
    "key": "account.auth.verify.metaTitle",
    "group": "fiok",
    "hu": "E-mail-cím megerősítése",
    "en": "Confirm your e-mail address"
  },
  {
    "key": "account.auth.verify.metaDescription",
    "group": "fiok",
    "hu": "Erősítsd meg az e-mail-címedet a regisztráció befejezéséhez.",
    "en": "Confirm your e-mail address to finish registering."
  },
  {
    "key": "account.auth.loginMetaDescription",
    "group": "fiok",
    "hu": "Lépj be a(z) {store} fiókodba.",
    "en": "Sign in to your {store} account."
  },
  {
    "key": "account.menu.eyebrow",
    "group": "fiok",
    "hu": "Fiókom",
    "en": "My account"
  },
  {
    "key": "account.menu.navLabel",
    "group": "fiok",
    "hu": "Fiók",
    "en": "Account"
  },
  {
    "key": "account.menu.overview",
    "group": "fiok",
    "hu": "Áttekintés",
    "en": "Overview"
  },
  {
    "key": "account.menu.logout",
    "group": "fiok",
    "hu": "Kijelentkezés",
    "en": "Sign out"
  },
  {
    "key": "account.menu.profile",
    "group": "fiok",
    "hu": "Profil",
    "en": "Profile"
  },
  {
    "key": "account.menu.orders",
    "group": "fiok",
    "hu": "Rendeléseim",
    "en": "My orders"
  },
  {
    "key": "account.menu.addresses",
    "group": "fiok",
    "hu": "Címek",
    "en": "Addresses"
  },
  {
    "key": "account.menu.billing",
    "group": "fiok",
    "hu": "Számlázási adatok",
    "en": "Billing details"
  },
  {
    "key": "account.menu.billingShort",
    "group": "fiok",
    "hu": "Számlázás",
    "en": "Billing"
  },
  {
    "key": "account.menu.settings",
    "group": "fiok",
    "hu": "Beállítások",
    "en": "Settings"
  },
  {
    "key": "account.menu.ordersDescription",
    "group": "fiok",
    "hu": "Aktuális és korábbi rendeléseid egy helyen.",
    "en": "Your current and past orders in one place."
  },
  {
    "key": "account.orders.empty",
    "group": "fiok",
    "hu": "Még nincs rendelésed.",
    "en": "You have no orders yet."
  },
  {
    "key": "account.orders.shop",
    "group": "fiok",
    "hu": "Vásárlás",
    "en": "Shop"
  },
  {
    "key": "account.orders.previous",
    "group": "fiok",
    "hu": "Korábbi rendelések",
    "en": "Past orders"
  },
  {
    "key": "account.orders.details",
    "group": "fiok",
    "hu": "Rendelés részletei",
    "en": "Order details"
  },
  {
    "key": "account.orders.itemCount",
    "group": "fiok",
    "hu": "{count} tétel",
    "en": "{count} items"
  },
  {
    "key": "account.orders.view",
    "group": "fiok",
    "hu": "megtekintés",
    "en": "view"
  },
  {
    "key": "account.orders.pairLine",
    "group": "fiok",
    "hu": "Egy leadásból: {number}, {kind}",
    "en": "From one checkout: {number}, {kind}"
  },
  {
    "key": "account.orders.pairPickup",
    "group": "fiok",
    "hu": "bolti átvétel",
    "en": "in-store pickup"
  },
  {
    "key": "account.orders.pairDelivery",
    "group": "fiok",
    "hu": "kiszállítás",
    "en": "delivery"
  },
  {
    "key": "account.orders.metaTitle",
    "group": "fiok",
    "hu": "Rendeléseim",
    "en": "My orders"
  },
  {
    "key": "account.orders.metaDescription",
    "group": "fiok",
    "hu": "Aktuális és korábbi rendeléseid egy helyen.",
    "en": "Your current and past orders in one place."
  },
  {
    "key": "account.orders.transfer.heading",
    "group": "fiok",
    "hu": "Rendelés átvétele",
    "en": "Claim an order"
  },
  {
    "key": "account.orders.transfer.leadFirst",
    "group": "fiok",
    "hu": "Nem találod a keresett rendelést?",
    "en": "Cannot find the order you are looking for?"
  },
  {
    "key": "account.orders.transfer.leadSecond",
    "group": "fiok",
    "hu": "Kapcsold a rendelést a fiókodhoz.",
    "en": "Link the order to your account."
  },
  {
    "key": "account.orders.transfer.placeholder",
    "group": "fiok",
    "hu": "Rendelésazonosító",
    "en": "Order ID"
  },
  {
    "key": "account.orders.transfer.submit",
    "group": "fiok",
    "hu": "Átvétel kérése",
    "en": "Request the transfer"
  },
  {
    "key": "account.orders.transfer.requested",
    "group": "fiok",
    "hu": "A(z) {id} rendelés átvételét kérted",
    "en": "You asked to claim order {id}"
  },
  {
    "key": "account.orders.transfer.note",
    "group": "fiok",
    "hu": "A kérelmet rögzítettük. A jóváhagyó levél küldése még nincs bekötve, ezért az átvételhez kérjük, vedd fel velünk a kapcsolatot.",
    "en": "We have recorded your request. The confirmation e-mail is not set up yet, so please contact us to complete the transfer."
  },
  {
    "key": "account.orders.transfer.errorIdRequired",
    "group": "fiok",
    "hu": "Add meg a rendelés azonosítóját.",
    "en": "Enter the order ID."
  },
  {
    "key": "account.orders.transfer.errorGeneric",
    "group": "fiok",
    "hu": "Az átvételt most nem sikerült kérni. Próbáld újra, vagy írj nekünk.",
    "en": "We could not request the transfer right now. Try again, or write to us."
  },
  {
    "key": "account.orderStatus.pending_processing",
    "group": "fiok",
    "hu": "Feldolgozásra vár",
    "en": "Waiting to be processed"
  },
  {
    "key": "account.orderStatus.confirmed",
    "group": "fiok",
    "hu": "Visszaigazolva",
    "en": "Confirmed"
  },
  {
    "key": "account.orderStatus.stocking",
    "group": "fiok",
    "hu": "Készletezés alatt",
    "en": "Being stocked"
  },
  {
    "key": "account.orderStatus.out_for_delivery",
    "group": "fiok",
    "hu": "Kiszállítás",
    "en": "Out for delivery"
  },
  {
    "key": "account.orderStatus.ready_for_pickup",
    "group": "fiok",
    "hu": "Átvehető",
    "en": "Ready for pickup"
  },
  {
    "key": "account.orderStatus.closed",
    "group": "fiok",
    "hu": "Megrendelés lezárva",
    "en": "Order closed"
  },
  {
    "key": "account.orderStatus.closed_unsuccessfully",
    "group": "fiok",
    "hu": "Sikertelenül lezárt rendelés",
    "en": "Closed unsuccessfully"
  },
  {
    "key": "account.paymentStatus.not_paid",
    "group": "fiok",
    "hu": "fizetésre vár",
    "en": "awaiting payment"
  },
  {
    "key": "account.paymentStatus.awaiting",
    "group": "fiok",
    "hu": "fizetésre vár",
    "en": "awaiting payment"
  },
  {
    "key": "account.paymentStatus.authorized",
    "group": "fiok",
    "hu": "összeg zárolva a kártyán",
    "en": "amount held on your card"
  },
  {
    "key": "account.paymentStatus.partially_authorized",
    "group": "fiok",
    "hu": "összeg részben zárolva",
    "en": "amount partly held"
  },
  {
    "key": "account.paymentStatus.captured",
    "group": "fiok",
    "hu": "kifizetve",
    "en": "paid"
  },
  {
    "key": "account.paymentStatus.partially_captured",
    "group": "fiok",
    "hu": "részben kifizetve",
    "en": "partially paid"
  },
  {
    "key": "account.paymentStatus.partially_refunded",
    "group": "fiok",
    "hu": "részben visszatérítve",
    "en": "partially refunded"
  },
  {
    "key": "account.paymentStatus.refunded",
    "group": "fiok",
    "hu": "visszatérítve",
    "en": "refunded"
  },
  {
    "key": "account.paymentStatus.canceled",
    "group": "fiok",
    "hu": "fizetés törölve",
    "en": "payment canceled"
  },
  {
    "key": "account.paymentStatus.requires_action",
    "group": "fiok",
    "hu": "fizetési teendő",
    "en": "payment action needed"
  },
  {
    "key": "account.paymentStatus.awaitingRelease",
    "group": "fiok",
    "hu": "fizetés az áru megérkezése után",
    "en": "payment after the goods arrive"
  },
  {
    "key": "account.paymentStatus.onDelivery",
    "group": "fiok",
    "hu": "fizetés átvételkor",
    "en": "pay on delivery"
  },
  {
    "key": "account.paymentStatus.atStore",
    "group": "fiok",
    "hu": "fizetés a boltban, átvételkor",
    "en": "pay in store on pickup"
  },
  {
    "key": "account.orderDetails.back",
    "group": "fiok",
    "hu": "‹ Rendeléseim",
    "en": "‹ My orders"
  },
  {
    "key": "account.orderDetails.eyebrow",
    "group": "fiok",
    "hu": "Rendelésem",
    "en": "My order"
  },
  {
    "key": "account.orderDetails.payment",
    "group": "fiok",
    "hu": "Fizetés",
    "en": "Payment"
  },
  {
    "key": "account.orderDetails.fulfilment",
    "group": "fiok",
    "hu": "Teljesítés",
    "en": "Fulfilment"
  },
  {
    "key": "account.orderDetails.shipping",
    "group": "fiok",
    "hu": "Szállítás",
    "en": "Shipping"
  },
  {
    "key": "account.orderDetails.noShippingMethod",
    "group": "fiok",
    "hu": "Szállítási mód nincs megadva",
    "en": "No shipping method given"
  },
  {
    "key": "account.orderDetails.shippingAddress",
    "group": "fiok",
    "hu": "Szállítási cím: {address}",
    "en": "Shipping address: {address}"
  },
  {
    "key": "account.orderDetails.items",
    "group": "fiok",
    "hu": "Tételek",
    "en": "Items"
  },
  {
    "key": "account.orderDetails.itemQty",
    "group": "fiok",
    "hu": "{count} db",
    "en": "{count} pcs"
  },
  {
    "key": "account.orderDetails.summary",
    "group": "fiok",
    "hu": "Összesítés",
    "en": "Summary"
  },
  {
    "key": "account.orderDetails.billing",
    "group": "fiok",
    "hu": "Számlázás",
    "en": "Billing"
  },
  {
    "key": "account.orderDetails.question",
    "group": "fiok",
    "hu": "Kérdésed van a rendelésről?",
    "en": "Questions about the order?"
  },
  {
    "key": "account.orderDetails.questionText",
    "group": "fiok",
    "hu": "Írj nekünk a rendelési számmal:",
    "en": "Write to us with the order number:"
  },
  {
    "key": "account.orderDetails.questionButton",
    "group": "fiok",
    "hu": "Kérdés a rendeléssel kapcsolatban",
    "en": "Ask about this order"
  },
  {
    "key": "account.orderDetails.mailSubject",
    "group": "fiok",
    "hu": "Rendelés {number}",
    "en": "Order {number}"
  },
  {
    "key": "account.orderDetails.sumProducts",
    "group": "fiok",
    "hu": "Termékek",
    "en": "Products"
  },
  {
    "key": "account.orderDetails.sumFee",
    "group": "fiok",
    "hu": "Díj",
    "en": "Fee"
  },
  {
    "key": "account.orderDetails.sumShipping",
    "group": "fiok",
    "hu": "Szállítás",
    "en": "Shipping"
  },
  {
    "key": "account.orderDetails.totalPaid",
    "group": "fiok",
    "hu": "Fizetett összeg",
    "en": "Amount paid"
  },
  {
    "key": "account.orderDetails.total",
    "group": "fiok",
    "hu": "Végösszeg",
    "en": "Total"
  },
  {
    "key": "account.orderDetails.metaTitle",
    "group": "fiok",
    "hu": "Rendelés {number}",
    "en": "Order {number}"
  },
  {
    "key": "account.orderDetails.metaDescription",
    "group": "fiok",
    "hu": "A rendelésed részletei.",
    "en": "The details of your order."
  },
  {
    "key": "account.error.invalidCredentials",
    "group": "fiok",
    "hu": "Hibás e-mail-cím vagy jelszó.",
    "en": "Wrong e-mail address or password."
  },
  {
    "key": "account.error.tooManyAttempts",
    "group": "fiok",
    "hu": "Túl sok próbálkozás. Próbáld újra pár perc múlva.",
    "en": "Too many attempts. Try again in a few minutes."
  },
  {
    "key": "account.error.passwordShort",
    "group": "fiok",
    "hu": "A jelszó legalább {min} karakter legyen.",
    "en": "The password must be at least {min} characters long."
  },
  {
    "key": "account.error.emailTaken",
    "group": "fiok",
    "hu": "Ezzel az e-mail-címmel már van fiók. Jelentkezz be.",
    "en": "There is already an account with this e-mail address. Sign in."
  },
  {
    "key": "account.error.generic",
    "group": "fiok",
    "hu": "Nem sikerült, próbáld újra. Ha újra előjön, írj nekünk.",
    "en": "That did not work, try again. If it happens again, write to us."
  },
  {
    "key": "account.error.emailInvalid",
    "group": "fiok",
    "hu": "Adj meg érvényes e-mail-címet.",
    "en": "Enter a valid e-mail address."
  },
  {
    "key": "account.error.resetLinkInvalid",
    "group": "fiok",
    "hu": "Ez a link már nem érvényes (lejárt, vagy már felhasználták). Kérj újat az „Elfelejtett jelszó” oldalon.",
    "en": "This link is no longer valid (it has expired or was already used). Ask for a new one on the \"Forgot your password\" page."
  },
  {
    "key": "account.error.resetFieldsRequired",
    "group": "fiok",
    "hu": "Mindkét jelszó mezőt ki kell töltened.",
    "en": "You have to fill in both password fields."
  },
  {
    "key": "account.error.aszfRequired",
    "group": "fiok",
    "hu": "A regisztrációhoz el kell fogadnod az ÁSZF-et és az adatkezelési tájékoztatót.",
    "en": "To register you have to accept the terms and conditions and the privacy notice."
  },
  {
    "key": "account.error.passwordsDiffer",
    "group": "fiok",
    "hu": "A két jelszó nem egyezik.",
    "en": "The two passwords do not match."
  },
  {
    "key": "account.error.namesRequired",
    "group": "fiok",
    "hu": "A vezetéknév és a keresztnév kötelező.",
    "en": "The last name and the first name are required."
  },
  {
    "key": "account.error.allFieldsRequired",
    "group": "fiok",
    "hu": "Mindhárom mező kitöltése kötelező.",
    "en": "All three fields are required."
  },
  {
    "key": "account.error.newPasswordsDiffer",
    "group": "fiok",
    "hu": "A két új jelszó nem egyezik.",
    "en": "The two new passwords do not match."
  },
  {
    "key": "account.error.currentPasswordWrong",
    "group": "fiok",
    "hu": "A jelenlegi jelszó nem helyes.",
    "en": "The current password is not correct."
  },
  {
    "key": "account.error.billingAddressRequired",
    "group": "fiok",
    "hu": "Az irányítószám, a város és az utca kötelező.",
    "en": "The postal code, the city and the street are required."
  },
  {
    "key": "account.error.postcodeFourDigits",
    "group": "fiok",
    "hu": "Az irányítószám négy számjegy.",
    "en": "The postal code is four digits."
  },
  {
    "key": "account.error.companyRequired",
    "group": "fiok",
    "hu": "Céges számlához a cégnév kötelező.",
    "en": "A company invoice needs the company name."
  },
  {
    "key": "account.error.taxIdFormat",
    "group": "fiok",
    "hu": "Az adószámot 12345678-1-23 alakban add meg.",
    "en": "Enter the tax number in the form 12345678-1-23."
  },
  {
    "key": "account.error.taxIdInvalid",
    "group": "fiok",
    "hu": "Az adószám nem érvényes: az első nyolc számjegy ellenőrző számjegye nem stimmel.",
    "en": "The tax number is not valid: the check digit of its first eight digits does not match."
  },
  {
    "key": "account.error.addressIdRequired",
    "group": "fiok",
    "hu": "A cím azonosítója hiányzik.",
    "en": "The address ID is missing."
  },
  {
    "key": "account.profile.lastName",
    "group": "fiok",
    "hu": "Vezetéknév",
    "en": "Last name"
  },
  {
    "key": "account.profile.firstName",
    "group": "fiok",
    "hu": "Keresztnév",
    "en": "First name"
  },
  {
    "key": "account.profile.email",
    "group": "fiok",
    "hu": "E-mail",
    "en": "Email"
  },
  {
    "key": "account.profile.emailNote",
    "group": "fiok",
    "hu": "Az e-mail-cím itt nem módosítható.",
    "en": "The e-mail address cannot be changed here."
  },
  {
    "key": "account.profile.phone",
    "group": "fiok",
    "hu": "Telefonszám",
    "en": "Phone number"
  },
  {
    "key": "account.profile.save",
    "group": "fiok",
    "hu": "Mentés",
    "en": "Save"
  },
  {
    "key": "account.profile.saved",
    "group": "fiok",
    "hu": "Mentve.",
    "en": "Saved."
  },
  {
    "key": "account.profile.metaTitle",
    "group": "fiok",
    "hu": "Profil",
    "en": "Profile"
  },
  {
    "key": "account.profile.metaDescription",
    "group": "fiok",
    "hu": "A(z) {store} profilod: név, e-mail-cím, telefonszám.",
    "en": "Your {store} profile: name, e-mail address, phone number."
  },
  {
    "key": "account.password.heading",
    "group": "fiok",
    "hu": "Jelszó módosítása",
    "en": "Change your password"
  },
  {
    "key": "account.password.current",
    "group": "fiok",
    "hu": "Jelenlegi jelszó",
    "en": "Current password"
  },
  {
    "key": "account.password.next",
    "group": "fiok",
    "hu": "Új jelszó",
    "en": "New password"
  },
  {
    "key": "account.password.nextAgain",
    "group": "fiok",
    "hu": "Új jelszó újra",
    "en": "New password again"
  },
  {
    "key": "account.password.save",
    "group": "fiok",
    "hu": "Jelszó mentése",
    "en": "Save password"
  },
  {
    "key": "account.password.saved",
    "group": "fiok",
    "hu": "A jelszó megváltozott.",
    "en": "Your password has changed."
  },
  {
    "key": "account.password.metaTitle",
    "group": "fiok",
    "hu": "Beállítások",
    "en": "Settings"
  },
  {
    "key": "account.password.metaDescription",
    "group": "fiok",
    "hu": "A fiók jelszavának módosítása.",
    "en": "Change your account password."
  },
  {
    "key": "account.billing.typeLabel",
    "group": "fiok",
    "hu": "Számlázás típusa",
    "en": "Billing type"
  },
  {
    "key": "account.billing.private",
    "group": "fiok",
    "hu": "Magánszemély",
    "en": "Private person"
  },
  {
    "key": "account.billing.company",
    "group": "fiok",
    "hu": "Cég",
    "en": "Company"
  },
  {
    "key": "account.billing.companyName",
    "group": "fiok",
    "hu": "Cégnév",
    "en": "Company name"
  },
  {
    "key": "account.billing.taxId",
    "group": "fiok",
    "hu": "Adószám",
    "en": "Tax number"
  },
  {
    "key": "account.billing.postalCode",
    "group": "fiok",
    "hu": "Irányítószám",
    "en": "Postal code"
  },
  {
    "key": "account.billing.city",
    "group": "fiok",
    "hu": "Város",
    "en": "City"
  },
  {
    "key": "account.billing.street",
    "group": "fiok",
    "hu": "Utca, házszám",
    "en": "Street, house number"
  },
  {
    "key": "account.billing.save",
    "group": "fiok",
    "hu": "Mentés",
    "en": "Save"
  },
  {
    "key": "account.billing.saved",
    "group": "fiok",
    "hu": "Mentve.",
    "en": "Saved."
  },
  {
    "key": "account.billing.metaTitle",
    "group": "fiok",
    "hu": "Számlázási adatok",
    "en": "Billing details"
  },
  {
    "key": "account.billing.metaDescription",
    "group": "fiok",
    "hu": "A számlázáshoz használt név, cím és adószám.",
    "en": "The name, address and tax number used for invoices."
  },
  {
    "key": "account.addresses.heading",
    "group": "fiok",
    "hu": "Mentett szállítási címek",
    "en": "Saved delivery addresses"
  },
  {
    "key": "account.addresses.empty",
    "group": "fiok",
    "hu": "Még nincs mentett címed.",
    "en": "You have no saved address yet."
  },
  {
    "key": "account.addresses.newAddress",
    "group": "fiok",
    "hu": "Új cím",
    "en": "New address"
  },
  {
    "key": "account.addresses.addTitle",
    "group": "fiok",
    "hu": "Cím hozzáadása",
    "en": "Add an address"
  },
  {
    "key": "account.addresses.editTitle",
    "group": "fiok",
    "hu": "Cím szerkesztése",
    "en": "Edit the address"
  },
  {
    "key": "account.addresses.fallbackName",
    "group": "fiok",
    "hu": "Cím",
    "en": "Address"
  },
  {
    "key": "account.addresses.defaultBadge",
    "group": "fiok",
    "hu": "Alapértelmezett",
    "en": "Default"
  },
  {
    "key": "account.addresses.edit",
    "group": "fiok",
    "hu": "Szerkesztés",
    "en": "Edit"
  },
  {
    "key": "account.addresses.delete",
    "group": "fiok",
    "hu": "Törlés",
    "en": "Delete"
  },
  {
    "key": "account.addresses.cancel",
    "group": "fiok",
    "hu": "Mégse",
    "en": "Cancel"
  },
  {
    "key": "account.addresses.save",
    "group": "fiok",
    "hu": "Mentés",
    "en": "Save"
  },
  {
    "key": "account.addresses.nameField",
    "group": "fiok",
    "hu": "A cím neve (pl. Otthon)",
    "en": "Name of the address (e.g. Home)"
  },
  {
    "key": "account.addresses.defaultShipping",
    "group": "fiok",
    "hu": "Alapértelmezett szállítási cím",
    "en": "Default delivery address"
  },
  {
    "key": "account.addresses.firstName",
    "group": "fiok",
    "hu": "Keresztnév",
    "en": "First name"
  },
  {
    "key": "account.addresses.lastName",
    "group": "fiok",
    "hu": "Vezetéknév",
    "en": "Last name"
  },
  {
    "key": "account.addresses.company",
    "group": "fiok",
    "hu": "Cégnév",
    "en": "Company name"
  },
  {
    "key": "account.addresses.address1",
    "group": "fiok",
    "hu": "Cím",
    "en": "Address"
  },
  {
    "key": "account.addresses.address2",
    "group": "fiok",
    "hu": "Emelet, ajtó stb.",
    "en": "Floor, door, etc."
  },
  {
    "key": "account.addresses.postalCode",
    "group": "fiok",
    "hu": "Irányítószám",
    "en": "Postal code"
  },
  {
    "key": "account.addresses.city",
    "group": "fiok",
    "hu": "Város",
    "en": "City"
  },
  {
    "key": "account.addresses.state",
    "group": "fiok",
    "hu": "Megye / állam",
    "en": "County / state"
  },
  {
    "key": "account.addresses.country",
    "group": "fiok",
    "hu": "Ország",
    "en": "Country"
  },
  {
    "key": "account.addresses.phone",
    "group": "fiok",
    "hu": "Telefonszám",
    "en": "Phone number"
  },
  {
    "key": "account.addresses.metaTitle",
    "group": "fiok",
    "hu": "Címek",
    "en": "Addresses"
  },
  {
    "key": "account.addresses.metaDescription",
    "group": "fiok",
    "hu": "A mentett szállítási címeid.",
    "en": "Your saved delivery addresses."
  },
  {
    "key": "cookieConsent.title",
    "group": "suti",
    "hu": "Sütik",
    "en": "Cookies"
  },
  {
    "key": "cookieConsent.text",
    "group": "suti",
    "hu": "A bolt működéséhez szükséges sütiket mindig használjuk. Statisztikai és marketing sütit csak a hozzájárulásoddal teszünk, és ezt bármikor visszavonhatod a lap alján, a Sütibeállítások gombbal.",
    "en": "We always use the cookies the shop needs to work. Statistics and marketing cookies are only set with your consent, which you can withdraw at any time with the Cookie settings button at the bottom of the page."
  },
  {
    "key": "cookieConsent.privacyLink",
    "group": "suti",
    "hu": "Adatkezelési tájékoztató",
    "en": "Privacy policy"
  },
  {
    "key": "cookieConsent.cookieLink",
    "group": "suti",
    "hu": "Süti tájékoztató",
    "en": "Cookie policy"
  },
  {
    "key": "cookieConsent.acceptAll",
    "group": "suti",
    "hu": "Mindet elfogadom",
    "en": "Accept all"
  },
  {
    "key": "cookieConsent.necessaryOnly",
    "group": "suti",
    "hu": "Csak a szükségesek",
    "en": "Necessary only"
  },
  {
    "key": "cookieConsent.settings",
    "group": "suti",
    "hu": "Beállítások",
    "en": "Settings"
  },
  {
    "key": "cookieConsent.save",
    "group": "suti",
    "hu": "Kiválasztottak mentése",
    "en": "Save selection"
  },
  {
    "key": "cookieConsent.necessary",
    "group": "suti",
    "hu": "Szükséges",
    "en": "Necessary"
  },
  {
    "key": "cookieConsent.necessaryText",
    "group": "suti",
    "hu": "A kosár, a belépés és a biztonság sütijei. Nélkülük a bolt nem működik, ezért nem kapcsolhatók ki.",
    "en": "Cookies for the cart, sign-in and security. The shop does not work without them, so they cannot be turned off."
  },
  {
    "key": "cookieConsent.statistics",
    "group": "suti",
    "hu": "Statisztika",
    "en": "Statistics"
  },
  {
    "key": "cookieConsent.statisticsText",
    "group": "suti",
    "hu": "Névtelen látogatottsági adatok, hogy lássuk, mi működik jól a boltban.",
    "en": "Anonymous visit data, so we can see what works well in the shop."
  },
  {
    "key": "cookieConsent.marketing",
    "group": "suti",
    "hu": "Marketingcélú",
    "en": "Marketing"
  },
  {
    "key": "cookieConsent.marketingText",
    "group": "suti",
    "hu": "Hirdetések mérése és személyre szabása más oldalakon.",
    "en": "Measuring and personalising ads on other sites."
  },
  {
    "key": "cookieConsent.footerButton",
    "group": "suti",
    "hu": "Sütibeállítások",
    "en": "Cookie settings"
  },
  {
    "key": "newsletter.title",
    "group": "hirlevel",
    "hu": "Hírlevél",
    "en": "Newsletter"
  },
  {
    "key": "newsletter.text",
    "group": "hirlevel",
    "hu": "Iratkozz fel a hírlevelünkre és értesülj elsőként az újdonságokról, akciókról, ajánlatokról!",
    "en": "Subscribe to our newsletter and be the first to hear about news, sales and offers!"
  },
  {
    "key": "newsletter.consent",
    "group": "hirlevel",
    "hu": "Hozzájárulok az adataim kezeléséhez és elfogadom az Adatkezelési tájékoztatót.",
    "en": "I agree to the processing of my data and accept the Privacy notice."
  },
  {
    "key": "newsletter.button",
    "group": "hirlevel",
    "hu": "Feliratkozás",
    "en": "Subscribe"
  },
  {
    "key": "newsletter.policyLink",
    "group": "hirlevel",
    "hu": "Adatkezelési tájékoztató",
    "en": "Privacy notice"
  },
  {
    "key": "newsletter.consentLinkPattern",
    "group": "hirlevel",
    "hu": "adatkezelési tájékoztató[a-záéíóöőúüű]*",
    "en": "privacy notice"
  },
  {
    "key": "newsletter.name",
    "group": "hirlevel",
    "hu": "Név",
    "en": "Name"
  },
  {
    "key": "newsletter.email",
    "group": "hirlevel",
    "hu": "E-mail",
    "en": "Email"
  },
  {
    "key": "newsletter.done",
    "group": "hirlevel",
    "hu": "Köszönjük! A feliratkozás a megadott címre érkező levél linkjével erősíthető meg.",
    "en": "Thank you! Confirm your subscription with the link in the mail that comes to the address you gave."
  },
  {
    "key": "newsletter.errorMissing",
    "group": "hirlevel",
    "hu": "Add meg a neved és az e-mail-címed.",
    "en": "Please enter your name and your email address."
  },
  {
    "key": "newsletter.errorEmail",
    "group": "hirlevel",
    "hu": "Az e-mail-cím formája nem jó.",
    "en": "That email address does not look right."
  },
  {
    "key": "newsletter.errorConsent",
    "group": "hirlevel",
    "hu": "A feliratkozáshoz el kell fogadnod az adatkezelést.",
    "en": "To subscribe you need to accept the data processing."
  },
  {
    "key": "newsletter.errorLimit",
    "group": "hirlevel",
    "hu": "Túl sok feliratkozás érkezett innen. Próbáld újra pár perc múlva.",
    "en": "Too many subscriptions came from here. Please try again in a few minutes."
  },
  {
    "key": "newsletter.errorOff",
    "group": "hirlevel",
    "hu": "A hírlevél-feliratkozás most nem elérhető.",
    "en": "Newsletter subscription is not available right now."
  },
  {
    "key": "newsletter.errorFailed",
    "group": "hirlevel",
    "hu": "A feliratkozás most nem sikerült. Próbáld újra később.",
    "en": "The subscription did not work. Please try again later."
  },
  {
    "key": "newsletterLink.confirmTitle",
    "group": "hirlevel",
    "hu": "Hírlevél-feliratkozás megerősítése",
    "en": "Confirm your newsletter subscription"
  },
  {
    "key": "newsletterLink.confirmIntro",
    "group": "hirlevel",
    "hu": "Egy kattintás, és a feliratkozásod él.",
    "en": "One click, and your subscription starts."
  },
  {
    "key": "newsletterLink.confirmButton",
    "group": "hirlevel",
    "hu": "Megerősítem a feliratkozást",
    "en": "Confirm my subscription"
  },
  {
    "key": "newsletterLink.confirmed",
    "group": "hirlevel",
    "hu": "Köszönjük, a feliratkozásod megerősítve.",
    "en": "Thank you, your subscription is confirmed."
  },
  {
    "key": "newsletterLink.expired",
    "group": "hirlevel",
    "hu": "Ez a link már lejárt. Iratkozz fel újra a lap alján, és küldünk egy újat.",
    "en": "This link has expired. Subscribe again at the bottom of the page, and we will send a new one."
  },
  {
    "key": "newsletterLink.leaveTitle",
    "group": "hirlevel",
    "hu": "Leiratkozás a hírlevélről",
    "en": "Unsubscribe from the newsletter"
  },
  {
    "key": "newsletterLink.leaveIntro",
    "group": "hirlevel",
    "hu": "Egy kattintás, és több hírlevelet nem küldünk erre a címre.",
    "en": "One click, and we send no more newsletters to this address."
  },
  {
    "key": "newsletterLink.leaveButton",
    "group": "hirlevel",
    "hu": "Leiratkozom",
    "en": "Unsubscribe"
  },
  {
    "key": "newsletterLink.left",
    "group": "hirlevel",
    "hu": "Leiratkoztál, több hírlevelet nem küldünk erre a címre.",
    "en": "You have unsubscribed; we send no more newsletters to this address."
  },
  {
    "key": "newsletterLink.invalid",
    "group": "hirlevel",
    "hu": "Ez a link nem érvényes. Ha már használtad, nincs további teendőd.",
    "en": "This link is not valid. If you have already used it, there is nothing more to do."
  },
  {
    "key": "newsletterLink.limit",
    "group": "hirlevel",
    "hu": "Most túl sok kérés érkezett. Próbáld újra pár perc múlva.",
    "en": "Too many requests right now. Please try again in a few minutes."
  },
  {
    "key": "newsletterLink.failed",
    "group": "hirlevel",
    "hu": "Ez most nem sikerült. Próbáld újra később.",
    "en": "That did not work. Please try again later."
  },
  {
    "key": "stockAlert.title",
    "group": "hirlevel",
    "hu": "Szólj, ha jön hasonló",
    "en": "Tell me when a similar one arrives"
  },
  {
    "key": "stockAlert.text",
    "group": "hirlevel",
    "hu": "Add meg az e-mail címedet, és értesítünk, amikor ilyen fajt újra kapunk.",
    "en": "Leave your e-mail address and we will let you know when this species is in stock again."
  },
  {
    "key": "stockAlert.email",
    "group": "hirlevel",
    "hu": "E-mail cím",
    "en": "E-mail address"
  },
  {
    "key": "stockAlert.consent",
    "group": "hirlevel",
    "hu": "Hozzájárulok, hogy erre a címre értesítést küldjetek erről a fajról.",
    "en": "I agree to be notified at this address about this species."
  },
  {
    "key": "stockAlert.policyLink",
    "group": "hirlevel",
    "hu": "Adatkezelési tájékoztató",
    "en": "Privacy notice"
  },
  {
    "key": "stockAlert.button",
    "group": "hirlevel",
    "hu": "Értesítést kérek",
    "en": "Notify me"
  },
  {
    "key": "stockAlert.done",
    "group": "hirlevel",
    "hu": "Köszönjük! A megadott címre érkező levél linkjével erősítsd meg, és szólunk, ha ilyen fajt újra kapunk.",
    "en": "Thank you! Confirm it with the link in the mail arriving at this address, and we will tell you when this species is back."
  },
  {
    "key": "stockAlert.productTitle",
    "group": "hirlevel",
    "hu": "Értesíts, ha megérkezik",
    "en": "Tell me when it arrives"
  },
  {
    "key": "stockAlert.productText",
    "group": "hirlevel",
    "hu": "Add meg az e-mail címedet, és értesítünk, amikor ez a termék megérkezik.",
    "en": "Leave your e-mail address and we will let you know when this product arrives."
  },
  {
    "key": "stockAlert.productConsent",
    "group": "hirlevel",
    "hu": "Hozzájárulok, hogy erre a címre értesítést küldjetek erről a termékről.",
    "en": "I agree to be notified at this address about this product."
  },
  {
    "key": "stockAlert.productDone",
    "group": "hirlevel",
    "hu": "Köszönjük! A megadott címre érkező levél linkjével erősítsd meg, és szólunk, ha ez a termék megérkezik.",
    "en": "Thank you! Confirm it with the link in the mail arriving at this address, and we will tell you when this product arrives."
  },
  {
    "key": "stockAlert.errorEmail",
    "group": "hirlevel",
    "hu": "Ellenőrizd az e-mail címet, valami hiányzik belőle.",
    "en": "Check the e-mail address, something is missing from it."
  },
  {
    "key": "stockAlert.errorConsent",
    "group": "hirlevel",
    "hu": "Az értesítéshez a hozzájárulás szükséges.",
    "en": "The notification needs your consent."
  },
  {
    "key": "stockAlert.errorLimit",
    "group": "hirlevel",
    "hu": "Túl sok kérés érkezett innen. Próbáld újra pár perc múlva.",
    "en": "Too many requests came from here. Please try again in a few minutes."
  },
  {
    "key": "stockAlert.errorOff",
    "group": "hirlevel",
    "hu": "Az értesítés-kérés most nem elérhető.",
    "en": "Notifications are not available right now."
  },
  {
    "key": "stockAlert.errorFailed",
    "group": "hirlevel",
    "hu": "Az értesítés-kérés most nem sikerült. Próbáld újra később.",
    "en": "The request did not work. Please try again later."
  },
  {
    "key": "livestockArrival.title",
    "group": "hirlevel",
    "hu": "Érkezik",
    "en": "Arriving"
  },
  {
    "key": "livestockArrival.expected",
    "group": "hirlevel",
    "hu": "Várható érkezés: {date}",
    "en": "Expected: {date}"
  },
  {
    "key": "livestockArrival.ordered",
    "group": "hirlevel",
    "hu": "Megrendelve",
    "en": "Ordered"
  },
  {
    "key": "livestockArrival.inTransit",
    "group": "hirlevel",
    "hu": "Úton van",
    "en": "On its way"
  },
  {
    "key": "livestockArrival.late",
    "group": "hirlevel",
    "hu": "Az érkezés késik, új időpontot még nem tudunk mondani.",
    "en": "The arrival is delayed, and we cannot give a new date yet."
  },
  {
    "key": "livestockArrival.expectedOrderable",
    "group": "hirlevel",
    "hu": "Rendelhető, várható érkezés: {date}",
    "en": "Available to order, expected: {date}"
  },
  {
    "key": "livestockArrival.lateOrderable",
    "group": "hirlevel",
    "hu": "Rendelhető, de az érkezés késik, új időpontot még nem tudunk mondani.",
    "en": "Available to order, but the arrival is delayed, and we cannot give a new date yet."
  },
  {
    "key": "stockAlertLink.confirmTitle",
    "group": "hirlevel",
    "hu": "Értesítés-kérés megerősítése",
    "en": "Confirm your notification request"
  },
  {
    "key": "stockAlertLink.confirmIntro",
    "group": "hirlevel",
    "hu": "Egy kattintás, és szólunk, ha ilyen fajt újra kapunk.",
    "en": "One click, and we will tell you when this species is back."
  },
  {
    "key": "stockAlertLink.confirmButton",
    "group": "hirlevel",
    "hu": "Megerősítem az értesítés-kérést",
    "en": "Confirm the request"
  },
  {
    "key": "stockAlertLink.confirmed",
    "group": "hirlevel",
    "hu": "Köszönjük, az értesítés-kérésed megerősítve.",
    "en": "Thank you, your notification request is confirmed."
  },
  {
    "key": "stockAlertLink.expired",
    "group": "hirlevel",
    "hu": "Ez a link már lejárt. Kérj újra értesítést a termék lapján, és küldünk egy újat.",
    "en": "This link has expired. Ask again on the product page, and we will send a new one."
  },
  {
    "key": "stockAlertLink.leaveTitle",
    "group": "hirlevel",
    "hu": "Leiratkozás az értesítésről",
    "en": "Stop the notification"
  },
  {
    "key": "stockAlertLink.leaveIntro",
    "group": "hirlevel",
    "hu": "Egy kattintás, és erről több értesítést nem küldünk erre a címre.",
    "en": "One click, and we will send no more notifications about this to this address."
  },
  {
    "key": "stockAlertLink.leaveButton",
    "group": "hirlevel",
    "hu": "Leiratkozom",
    "en": "Unsubscribe"
  },
  {
    "key": "stockAlertLink.left",
    "group": "hirlevel",
    "hu": "Leiratkoztál, erről több értesítést nem küldünk erre a címre.",
    "en": "Done: no more notifications about this to this address."
  },
  {
    "key": "stockAlertLink.invalid",
    "group": "hirlevel",
    "hu": "Ez a link nem érvényes. Ha már használtad, nincs további teendőd.",
    "en": "This link is not valid. If you have used it already, there is nothing more to do."
  },
  {
    "key": "stockAlertLink.limit",
    "group": "hirlevel",
    "hu": "Most túl sok kérés érkezett. Próbáld újra pár perc múlva.",
    "en": "Too many requests right now. Please try again in a few minutes."
  },
  {
    "key": "stockAlertLink.failed",
    "group": "hirlevel",
    "hu": "Ez most nem sikerült. Próbáld újra később.",
    "en": "That did not work. Please try again later."
  },
  {
    "key": "cartPage.holdMine",
    "group": "penztar",
    "hu": "{title}: ezt a darabot {ido}-ig neked tartjuk.",
    "en": "{title}: we keep this piece for you until {ido}."
  },
  {
    "key": "cartPage.holdEnded",
    "group": "penztar",
    "hu": "{title}: a foglalás lejárt; ha még szabad, a rendeléskor a tiéd.",
    "en": "{title}: the hold has ended; if the piece is still free, it is yours when you order."
  },
  {
    "key": "cartPage.soldTitle",
    "group": "penztar",
    "hu": "Ez a darab közben elkelt",
    "en": "This piece has just been sold"
  },
  {
    "key": "cartPage.soldText",
    "group": "penztar",
    "hu": "Sajnáljuk, {name} közben elkelt, mielőtt befejezted volna a rendelést. Egyedi darabról van szó, ezért nem tudjuk újra kínálni.",
    "en": "We are sorry, {name} was sold before you finished your order. It is a unique piece, so we cannot offer it again."
  },
  {
    "key": "cartPage.soldSimilar",
    "group": "penztar",
    "hu": "Hasonló, most kapható darabok:",
    "en": "Similar pieces available now:"
  },
  {
    "key": "cartPage.soldNone",
    "group": "penztar",
    "hu": "Most nincs kapható hasonló darabunk.",
    "en": "We have no similar piece available right now."
  },
  {
    "key": "cartPage.soldRemove",
    "group": "penztar",
    "hu": "Kiveszem a kosárból",
    "en": "Remove from my cart"
  },
  {
    "key": "cartPage.soldOthersKept",
    "group": "penztar",
    "hu": "A kosarad többi tétele megmaradt.",
    "en": "The other items in your cart are still there."
  },
  {
    "key": "cartPage.title",
    "group": "penztar",
    "hu": "Kosár",
    "en": "Cart"
  },
  {
    "key": "cartPage.metaDescription",
    "group": "penztar",
    "hu": "A kosarad tartalma.",
    "en": "The contents of your cart."
  },
  {
    "key": "cartPage.itemCount",
    "group": "penztar",
    "hu": "{count} tétel",
    "en": "{count} items"
  },
  {
    "key": "cartPage.itemCountOne",
    "group": "penztar",
    "hu": "{count} tétel",
    "en": "{count} item"
  },
  {
    "key": "cartPage.colProduct",
    "group": "penztar",
    "hu": "Termék",
    "en": "Product"
  },
  {
    "key": "cartPage.colName",
    "group": "penztar",
    "hu": "Megnevezés",
    "en": "Name"
  },
  {
    "key": "cartPage.colQuantity",
    "group": "penztar",
    "hu": "Mennyiség",
    "en": "Quantity"
  },
  {
    "key": "cartPage.colUnitPrice",
    "group": "penztar",
    "hu": "Egységár",
    "en": "Unit price"
  },
  {
    "key": "cartPage.colLineTotal",
    "group": "penztar",
    "hu": "Sorösszeg",
    "en": "Line total"
  },
  {
    "key": "cartPage.quantityLabel",
    "group": "penztar",
    "hu": "Mennyiség",
    "en": "Quantity"
  },
  {
    "key": "cartPage.deleteLine",
    "group": "penztar",
    "hu": "Tétel törlése",
    "en": "Remove item"
  },
  {
    "key": "cartPage.continueShopping",
    "group": "penztar",
    "hu": "Vásárlás folytatása",
    "en": "Continue shopping"
  },
  {
    "key": "cartPage.vatNote",
    "group": "penztar",
    "hu": "Az árak bruttó árak, 27% áfával.",
    "en": "Prices include 27% VAT."
  },
  {
    "key": "cartPage.stepsLabel",
    "group": "penztar",
    "hu": "Lépések",
    "en": "Steps"
  },
  {
    "key": "cartPage.stepCart",
    "group": "penztar",
    "hu": "Kosár",
    "en": "Cart"
  },
  {
    "key": "cartPage.stepDetails",
    "group": "penztar",
    "hu": "Adatok",
    "en": "Details"
  },
  {
    "key": "cartPage.stepPayment",
    "group": "penztar",
    "hu": "Fizetés",
    "en": "Payment"
  },
  {
    "key": "cartPage.stepOf",
    "group": "penztar",
    "hu": "{current} / {total} · {name}",
    "en": "Step {current} of {total} · {name}"
  },
  {
    "key": "cartPage.summaryHeading",
    "group": "penztar",
    "hu": "Összegzés",
    "en": "Summary"
  },
  {
    "key": "cartPage.toCheckout",
    "group": "penztar",
    "hu": "Tovább a fizetéshez",
    "en": "Continue to payment"
  },
  {
    "key": "cartPage.subtotal",
    "group": "penztar",
    "hu": "Részösszeg",
    "en": "Subtotal"
  },
  {
    "key": "cartPage.shipping",
    "group": "penztar",
    "hu": "Szállítás",
    "en": "Shipping"
  },
  {
    "key": "cartPage.discount",
    "group": "penztar",
    "hu": "Kedvezmény",
    "en": "Discount"
  },
  {
    "key": "cartPage.vat",
    "group": "penztar",
    "hu": "Ebből áfa",
    "en": "VAT included"
  },
  {
    "key": "cartPage.payable",
    "group": "penztar",
    "hu": "Fizetendő",
    "en": "Total to pay"
  },
  {
    "key": "cartPage.signInHeading",
    "group": "penztar",
    "hu": "Van már fiókod?",
    "en": "Already have an account?"
  },
  {
    "key": "cartPage.signInText",
    "group": "penztar",
    "hu": "Jelentkezz be, és gyorsabban végzel.",
    "en": "Sign in and finish faster."
  },
  {
    "key": "cartPage.signInButton",
    "group": "penztar",
    "hu": "Bejelentkezés",
    "en": "Sign in"
  },
  {
    "key": "cartPage.atvetelTitle",
    "group": "penztar",
    "hu": "Átvétel",
    "en": "Receiving the order"
  },
  {
    "key": "cartPage.atvetelArCimUtan",
    "group": "penztar",
    "hu": "Az ár a cím megadása után látszik",
    "en": "The price shows once you enter the address"
  },
  {
    "key": "cartPage.atvetelLabjegyzet",
    "group": "penztar",
    "hu": "Az átvétel módját a pénztárban választod ki, ott adod meg a címet.",
    "en": "You choose how to receive the order in the checkout, where you enter the address."
  },
  {
    "key": "cartPage.atvetelFutarResz",
    "group": "penztar",
    "hu": "A futár-módok csak a kiszállítandó rendelésre vonatkoznak; az élő állatot a boltban veszed át.",
    "en": "The courier options apply only to the order that is delivered; you collect the live animal in the shop."
  },
  {
    "key": "cartPage.fizetesTitle",
    "group": "penztar",
    "hu": "Fizetés",
    "en": "Payment"
  },
  {
    "key": "cartPage.fizetesSzoveg",
    "group": "penztar",
    "hu": "A fizetési módot a pénztárban választod ki. Hogy mi választható, az attól függ, hogyan veszed át a rendelést.",
    "en": "You choose the payment method in the checkout. What is offered depends on how you receive the order."
  },
  {
    "key": "cartPage.pickupTitle",
    "group": "penztar",
    "hu": "Élő állat a kosárban",
    "en": "Live animal in the cart"
  },
  {
    "key": "cartPage.pickupLead",
    "group": "penztar",
    "hu": "Ezt a rendelést a boltban adjuk át.",
    "en": "We hand this order over in the shop."
  },
  {
    "key": "cartPage.pickupReason",
    "group": "penztar",
    "hu": "Egy élő példányt nem adunk fel csomagként, ezért ezt a rendelést a boltban veszed át.",
    "en": "We do not ship a live animal as a parcel, so you collect this order in the shop."
  },
  {
    "key": "cartPage.pickupLine",
    "group": "penztar",
    "hu": "{name} · élő állat, csak boltban adjuk át",
    "en": "{name} · live animal, handed over in the shop only"
  },
  {
    "key": "cartPage.shopHours",
    "group": "penztar",
    "hu": "Kedd–Péntek 10–18, Szombat 10–14",
    "en": "Tue–Fri 10–18, Sat 10–14"
  },
  {
    "key": "cartPage.holdPromise",
    "group": "penztar",
    "hu": "Az élő példányt 5 munkanapig tartjuk fenn.",
    "en": "We hold the live animal for you for 5 working days."
  },
  {
    "key": "cartPage.splitTitle",
    "group": "penztar",
    "hu": "Két rendelés lesz belőle",
    "en": "It becomes two orders"
  },
  {
    "key": "cartPage.splitLead",
    "group": "penztar",
    "hu": "Az élő állat miatt két rendelésed keletkezik.",
    "en": "Because of the live animal, you get two orders."
  },
  {
    "key": "cartPage.splitReason",
    "group": "penztar",
    "hu": "Egyszerre adod le, de két rendelés lesz belőle: az élő állatos rendelés és a kiszállítandó. A fiókodban mindkettőt látod.",
    "en": "You place it at once, but it becomes two orders: the live-animal one and the one we ship. You see both in your account."
  },
  {
    "key": "cartPage.splitPickup",
    "group": "penztar",
    "hu": "Az élő állatot a boltban veszed át.",
    "en": "You collect the live animal in the shop."
  },
  {
    "key": "cartPage.splitLine",
    "group": "penztar",
    "hu": "{name} · a boltban veszed át",
    "en": "{name} · you collect it in the shop"
  },
  {
    "key": "cartPage.splitPayCard",
    "group": "penztar",
    "hu": "Kártyás fizetésnél a két rendelést egy fizetéssel rendezed.",
    "en": "When you pay by card, you settle the two orders in one payment."
  },
  {
    "key": "cartPage.splitPayCod",
    "group": "penztar",
    "hu": "Utánvétnél a kiszállított rendelést a csomag átvételekor fizeted, az élő állatot a boltban.",
    "en": "With cash on delivery you pay the shipped order when the parcel arrives, and the live animal in the shop."
  },
  {
    "key": "cartPage.splitPayNone",
    "group": "penztar",
    "hu": "Kártyával a két rendelést egy fizetéssel rendezed; utánvétnél a kiszállított rendelést átvételkor, az élő állatot a boltban fizeted.",
    "en": "By card you settle the two orders in one payment; with cash on delivery you pay the shipped order on arrival, and the live animal in the shop."
  },
  {
    "key": "cartPage.lineUnique",
    "group": "penztar",
    "hu": "1 db · Egyedi",
    "en": "1 pc · One of a kind"
  },
  {
    "key": "cartPage.lineSold",
    "group": "penztar",
    "hu": "Elkelt",
    "en": "Sold"
  },
  {
    "key": "cartPage.lineNotIncrementable",
    "group": "penztar",
    "hu": "Nem növelhető",
    "en": "Cannot be increased"
  },
  {
    "key": "cartPage.lineUniquePromise",
    "group": "penztar",
    "hu": "A fotón pontosan ezt a példányt látod: ez kerül a kosaradba",
    "en": "You see exactly this piece in the photo: this is the one that goes into your cart"
  },
  {
    "key": "cartPage.lineSimilar",
    "group": "penztar",
    "hu": "Hasonló példányok",
    "en": "Similar pieces"
  },
  {
    "key": "cartPage.emptyLabel",
    "group": "penztar",
    "hu": "Üres kosár",
    "en": "Empty cart"
  },
  {
    "key": "cartPage.emptyHeading",
    "group": "penztar",
    "hu": "A kosár még üres",
    "en": "Your cart is empty"
  },
  {
    "key": "cartPage.emptyLead",
    "group": "penztar",
    "hu": "Kezdd ott, ahol a legtöbben: a heti új korallpéldányoknál, vagy a technikánál, ha most építesz.",
    "en": "Start where most people do: this week's new coral pieces, or the equipment if you are building a tank."
  },
  {
    "key": "cartPage.emptyOfferWysiwyg",
    "group": "penztar",
    "hu": "E heti WYSIWYG korallok",
    "en": "This week's WYSIWYG corals"
  },
  {
    "key": "cartPage.emptyOfferWysiwygText",
    "group": "penztar",
    "hu": "Egyedi példányok, saját fotóval · szerdán frissül",
    "en": "One-of-a-kind pieces with their own photo · updated on Wednesdays"
  },
  {
    "key": "cartPage.emptyOfferTech",
    "group": "penztar",
    "hu": "Technika",
    "en": "Equipment"
  },
  {
    "key": "cartPage.emptyOfferTechText",
    "group": "penztar",
    "hu": "Lámpa, szivattyú, lehabzó, méretezés-segéddel",
    "en": "Lights, pumps, skimmers, with a sizing guide"
  },
  {
    "key": "cartPage.emptyOfferConsumables",
    "group": "penztar",
    "hu": "Só, teszt, tápszer",
    "en": "Salt, tests, food"
  },
  {
    "key": "cartPage.emptyOfferConsumablesText",
    "group": "penztar",
    "hu": "Amit havonta újra kell venni",
    "en": "What you have to buy again every month"
  },
  {
    "key": "cartPage.emptyOfferCta",
    "group": "penztar",
    "hu": "Megnézem →",
    "en": "Take a look →"
  },
  {
    "key": "cartPage.emptyStartTitle",
    "group": "penztar",
    "hu": "Most kezdesz akváriumot?",
    "en": "Starting a new aquarium?"
  },
  {
    "key": "cartPage.emptyStartText",
    "group": "penztar",
    "hu": "Írd meg a méretet és a terveket, összeállítjuk a listát.",
    "en": "Tell us the size and your plans, and we put the list together."
  },
  {
    "key": "cartPage.discountAdd",
    "group": "penztar",
    "hu": "Kedvezménykód hozzáadása",
    "en": "Add a discount code"
  },
  {
    "key": "cartPage.discountApply",
    "group": "penztar",
    "hu": "Alkalmazás",
    "en": "Apply"
  },
  {
    "key": "cartPage.discountApplied",
    "group": "penztar",
    "hu": "Alkalmazott kedvezmények:",
    "en": "Applied discounts:"
  },
  {
    "key": "cartPage.giftCardAdd",
    "group": "penztar",
    "hu": "Ajándékkártya beváltása",
    "en": "Redeem a gift card"
  },
  {
    "key": "cartPage.giftCardApply",
    "group": "penztar",
    "hu": "Beváltás",
    "en": "Redeem"
  },
  {
    "key": "cartPage.giftCard",
    "group": "penztar",
    "hu": "Ajándékkártya",
    "en": "Gift card"
  },
  {
    "key": "cartPage.giftCardRemove",
    "group": "penztar",
    "hu": "Ajándékkártya levétele a rendelésről",
    "en": "Remove the gift card from the order"
  },
  {
    "key": "cartPage.giftCardRestNote",
    "group": "penztar",
    "hu": "A fennmaradó összeghez a fizetési módot a kártya beváltása után válaszd ki.",
    "en": "Choose the payment method for the rest after redeeming the card."
  },
  {
    "key": "checkoutPage.title",
    "group": "penztar",
    "hu": "Pénztár",
    "en": "Checkout"
  },
  {
    "key": "checkoutPage.backToCart",
    "group": "penztar",
    "hu": "Vissza a kosárhoz",
    "en": "Back to the cart"
  },
  {
    "key": "checkoutPage.back",
    "group": "penztar",
    "hu": "Vissza",
    "en": "Back"
  },
  {
    "key": "checkoutPage.summaryHeading",
    "group": "penztar",
    "hu": "A kosaradban",
    "en": "In your cart"
  },
  {
    "key": "checkoutPage.shippingAddress",
    "group": "penztar",
    "hu": "Szállítási cím",
    "en": "Delivery address"
  },
  {
    "key": "checkoutPage.billingAddress",
    "group": "penztar",
    "hu": "Számlázási cím",
    "en": "Billing address"
  },
  {
    "key": "checkoutPage.contact",
    "group": "penztar",
    "hu": "Kapcsolat",
    "en": "Contact"
  },
  {
    "key": "checkoutPage.edit",
    "group": "penztar",
    "hu": "Szerkesztés",
    "en": "Edit"
  },
  {
    "key": "checkoutPage.sameAddress",
    "group": "penztar",
    "hu": "A számlázási és a szállítási cím megegyezik.",
    "en": "The billing and delivery addresses are the same."
  },
  {
    "key": "checkoutPage.toShipping",
    "group": "penztar",
    "hu": "Tovább a szállításhoz",
    "en": "Continue to shipping"
  },
  {
    "key": "checkoutPage.savedAddressNamed",
    "group": "penztar",
    "hu": "Szia {name}! Használod valamelyik mentett címedet?",
    "en": "Hi {name}, do you want to use one of your saved addresses?"
  },
  {
    "key": "checkoutPage.savedAddress",
    "group": "penztar",
    "hu": "Használod valamelyik mentett címedet?",
    "en": "Do you want to use one of your saved addresses?"
  },
  {
    "key": "checkoutPage.chooseAddress",
    "group": "penztar",
    "hu": "Válassz címet",
    "en": "Choose an address"
  },
  {
    "key": "checkoutPage.firstName",
    "group": "penztar",
    "hu": "Keresztnév",
    "en": "First name"
  },
  {
    "key": "checkoutPage.lastName",
    "group": "penztar",
    "hu": "Vezetéknév",
    "en": "Last name"
  },
  {
    "key": "checkoutPage.address",
    "group": "penztar",
    "hu": "Cím",
    "en": "Address"
  },
  {
    "key": "checkoutPage.company",
    "group": "penztar",
    "hu": "Cégnév",
    "en": "Company"
  },
  {
    "key": "checkoutPage.postalCode",
    "group": "penztar",
    "hu": "Irányítószám",
    "en": "Postal code"
  },
  {
    "key": "checkoutPage.city",
    "group": "penztar",
    "hu": "Város",
    "en": "City"
  },
  {
    "key": "checkoutPage.province",
    "group": "penztar",
    "hu": "Megye / állam",
    "en": "County / state"
  },
  {
    "key": "checkoutPage.country",
    "group": "penztar",
    "hu": "Ország",
    "en": "Country"
  },
  {
    "key": "checkoutPage.email",
    "group": "penztar",
    "hu": "E-mail-cím",
    "en": "Email address"
  },
  {
    "key": "checkoutPage.emailInvalid",
    "group": "penztar",
    "hu": "Adj meg érvényes e-mail-címet.",
    "en": "Enter a valid email address."
  },
  {
    "key": "checkoutPage.phone",
    "group": "penztar",
    "hu": "Telefonszám",
    "en": "Phone number"
  },
  {
    "key": "checkoutPage.sameAsBilling",
    "group": "penztar",
    "hu": "A számlázási cím megegyezik a szállítási címmel",
    "en": "The billing address is the same as the delivery address"
  },
  {
    "key": "checkoutPage.companyPurchase",
    "group": "penztar",
    "hu": "Céges vásárlás: a számlát cégre kérem",
    "en": "Company purchase: please invoice the company"
  },
  {
    "key": "checkoutPage.companyPurchaseLead",
    "group": "penztar",
    "hu": "A cég nevét a cégnév mezőben add meg, és add meg az adószámot is.",
    "en": "Enter the company name in the company field, and the tax number."
  },
  {
    "key": "checkoutPage.taxId",
    "group": "penztar",
    "hu": "Adószám",
    "en": "Tax number"
  },
  {
    "key": "checkoutPage.taxIdHint",
    "group": "penztar",
    "hu": "Magyar adószám, például 12345678-1-23",
    "en": "Hungarian tax number, for example 12345678-1-23"
  },
  {
    "key": "checkoutPage.taxIdInvalid",
    "group": "penztar",
    "hu": "Adj meg érvényes magyar adószámot: 11 számjegy, például 12345678-1-23.",
    "en": "Enter a valid Hungarian tax number: 11 digits, for example 12345678-1-23."
  },
  {
    "key": "checkoutPage.taxIdSummary",
    "group": "penztar",
    "hu": "Adószám",
    "en": "Tax number"
  },
  {
    "key": "checkoutShipping.heading",
    "group": "penztar",
    "hu": "Szállítás",
    "en": "Shipping"
  },
  {
    "key": "checkoutShipping.modeHeading",
    "group": "penztar",
    "hu": "Szállítási mód",
    "en": "Shipping method"
  },
  {
    "key": "checkoutShipping.modeLead",
    "group": "penztar",
    "hu": "Hogyan szeretnéd átvenni a rendelésedet?",
    "en": "How would you like to receive your order?"
  },
  {
    "key": "checkoutShipping.storePickup",
    "group": "penztar",
    "hu": "Átvétel üzletben",
    "en": "Pickup in the store"
  },
  {
    "key": "checkoutShipping.storeHeading",
    "group": "penztar",
    "hu": "Üzlet",
    "en": "Store"
  },
  {
    "key": "checkoutShipping.storeLead",
    "group": "penztar",
    "hu": "Válassz egy közeli üzletet",
    "en": "Choose a store near you"
  },
  {
    "key": "checkoutShipping.free",
    "group": "penztar",
    "hu": "Ingyenes",
    "en": "Free"
  },
  {
    "key": "checkoutShipping.toPayment",
    "group": "penztar",
    "hu": "Tovább a fizetéshez",
    "en": "Continue to payment"
  },
  {
    "key": "checkoutShipping.summaryMode",
    "group": "penztar",
    "hu": "Mód",
    "en": "Method"
  },
  {
    "key": "checkoutShipping.foxpostBlocked",
    "group": "penztar",
    "hu": "Ez a tétel nem küldhető automatába: {item}.",
    "en": "This item cannot be sent to a parcel locker: {item}."
  },
  {
    "key": "checkoutShipping.pickupBlocked",
    "group": "penztar",
    "hu": "Az üzletben most nincs készleten, ezért bolti átvétellel nem kérheted: {item}.",
    "en": "Not in stock at the shop right now, so it can't be picked up there: {item}."
  },
  {
    "key": "checkoutShipping.pickupBlockedUnknown",
    "group": "penztar",
    "hu": "Az üzletben most nincs készleten a kosarad egyik tétele, ezért bolti átvétellel nem kérheted.",
    "en": "One item in your cart is not in stock at the shop right now, so it can't be picked up there."
  },
  {
    "key": "checkoutShipping.modeFoxpostText",
    "group": "penztar",
    "hu": "FOXPOST automata vagy átvételi pont · 1–2 munkanap",
    "en": "FOXPOST locker or pickup point · 1–2 working days"
  },
  {
    "key": "checkoutShipping.modeGlsPoint",
    "group": "penztar",
    "hu": "GLS csomagpont",
    "en": "GLS pickup point"
  },
  {
    "key": "checkoutShipping.modeGlsPointText",
    "group": "penztar",
    "hu": "GLS ParcelShop vagy automata · 1–2 munkanap",
    "en": "GLS ParcelShop or locker · 1–2 working days"
  },
  {
    "key": "checkoutShipping.modeGlsPointHeavy",
    "group": "penztar",
    "hu": "GLS nehézáru csomagpont",
    "en": "GLS heavy-goods pickup point"
  },
  {
    "key": "checkoutShipping.modeGlsPointHeavyText",
    "group": "penztar",
    "hu": "GLS ParcelShop · 1–2 munkanap",
    "en": "GLS ParcelShop · 1–2 working days"
  },
  {
    "key": "checkoutShipping.modeGlsHome",
    "group": "penztar",
    "hu": "GLS házhozszállítás",
    "en": "GLS home delivery"
  },
  {
    "key": "checkoutShipping.modeGlsHomeText",
    "group": "penztar",
    "hu": "Kézbesítés a megadott címre · 1–2 munkanap",
    "en": "Delivery to the address you gave · 1–2 working days"
  },
  {
    "key": "checkoutShipping.modeGlsHomeHeavy",
    "group": "penztar",
    "hu": "GLS nehézáru házhozszállítás",
    "en": "GLS heavy-goods home delivery"
  },
  {
    "key": "checkoutShipping.modeGlsHomeHeavyText",
    "group": "penztar",
    "hu": "Kézbesítés a megadott címre · 1–2 munkanap",
    "en": "Delivery to the address you gave · 1–2 working days"
  },
  {
    "key": "checkoutShipping.errorRejected",
    "group": "penztar",
    "hu": "Ezt a szállítási módot nem tudtuk beállítani. Válassz másikat.",
    "en": "We could not set this shipping method. Choose another one."
  },
  {
    "key": "checkoutShipping.errorFailed",
    "group": "penztar",
    "hu": "A szállítási mód beállítása most nem sikerült. Próbáld meg újra.",
    "en": "Setting the shipping method failed just now. Try again."
  },
  {
    "key": "checkoutShipping.errorNoteSave",
    "group": "penztar",
    "hu": "A megjegyzést most nem sikerült elmenteni. Próbáld újra, vagy hagyd üresen a mezőt.",
    "en": "We could not save the note just now. Try again, or leave the field empty."
  },
  {
    "key": "checkoutShipping.noteOrder",
    "group": "penztar",
    "hu": "Megjegyzés a rendeléshez",
    "en": "Note for the order"
  },
  {
    "key": "checkoutShipping.noteCourier",
    "group": "penztar",
    "hu": "Üzenet a futárnak",
    "en": "Message for the courier"
  },
  {
    "key": "checkoutShipping.optional",
    "group": "penztar",
    "hu": "(nem kötelező)",
    "en": "(optional)"
  },
  {
    "key": "checkoutShipping.pointHeading",
    "group": "penztar",
    "hu": "Átvételi pont kiválasztása",
    "en": "Choose a pickup point"
  },
  {
    "key": "checkoutShipping.pointSelected",
    "group": "penztar",
    "hu": "Kiválasztott átvételi pont",
    "en": "Selected pickup point"
  },
  {
    "key": "checkoutShipping.pointOther",
    "group": "penztar",
    "hu": "Másik pont választása",
    "en": "Choose another point"
  },
  {
    "key": "checkoutShipping.foxpostIntro",
    "group": "penztar",
    "hu": "A FOXPOST hivatalos térképes keresője nyílik meg. A hálózat FOXPOST automatákat, Z-BOX automatákat és Z-Pont átvevőhelyeket is tartalmaz.",
    "en": "The official FOXPOST map finder opens. The network includes FOXPOST lockers, Z-BOX lockers and Z-Pont pickup places."
  },
  {
    "key": "checkoutShipping.glsIntro",
    "group": "penztar",
    "hu": "A GLS hivatalos térképes keresője. A hálózat GLS ParcelShopokat és GLS Automatákat tartalmaz.",
    "en": "The official GLS map finder. The network includes GLS ParcelShops and GLS lockers."
  },
  {
    "key": "checkoutShipping.glsIntroHeavy",
    "group": "penztar",
    "hu": "A GLS hivatalos térképes keresője. Nehézárut GLS ParcelShopba küldünk.",
    "en": "The official GLS map finder. Heavy goods are sent to a GLS ParcelShop."
  },
  {
    "key": "checkoutShipping.glsIntroLocker",
    "group": "penztar",
    "hu": "A GLS hivatalos térképes keresője. A kosárban van egy tétel, ami nem fér csomagautomatába, ezért GLS ParcelShopba küldjük.",
    "en": "The official GLS map finder. An item in your cart does not fit a parcel locker, so it is sent to a GLS ParcelShop."
  },
  {
    "key": "checkoutShipping.glsListHeading",
    "group": "penztar",
    "hu": "GLS átvételi pontok",
    "en": "GLS pickup points"
  },
  {
    "key": "checkoutShipping.glsSearchLabel",
    "group": "penztar",
    "hu": "Irányítószám, város vagy a pont neve",
    "en": "Postal code, city or the name of the point"
  },
  {
    "key": "checkoutShipping.glsLoading",
    "group": "penztar",
    "hu": "A GLS térképes kereső betöltése…",
    "en": "Loading the GLS map finder…"
  },
  {
    "key": "checkoutShipping.glsToList",
    "group": "penztar",
    "hu": "Keresés listában",
    "en": "Search in a list"
  },
  {
    "key": "checkoutShipping.foxpostLoading",
    "group": "penztar",
    "hu": "A FOXPOST térképes kereső betöltése…",
    "en": "Loading the FOXPOST map finder…"
  },
  {
    "key": "checkoutShipping.foxpostFrameTitle",
    "group": "penztar",
    "hu": "FOXPOST térképes átvételipont-kereső",
    "en": "FOXPOST map finder for pickup points"
  },
  {
    "key": "checkoutShipping.foxpostToList",
    "group": "penztar",
    "hu": "Nem töltődik be a térkép? Keress listában.",
    "en": "The map does not load? Search in a list."
  },
  {
    "key": "checkoutShipping.listEmpty",
    "group": "penztar",
    "hu": "Keress irányítószámra vagy városra.",
    "en": "Search by postal code or city."
  },
  {
    "key": "checkoutShipping.listNone",
    "group": "penztar",
    "hu": "Nem találtunk átvételi pontot. Próbáld irányítószámmal.",
    "en": "We found no pickup point. Try a postal code."
  },
  {
    "key": "checkoutShipping.listFailed",
    "group": "penztar",
    "hu": "Nem sikerült betölteni a {provider} pontokat.",
    "en": "Could not load the {provider} points."
  },
  {
    "key": "checkoutShipping.pickedPoint",
    "group": "penztar",
    "hu": "Kiválasztott csomagpont: {name}",
    "en": "Selected pickup point: {name}"
  },
  {
    "key": "checkoutShipping.chooseHint",
    "group": "penztar",
    "hu": "Válaszd ki, melyik {provider} csomagpontba kéred a csomagot.",
    "en": "Choose which {provider} pickup point should get your parcel."
  },
  {
    "key": "checkoutShipping.searchLabel",
    "group": "penztar",
    "hu": "Irányítószám vagy város",
    "en": "Postal code or city"
  },
  {
    "key": "checkoutShipping.search",
    "group": "penztar",
    "hu": "Keresés",
    "en": "Search"
  },
  {
    "key": "checkoutShipping.unavailable",
    "group": "penztar",
    "hu": "A {provider} csomagpontjai most nem érhetők el. Válassz másik szállítási módot.",
    "en": "The {provider} pickup points are not available right now. Choose another shipping method."
  },
  {
    "key": "checkoutShipping.retry",
    "group": "penztar",
    "hu": "Újra",
    "en": "Retry"
  },
  {
    "key": "checkoutShipping.noResult",
    "group": "penztar",
    "hu": "Nincs találat erre a keresésre.",
    "en": "No result for this search."
  },
  {
    "key": "checkoutShipping.whereToFind",
    "group": "penztar",
    "hu": "Hol találom?",
    "en": "Where do I find it?"
  },
  {
    "key": "checkoutShipping.moreResults",
    "group": "penztar",
    "hu": "{count} találatból az első {shown} látszik; pontosíts a keresésen.",
    "en": "The first {shown} of {count} results are shown; narrow your search."
  },
  {
    "key": "checkoutShipping.dayMon",
    "group": "penztar",
    "hu": "H",
    "en": "Mon"
  },
  {
    "key": "checkoutShipping.dayTue",
    "group": "penztar",
    "hu": "K",
    "en": "Tue"
  },
  {
    "key": "checkoutShipping.dayWed",
    "group": "penztar",
    "hu": "Sze",
    "en": "Wed"
  },
  {
    "key": "checkoutShipping.dayThu",
    "group": "penztar",
    "hu": "Cs",
    "en": "Thu"
  },
  {
    "key": "checkoutShipping.dayFri",
    "group": "penztar",
    "hu": "P",
    "en": "Fri"
  },
  {
    "key": "checkoutShipping.daySat",
    "group": "penztar",
    "hu": "Szo",
    "en": "Sat"
  },
  {
    "key": "checkoutShipping.daySun",
    "group": "penztar",
    "hu": "V",
    "en": "Sun"
  },
  {
    "key": "checkoutShipping.featureCard",
    "group": "penztar",
    "hu": "bankkártya",
    "en": "card payment"
  },
  {
    "key": "checkoutShipping.featureCash",
    "group": "penztar",
    "hu": "készpénz",
    "en": "cash"
  },
  {
    "key": "checkoutShipping.featureAccessible",
    "group": "penztar",
    "hu": "akadálymentes",
    "en": "wheelchair accessible"
  },
  {
    "key": "checkoutShipping.glsNotSelectable",
    "group": "penztar",
    "hu": "Jelenleg nem választható.",
    "en": "Not available at the moment."
  },
  {
    "key": "checkoutShipping.glsHighLoad",
    "group": "penztar",
    "hu": "Magas kihasználtság: a kézbesítés hosszabb lehet.",
    "en": "High load: delivery may take longer."
  },
  {
    "key": "checkoutShipping.foxpostPickupDispatch",
    "group": "penztar",
    "hu": "Csomagfeladás és -átvétel",
    "en": "Parcel drop-off and pickup"
  },
  {
    "key": "checkoutShipping.foxpostPickupOnly",
    "group": "penztar",
    "hu": "Csak csomagátvétel",
    "en": "Parcel pickup only"
  },
  {
    "key": "checkoutShipping.foxpostPayment",
    "group": "penztar",
    "hu": "Fizetés: {methods}",
    "en": "Payment: {methods}"
  },
  {
    "key": "checkoutShipping.payCard",
    "group": "penztar",
    "hu": "bankkártya",
    "en": "card"
  },
  {
    "key": "checkoutShipping.payCash",
    "group": "penztar",
    "hu": "készpénz",
    "en": "cash"
  },
  {
    "key": "checkoutShipping.payLink",
    "group": "penztar",
    "hu": "fizetési link",
    "en": "payment link"
  },
  {
    "key": "checkoutShipping.typeFoxpost",
    "group": "penztar",
    "hu": "FOXPOST automata",
    "en": "FOXPOST locker"
  },
  {
    "key": "checkoutShipping.typeZpoint",
    "group": "penztar",
    "hu": "Packeta Z-Pont / átvevőhely",
    "en": "Packeta Z-Pont / pickup place"
  },
  {
    "key": "checkoutPayment.lead",
    "group": "penztar",
    "hu": "Válaszd ki a fizetési módot. A rendelési, számlázási és szállítási adataid már rögzítve vannak.",
    "en": "Choose how you pay. Your order, billing and shipping details are already saved."
  },
  {
    "key": "checkoutPayment.cardMode",
    "group": "penztar",
    "hu": "Fizetési mód",
    "en": "Payment method"
  },
  {
    "key": "checkoutPayment.cardOrderData",
    "group": "penztar",
    "hu": "Rendelési adatok",
    "en": "Order details"
  },
  {
    "key": "checkoutPayment.cardContact",
    "group": "penztar",
    "hu": "Kapcsolattartás",
    "en": "Contact"
  },
  {
    "key": "checkoutPayment.cardBilling",
    "group": "penztar",
    "hu": "Számlázás",
    "en": "Billing"
  },
  {
    "key": "checkoutPayment.cardFinalize",
    "group": "penztar",
    "hu": "Rendelés véglegesítése",
    "en": "Place your order"
  },
  {
    "key": "checkoutPayment.cardGroups",
    "group": "penztar",
    "hu": "Szállítási csoportok",
    "en": "Shipping groups"
  },
  {
    "key": "checkoutPayment.groupsLead",
    "group": "penztar",
    "hu": "A szállítási módok ezen a lépésen már nem módosíthatók.",
    "en": "The shipping methods can no longer be changed at this step."
  },
  {
    "key": "checkoutPayment.groupDelivery",
    "group": "penztar",
    "hu": "Kiszállítás",
    "en": "Delivery"
  },
  {
    "key": "checkoutPayment.groupPickup",
    "group": "penztar",
    "hu": "Átvétel",
    "en": "Pickup"
  },
  {
    "key": "checkoutPayment.groupLive",
    "group": "penztar",
    "hu": "Élőállat",
    "en": "Live animals"
  },
  {
    "key": "checkoutPayment.groupStore",
    "group": "penztar",
    "hu": "Személyes átvétel",
    "en": "Pickup in the store"
  },
  {
    "key": "checkoutPayment.yourOrder",
    "group": "penztar",
    "hu": "Rendelésed",
    "en": "Your order"
  },
  {
    "key": "checkoutPayment.summaryShort",
    "group": "penztar",
    "hu": "Összesítés",
    "en": "Summary"
  },
  {
    "key": "checkoutPayment.products",
    "group": "penztar",
    "hu": "Termékek",
    "en": "Products"
  },
  {
    "key": "checkoutPayment.shipping",
    "group": "penztar",
    "hu": "Szállítás",
    "en": "Shipping"
  },
  {
    "key": "checkoutPayment.discount",
    "group": "penztar",
    "hu": "Kedvezmény",
    "en": "Discount"
  },
  {
    "key": "checkoutPayment.payable",
    "group": "penztar",
    "hu": "Fizetendő",
    "en": "Total to pay"
  },
  {
    "key": "checkoutPayment.backToDetails",
    "group": "penztar",
    "hu": "Vissza az adatokhoz",
    "en": "Back to the details"
  },
  {
    "key": "checkoutPayment.totalFixed",
    "group": "penztar",
    "hu": "A rendelés végösszege a fizetési mód kiválasztásakor nem változik.",
    "en": "The total of the order does not change when you choose a payment method."
  },
  {
    "key": "checkoutPayment.modeCard",
    "group": "penztar",
    "hu": "Bankkártyás fizetés",
    "en": "Card payment"
  },
  {
    "key": "checkoutPayment.modeCod",
    "group": "penztar",
    "hu": "Utánvét",
    "en": "Cash on delivery"
  },
  {
    "key": "checkoutPayment.modePayAtStore",
    "group": "penztar",
    "hu": "Fizetés átvételkor",
    "en": "Pay on pickup"
  },
  {
    "key": "checkoutPayment.modeTransfer",
    "group": "penztar",
    "hu": "Előre utalás",
    "en": "Bank transfer in advance"
  },
  {
    "key": "checkoutPayment.modeTransferText",
    "group": "penztar",
    "hu": "Díjbekérő emailben, 8 napos fizetési határidővel",
    "en": "Proforma invoice by email, payable within 8 days"
  },
  {
    "key": "checkoutPayment.cardWallets",
    "group": "penztar",
    "hu": "Kártya · Apple Pay · Google Pay",
    "en": "Card · Apple Pay · Google Pay"
  },
  {
    "key": "checkoutPayment.selected",
    "group": "penztar",
    "hu": "Kiválasztva",
    "en": "Selected"
  },
  {
    "key": "checkoutPayment.loadError",
    "group": "penztar",
    "hu": "Nem sikerült betölteni a fizetési módokat.",
    "en": "Could not load the payment methods."
  },
  {
    "key": "checkoutPayment.trust",
    "group": "penztar",
    "hu": "A kártyaadatokat a Stripe biztonságos fizetési rendszere kezeli; az Acropora nem fér hozzá a kártyaadataidhoz.",
    "en": "Card details are handled by Stripe's secure payment system; Acropora has no access to your card details."
  },
  {
    "key": "checkoutPayment.onePayment",
    "group": "penztar",
    "hu": "Egy fizetés · {amount}",
    "en": "One payment · {amount}"
  },
  {
    "key": "checkoutPayment.onePaymentBoth",
    "group": "penztar",
    "hu": "Egy fizetés · a két rendelés együtt · {amount}",
    "en": "One payment · both orders together · {amount}"
  },
  {
    "key": "checkoutPayment.noMode",
    "group": "penztar",
    "hu": "A választott szállítási módhoz jelenleg nincs elérhető fizetési mód. Válassz másik szállítási módot, vagy vedd fel velünk a kapcsolatot.",
    "en": "There is no payment method available for the chosen shipping method right now. Choose another shipping method, or contact us."
  },
  {
    "key": "checkoutPayment.giftCard",
    "group": "penztar",
    "hu": "Ajándékkártya",
    "en": "Gift card"
  },
  {
    "key": "checkoutPayment.codFee",
    "group": "penztar",
    "hu": "Utánvét kezelési díj: {amount}. A rendelés végösszege ezt tartalmazza.",
    "en": "Cash on delivery fee: {amount}. The total of the order includes it."
  },
  {
    "key": "checkoutPayment.paymentLabel",
    "group": "penztar",
    "hu": "Fizetés",
    "en": "Payment"
  },
  {
    "key": "checkoutPayment.cardShort",
    "group": "penztar",
    "hu": "Bankkártya",
    "en": "Card"
  },
  {
    "key": "checkoutPayment.toReview",
    "group": "penztar",
    "hu": "Tovább az ellenőrzéshez",
    "en": "Continue to review"
  },
  {
    "key": "checkoutPayment.chooseMode",
    "group": "penztar",
    "hu": "Válassz fizetési módot",
    "en": "Choose a payment method"
  },
  {
    "key": "checkoutPayment.aszfMissing",
    "group": "penztar",
    "hu": "A rendelés leadásához fogadd el az ÁSZF-et és az adatkezelési tájékoztatót.",
    "en": "To place the order, accept the Terms and Conditions and the Privacy Notice."
  },
  {
    "key": "checkoutPayment.summaryMode",
    "group": "penztar",
    "hu": "Fizetési mód",
    "en": "Payment method"
  },
  {
    "key": "checkoutPayment.summaryDetails",
    "group": "penztar",
    "hu": "Fizetés részletei",
    "en": "Payment details"
  },
  {
    "key": "checkoutPayment.summaryNext",
    "group": "penztar",
    "hu": "Megjelenik a következő lépés",
    "en": "Shown in the next step"
  },
  {
    "key": "checkoutPayment.edit",
    "group": "penztar",
    "hu": "Szerkesztés",
    "en": "Edit"
  },
  {
    "key": "checkoutPayment.reviewHeading",
    "group": "penztar",
    "hu": "Ellenőrzés",
    "en": "Review"
  },
  {
    "key": "checkoutPayment.reviewConfirm",
    "group": "penztar",
    "hu": "A rendelés leadásával megerősíted, hogy elolvastad és elfogadod az általános szerződési feltételeket, az értékesítési és visszaküldési szabályzatot, valamint az adatkezelési tájékoztatót.",
    "en": "By placing the order you confirm that you have read and accept the general terms and conditions, the sales and returns policy, and the privacy notice."
  },
  {
    "key": "checkoutPayment.placeOrder",
    "group": "penztar",
    "hu": "Megrendel",
    "en": "Place order"
  },
  {
    "key": "checkoutPayment.processing",
    "group": "penztar",
    "hu": "Feldolgozás…",
    "en": "Processing…"
  },
  {
    "key": "checkoutPayment.checking",
    "group": "penztar",
    "hu": "Ellenőrzés…",
    "en": "Checking…"
  },
  {
    "key": "checkoutPayment.tryAgain",
    "group": "penztar",
    "hu": "Próbáld újra",
    "en": "Try again"
  },
  {
    "key": "checkoutPayment.paymentProcessing",
    "group": "penztar",
    "hu": "Fizetés feldolgozása…",
    "en": "Processing the payment…"
  },
  {
    "key": "checkoutPayment.paymentChecking",
    "group": "penztar",
    "hu": "Fizetés ellenőrzése…",
    "en": "Checking the payment…"
  },
  {
    "key": "checkoutPayment.dontClose",
    "group": "penztar",
    "hu": "Ne zárd be az oldalt.",
    "en": "Do not close the page."
  },
  {
    "key": "checkoutPayment.bankChecking",
    "group": "penztar",
    "hu": "A banki hitelesítés eredményét ellenőrizzük.",
    "en": "We are checking the result of the bank authentication."
  },
  {
    "key": "checkoutPayment.threeDs",
    "group": "penztar",
    "hu": "Ha a bankod további hitelesítést kér, a Stripe biztonságos ablaka most megnyílik. A fizetés addig nincs befejezve.",
    "en": "If your bank asks for further authentication, Stripe's secure window opens now. The payment is not finished until then."
  },
  {
    "key": "checkoutPayment.cardDeclined",
    "group": "penztar",
    "hu": "A kártyás fizetés nem sikerült. Próbáld újra vagy válassz másik fizetési módot.",
    "en": "The card payment did not go through. Try again or choose another payment method."
  },
  {
    "key": "checkoutPayment.express",
    "group": "penztar",
    "hu": "Gyors fizetés",
    "en": "Express payment"
  },
  {
    "key": "checkoutPayment.expressLocked",
    "group": "penztar",
    "hu": "A gyors fizetéshez előbb fogadd el az ÁSZF-et (lent).",
    "en": "To use express payment, first accept the Terms and Conditions (below)."
  },
  {
    "key": "checkoutPayment.expressOr",
    "group": "penztar",
    "hu": "vagy bankkártya",
    "en": "or card"
  },
  {
    "key": "checkoutPayment.aszfFirst",
    "group": "penztar",
    "hu": "Elfogadom az ",
    "en": "I accept the "
  },
  {
    "key": "checkoutPayment.aszfDoc",
    "group": "penztar",
    "hu": "Általános szerződési feltételeket",
    "en": "Terms and Conditions"
  },
  {
    "key": "checkoutPayment.aszfMiddle",
    "group": "penztar",
    "hu": " és az ",
    "en": " and the "
  },
  {
    "key": "checkoutPayment.aszfPrivacy",
    "group": "penztar",
    "hu": "Adatkezelési tájékoztatót",
    "en": "Privacy Notice"
  },
  {
    "key": "checkoutPayment.aszfLast",
    "group": "penztar",
    "hu": ". Tudomásul veszem, hogy a megrendelés elküldése fizetési kötelezettséggel jár.",
    "en": ". I acknowledge that placing the order creates an obligation to pay."
  },
  {
    "key": "checkoutPayment.legalTest",
    "group": "penztar",
    "hu": "Teszt kirakat: a jogi dokumentumok az átálláskor a Fogyasztóbarátból jönnek.",
    "en": "Test shop: the legal documents come from Fogyasztóbarát at the switchover."
  },
  {
    "key": "checkoutPayment.errPaymentRejected",
    "group": "penztar",
    "hu": "Ezt a fizetési módot nem tudtuk elindítani. Válassz másikat.",
    "en": "We could not start this payment method. Choose another one."
  },
  {
    "key": "checkoutPayment.errPaymentFailed",
    "group": "penztar",
    "hu": "A fizetés előkészítése most nem sikerült. Próbáld meg újra.",
    "en": "Preparing the payment failed just now. Try again."
  },
  {
    "key": "checkoutPayment.errOrderRejected",
    "group": "penztar",
    "hu": "A rendelést nem tudtuk leadni. Nézd át a kosarat és a megadott adatokat.",
    "en": "We could not place the order. Check your cart and the details you gave."
  },
  {
    "key": "checkoutPayment.errOrderFailed",
    "group": "penztar",
    "hu": "A rendelés leadása most nem sikerült. Mielőtt újra próbálod, nézd meg a rendeléseid között, hogy megérkezett-e.",
    "en": "Placing the order failed just now. Before you try again, check your orders to see whether it arrived."
  },
  {
    "key": "checkoutPayment.errPieceHeld",
    "group": "penztar",
    "hu": "Egy egyedi darabot most más vevő kosara tart. Ha a foglalása lejár, újra a tiéd lehet: próbáld újra később.",
    "en": "A unique piece in your cart is held in another buyer's cart right now. When their hold ends it may be yours: please try again later."
  },
  {
    "key": "checkoutPayment.errPersonalDiscountCoupon",
    "group": "penztar",
    "hu": "Ezt a kupont nem tudod felhasználni, mert saját kedvezményed van. Vedd le a kupont a kosárból, és próbáld újra.",
    "en": "You cannot use this coupon, because you have your own discount. Remove the coupon from the cart and try again."
  },
  {
    "key": "checkoutPayment.errSplitDiscount",
    "group": "penztar",
    "hu": "Az élő állat miatt a kosarad két rendelésre bomlik, és így a kedvezmény nem érvényesíthető ugyanúgy. Add le az élő állatot külön kosárban, vagy távolítsd el a kupont, és próbáld újra.",
    "en": "Because of the live animal your cart splits into two orders, and the discount cannot apply the same way. Order the live animal in a separate cart, or remove the coupon, and try again."
  },
  {
    "key": "checkoutPayment.errLegalMissing",
    "group": "penztar",
    "hu": "A rendelést most nem tudjuk fogadni: az ÁSZF és az adatkezelési tájékoztató még nincs közzétéve.",
    "en": "We cannot take the order right now: the Terms and Conditions and the Privacy Notice are not published yet."
  },
  {
    "key": "checkoutPayment.errAszfSave",
    "group": "penztar",
    "hu": "Az ÁSZF elfogadását most nem sikerült rögzíteni, ezért a fizetés nem indult el. Próbáld újra.",
    "en": "We could not record your acceptance of the Terms and Conditions, so the payment did not start. Try again."
  },
  {
    "key": "orderConfirmed.metaTitle",
    "group": "rendeles-leadva",
    "hu": "Rendelés visszaigazolása",
    "en": "Order confirmation"
  },
  {
    "key": "orderConfirmed.metaDescription",
    "group": "rendeles-leadva",
    "hu": "A rendelésedet sikeresen leadtad.",
    "en": "You placed your order successfully."
  },
  {
    "key": "orderConfirmed.thanksLong",
    "group": "rendeles-leadva",
    "hu": "Köszönjük a rendelésed!",
    "en": "Thank you for your order!"
  },
  {
    "key": "orderConfirmed.thanksShort",
    "group": "rendeles-leadva",
    "hu": "Köszönjük!",
    "en": "Thank you!"
  },
  {
    "key": "orderConfirmed.success",
    "group": "rendeles-leadva",
    "hu": "Rendelés sikeres",
    "en": "Order placed"
  },
  {
    "key": "orderConfirmed.emailLine",
    "group": "rendeles-leadva",
    "hu": "A rendeléshez megadott e-mail-cím:",
    "en": "The email address you gave for the order:"
  },
  {
    "key": "orderConfirmed.minimalText",
    "group": "rendeles-leadva",
    "hu": "A rendelésed részleteit a visszaigazoló e-mailben találod. Ha van fiókod, a rendeléseidet bejelentkezés után a Rendeléseim oldalon is megnézheted.",
    "en": "You find the details of your order in the confirmation email. If you have an account, you can also see your orders on the My orders page after signing in."
  },
  {
    "key": "orderConfirmed.openOrders",
    "group": "rendeles-leadva",
    "hu": "Rendeléseim megnyitása",
    "en": "Open my orders"
  },
  {
    "key": "orderConfirmed.viewOrderGuest",
    "group": "rendeles-leadva",
    "hu": "Rendelés megtekintése",
    "en": "View your order"
  },
  {
    "key": "orderConfirmed.backToShop",
    "group": "rendeles-leadva",
    "hu": "Vissza a webshophoz",
    "en": "Back to the shop"
  },
  {
    "key": "orderConfirmed.fulfilment",
    "group": "rendeles-leadva",
    "hu": "Teljesítés",
    "en": "Fulfilment"
  },
  {
    "key": "orderConfirmed.twoFulfilments",
    "group": "rendeles-leadva",
    "hu": "A két teljesítés külön rendelésként követhető.",
    "en": "The two fulfilments can be followed as separate orders."
  },
  {
    "key": "orderConfirmed.whatNext",
    "group": "rendeles-leadva",
    "hu": "Mi történik ezután?",
    "en": "What happens next?"
  },
  {
    "key": "orderConfirmed.nextStep",
    "group": "rendeles-leadva",
    "hu": "Összekészítjük a csomagot. A követési szám akkor jelenik meg, amikor a csomagot feladtuk.",
    "en": "We pack your parcel. The tracking number appears when we have dispatched the parcel."
  },
  {
    "key": "orderConfirmed.nextStepGls",
    "group": "rendeles-leadva",
    "hu": "Összekészítjük a csomagot. A GLS követési szám akkor jelenik meg, amikor a csomagot feladtuk.",
    "en": "We pack your parcel. The GLS tracking number appears when we have dispatched the parcel."
  },
  {
    "key": "orderConfirmed.nextStepTransfer",
    "group": "rendeles-leadva",
    "hu": "A díjbekérőt e-mailben küldjük, 8 napos fizetési határidővel. A csomagot a befizetés beérkezése után állítjuk össze; a követési szám akkor jelenik meg, amikor feladtuk.",
    "en": "We send the proforma invoice by e-mail, with an 8-day payment deadline. We pack your parcel once the payment has arrived; the tracking number appears when we have dispatched it."
  },
  {
    "key": "orderConfirmed.pickupWhere",
    "group": "rendeles-leadva",
    "hu": "Az átvétel helye: {name}, {address}.",
    "en": "Pick-up location: {name}, {address}."
  },
  {
    "key": "orderConfirmed.pickupPayAtStore",
    "group": "rendeles-leadva",
    "hu": "Az üzletben átvehető. Fizetés átvételkor.",
    "en": "Available for pick-up in the store. Payment at pick-up."
  },
  {
    "key": "orderConfirmed.summary",
    "group": "rendeles-leadva",
    "hu": "Rendelés összesítő",
    "en": "Order summary"
  },
  {
    "key": "orderConfirmed.orderNumber",
    "group": "rendeles-leadva",
    "hu": "Rendelésszám",
    "en": "Order number"
  },
  {
    "key": "orderConfirmed.payment",
    "group": "rendeles-leadva",
    "hu": "Fizetés",
    "en": "Payment"
  },
  {
    "key": "orderConfirmed.total",
    "group": "rendeles-leadva",
    "hu": "Végösszeg",
    "en": "Total"
  },
  {
    "key": "orderConfirmed.orders",
    "group": "rendeles-leadva",
    "hu": "Rendelések",
    "en": "Orders"
  },
  {
    "key": "orderConfirmed.company",
    "group": "rendeles-leadva",
    "hu": "Cég",
    "en": "Company"
  },
  {
    "key": "orderConfirmed.taxId",
    "group": "rendeles-leadva",
    "hu": "Adószám",
    "en": "Tax number"
  },
  {
    "key": "orderConfirmed.ordersCount",
    "group": "rendeles-leadva",
    "hu": "{count} db",
    "en": "{count}"
  },
  {
    "key": "orderConfirmed.shippingFee",
    "group": "rendeles-leadva",
    "hu": "Szállítás: {amount}",
    "en": "Shipping: {amount}"
  },
  {
    "key": "orderConfirmed.codFee",
    "group": "rendeles-leadva",
    "hu": "Utánvét kezelési díj: {amount}",
    "en": "Cash on delivery fee: {amount}"
  },
  {
    "key": "orderConfirmed.payOnReceipt",
    "group": "rendeles-leadva",
    "hu": "Átvételkor fizetendő: {amount}",
    "en": "To pay on receipt: {amount}"
  },
  {
    "key": "orderConfirmed.payCard",
    "group": "rendeles-leadva",
    "hu": "Bankkártya",
    "en": "Card"
  },
  {
    "key": "orderConfirmed.payCod",
    "group": "rendeles-leadva",
    "hu": "Utánvét",
    "en": "Cash on delivery"
  },
  {
    "key": "orderConfirmed.payAtStore",
    "group": "rendeles-leadva",
    "hu": "Fizetés átvételkor",
    "en": "Pay on pickup"
  },
  {
    "key": "orderConfirmed.labelStore",
    "group": "rendeles-leadva",
    "hu": "{n}. Személyes átvétel",
    "en": "{n}. Pickup in the store"
  },
  {
    "key": "orderConfirmed.labelDelivery",
    "group": "rendeles-leadva",
    "hu": "{n}. Kiszállítandó rendelés",
    "en": "{n}. Order to be delivered"
  },
  {
    "key": "orderConfirmed.shopName",
    "group": "rendeles-leadva",
    "hu": "Acropora üzlet",
    "en": "Acropora store"
  },
  {
    "key": "orderConfirmed.itemLine",
    "group": "rendeles-leadva",
    "hu": "{title} · {quantity} db",
    "en": "{title} · qty {quantity}"
  },
  {
    "key": "guestOrder.pageTitle",
    "group": "rendeles-allapota",
    "hu": "Rendelés megtekintése",
    "en": "View your order"
  },
  {
    "key": "guestOrder.intro",
    "group": "rendeles-allapota",
    "hu": "Add meg a rendelésszámot és a vásárláskor használt e-mail címet, és megmutatjuk a rendelésed állapotát.",
    "en": "Enter the order number and the e-mail address you used when you ordered, and we will show you the status of your order."
  },
  {
    "key": "guestOrder.orderNumberLabel",
    "group": "rendeles-allapota",
    "hu": "Rendelésszám",
    "en": "Order number"
  },
  {
    "key": "guestOrder.orderNumberHelp",
    "group": "rendeles-allapota",
    "hu": "Megtalálod a visszaigazoló e-mailben.",
    "en": "You will find it in the confirmation e-mail."
  },
  {
    "key": "guestOrder.emailLabel",
    "group": "rendeles-allapota",
    "hu": "E-mail cím",
    "en": "E-mail address"
  },
  {
    "key": "guestOrder.emailHelp",
    "group": "rendeles-allapota",
    "hu": "Az a cím, amellyel rendeltél.",
    "en": "The address you ordered with."
  },
  {
    "key": "guestOrder.submit",
    "group": "rendeles-allapota",
    "hu": "Rendelés megnézése",
    "en": "Show my order"
  },
  {
    "key": "guestOrder.searching",
    "group": "rendeles-allapota",
    "hu": "Keresés…",
    "en": "Searching…"
  },
  {
    "key": "guestOrder.errorRequired",
    "group": "rendeles-allapota",
    "hu": "Kérjük, töltsd ki ezt a mezőt.",
    "en": "Please fill in this field."
  },
  {
    "key": "guestOrder.errorEmail",
    "group": "rendeles-allapota",
    "hu": "Ellenőrizd az e-mail címet, valami hiányzik belőle.",
    "en": "Please check the e-mail address, something is missing."
  },
  {
    "key": "guestOrder.errorNumber",
    "group": "rendeles-allapota",
    "hu": "A rendelésszám csak számjegyekből áll.",
    "en": "The order number consists of digits only."
  },
  {
    "key": "guestOrder.errorNotFound",
    "group": "rendeles-allapota",
    "hu": "Nem találtuk a rendelést ezekkel az adatokkal. Ellenőrizd a rendelésszámot és az e-mail címet, vagy írj nekünk: webshop@acropora.hu.",
    "en": "We could not find the order with these details. Please check the order number and the e-mail address, or write to us: webshop@acropora.hu."
  },
  {
    "key": "guestOrder.errorTooMany",
    "group": "rendeles-allapota",
    "hu": "Túl sok sikertelen próbálkozás történt. Próbáld újra 15 perc múlva, vagy írj nekünk.",
    "en": "There were too many unsuccessful attempts. Please try again in 15 minutes, or write to us."
  },
  {
    "key": "guestOrder.errorUnavailable",
    "group": "rendeles-allapota",
    "hu": "Most nem tudjuk megmutatni a rendelést. Próbáld újra kicsit később, vagy írj nekünk: webshop@acropora.hu.",
    "en": "We cannot show the order right now. Please try again a little later, or write to us: webshop@acropora.hu."
  },
  {
    "key": "guestOrder.splitNotice",
    "group": "rendeles-allapota",
    "hu": "Ez a vásárlás két rendelésből áll, mert élő állat is volt benne. Az egyiket kiszállítjuk, a másik élő állatokat a boltban veheted át.",
    "en": "This purchase consists of two orders, because it included live animals. One is delivered to you; the live animals can be collected in the store."
  },
  {
    "key": "guestOrder.blockShipped",
    "group": "rendeles-allapota",
    "hu": "Kiszállítandó termékek",
    "en": "Products to be delivered"
  },
  {
    "key": "guestOrder.blockPickup",
    "group": "rendeles-allapota",
    "hu": "Élő állatok, átvétel a boltban",
    "en": "Live animals, collection in the store"
  },
  {
    "key": "guestOrder.orderNumber",
    "group": "rendeles-allapota",
    "hu": "Rendelés #{number}",
    "en": "Order #{number}"
  },
  {
    "key": "guestOrder.placedOn",
    "group": "rendeles-allapota",
    "hu": "Leadva: {date}",
    "en": "Placed on: {date}"
  },
  {
    "key": "guestOrder.statusHeading",
    "group": "rendeles-allapota",
    "hu": "Állapot",
    "en": "Status"
  },
  {
    "key": "guestOrder.paymentHeading",
    "group": "rendeles-allapota",
    "hu": "Fizetés",
    "en": "Payment"
  },
  {
    "key": "guestOrder.itemsHeading",
    "group": "rendeles-allapota",
    "hu": "Tételek",
    "en": "Items"
  },
  {
    "key": "guestOrder.shippingLine",
    "group": "rendeles-allapota",
    "hu": "Szállítás: {name}",
    "en": "Shipping: {name}"
  },
  {
    "key": "guestOrder.totalLine",
    "group": "rendeles-allapota",
    "hu": "Végösszeg",
    "en": "Total"
  },
  {
    "key": "guestOrder.pickupPoint",
    "group": "rendeles-allapota",
    "hu": "Átvételi pont: {name}, {address}",
    "en": "Pick-up point: {name}, {address}"
  },
  {
    "key": "guestOrder.pickupPointNameOnly",
    "group": "rendeles-allapota",
    "hu": "Átvételi pont: {name}",
    "en": "Pick-up point: {name}"
  },
  {
    "key": "guestOrder.carrierLine",
    "group": "rendeles-allapota",
    "hu": "Szállító: {carrier}",
    "en": "Carrier: {carrier}"
  },
  {
    "key": "guestOrder.trackingButton",
    "group": "rendeles-allapota",
    "hu": "Csomag követése",
    "en": "Track the parcel"
  },
  {
    "key": "guestOrder.trackingNumber",
    "group": "rendeles-allapota",
    "hu": "Csomagszám: {number}",
    "en": "Tracking number: {number}"
  },
  {
    "key": "guestOrder.trackingNone",
    "group": "rendeles-allapota",
    "hu": "A csomagszám akkor jelenik meg, amikor a futár átvette a csomagot.",
    "en": "The tracking number appears when the courier has taken over the parcel."
  },
  {
    "key": "guestOrder.trackingNoLink",
    "group": "rendeles-allapota",
    "hu": "A követés most nem érhető el. A csomagszámmal megnézheted a szállító oldalán.",
    "en": "Tracking is not available right now. You can look the parcel up with the tracking number on the carrier's site."
  },
  {
    "key": "guestOrder.status.pendingProcessing.label",
    "group": "rendeles-allapota",
    "hu": "Beérkezett",
    "en": "Received"
  },
  {
    "key": "guestOrder.status.pendingProcessing.text",
    "group": "rendeles-allapota",
    "hu": "Megkaptuk a rendelésedet.",
    "en": "We have received your order."
  },
  {
    "key": "guestOrder.status.confirmed.label",
    "group": "rendeles-allapota",
    "hu": "Visszaigazolva",
    "en": "Confirmed"
  },
  {
    "key": "guestOrder.status.confirmed.text",
    "group": "rendeles-allapota",
    "hu": "Visszaigazoltuk a rendelésedet.",
    "en": "We have confirmed your order."
  },
  {
    "key": "guestOrder.status.stocking.label",
    "group": "rendeles-allapota",
    "hu": "Feldolgozás alatt",
    "en": "Being prepared"
  },
  {
    "key": "guestOrder.status.stocking.text",
    "group": "rendeles-allapota",
    "hu": "Összeállítjuk a rendelésedet.",
    "en": "We are putting your order together."
  },
  {
    "key": "guestOrder.status.outForDelivery.label",
    "group": "rendeles-allapota",
    "hu": "Úton van",
    "en": "On its way"
  },
  {
    "key": "guestOrder.status.outForDelivery.text",
    "group": "rendeles-allapota",
    "hu": "A csomagot átvette a futárszolgálat.",
    "en": "The courier service has taken over the parcel."
  },
  {
    "key": "guestOrder.status.readyForPickup.label",
    "group": "rendeles-allapota",
    "hu": "Átvehető",
    "en": "Ready for collection"
  },
  {
    "key": "guestOrder.status.readyForPickup.text",
    "group": "rendeles-allapota",
    "hu": "A rendelésed átvehető.",
    "en": "Your order is ready for collection."
  },
  {
    "key": "guestOrder.status.closed.label",
    "group": "rendeles-allapota",
    "hu": "Átvéve",
    "en": "Received by you"
  },
  {
    "key": "guestOrder.status.closed.text",
    "group": "rendeles-allapota",
    "hu": "A rendelés lezárult.",
    "en": "The order is closed."
  },
  {
    "key": "guestOrder.status.closedUnsuccessfully.label",
    "group": "rendeles-allapota",
    "hu": "Sikertelenül lezárt",
    "en": "Closed unsuccessfully"
  },
  {
    "key": "guestOrder.status.closedUnsuccessfully.text",
    "group": "rendeles-allapota",
    "hu": "A rendelés nem teljesült. A kifizetett összeget ugyanazzal a fizetési móddal visszatérítjük, 14 napon belül.",
    "en": "The order could not be fulfilled. We will refund what you paid by the same payment method within 14 days."
  },
  {
    "key": "guestOrder.payment.awaiting.label",
    "group": "rendeles-allapota",
    "hu": "Fizetésre vár",
    "en": "Awaiting payment"
  },
  {
    "key": "guestOrder.payment.awaiting.text",
    "group": "rendeles-allapota",
    "hu": "A fizetés még nem érkezett meg. Előre utalásnál a díjbekérőn szereplő határidőig (8 nap) várjuk az összeget; ha addig nem érkezik meg, felvesszük veled a kapcsolatot.",
    "en": "The payment has not arrived yet. For a bank transfer, we wait for the amount until the due date on the payment request (8 days); if it has not arrived by then, we will contact you."
  },
  {
    "key": "guestOrder.payment.awaitingRelease.label",
    "group": "rendeles-allapota",
    "hu": "Fizetésre vár",
    "en": "Awaiting payment"
  },
  {
    "key": "guestOrder.payment.awaitingRelease.text",
    "group": "rendeles-allapota",
    "hu": "A kártyádon zárolt összeget feloldottuk, mert a termék később érkezik. Amikor megérkezik, e-mailben küldünk egy fizetési linket, azon tudod kifizetni a rendelést.",
    "en": "We released the amount held on your card, because the product arrives later. When it arrives, we will send you a payment link by e-mail to pay for the order."
  },
  {
    "key": "guestOrder.payment.awaitingLink.label",
    "group": "rendeles-allapota",
    "hu": "Fizetésre vár",
    "en": "Awaiting payment"
  },
  {
    "key": "guestOrder.payment.awaitingLink.text",
    "group": "rendeles-allapota",
    "hu": "A fizetési linket e-mailben küldtük el. A link 6 napig érvényes, a harmadik napon emlékeztetőt küldünk. Ha addig nem érkezik meg a fizetés, a rendelést lezárjuk.",
    "en": "We sent you the payment link by e-mail. The link is valid for 6 days, and we send a reminder on the third day. If the payment has not arrived by then, we close the order."
  },
  {
    "key": "guestOrder.payment.paid.label",
    "group": "rendeles-allapota",
    "hu": "Kifizetve",
    "en": "Paid"
  },
  {
    "key": "guestOrder.payment.paid.text",
    "group": "rendeles-allapota",
    "hu": "A fizetés megérkezett.",
    "en": "The payment has arrived."
  },
  {
    "key": "guestOrder.payment.refunded.label",
    "group": "rendeles-allapota",
    "hu": "Visszatérítve",
    "en": "Refunded"
  },
  {
    "key": "guestOrder.payment.refunded.text",
    "group": "rendeles-allapota",
    "hu": "A visszatérítés megtörtént. Hogy a bankod mikor írja jóvá a számládon, az a banktól függ.",
    "en": "The refund has been made. When your bank credits it to your account depends on your bank."
  },
  {
    "key": "guestOrder.payment.partiallyRefunded.label",
    "group": "rendeles-allapota",
    "hu": "Részben visszatérítve",
    "en": "Partly refunded"
  },
  {
    "key": "guestOrder.payment.partiallyRefunded.text",
    "group": "rendeles-allapota",
    "hu": "A visszatérítés egy része megtörtént. Hogy a bankod mikor írja jóvá a számládon, az a banktól függ.",
    "en": "Part of the refund has been made. When your bank credits it to your account depends on your bank."
  },
  {
    "key": "guestOrder.invoice.button",
    "group": "rendeles-allapota",
    "hu": "Számla letöltése",
    "en": "Download invoice"
  },
  {
    "key": "guestOrder.invoice.searching",
    "group": "rendeles-allapota",
    "hu": "Számla keresése…",
    "en": "Looking for the invoice…"
  },
  {
    "key": "guestOrder.invoice.none",
    "group": "rendeles-allapota",
    "hu": "A számla még nem készült el. A számlát a csomag feladásakor állítjuk ki, előre utalásnál a kifizetéskor. Amint elkészül, itt tölthető le.",
    "en": "The invoice is not ready yet. We issue it when the parcel is dispatched, or when the payment arrives for a bank transfer. You will be able to download it here as soon as it is."
  },
  {
    "key": "guestOrder.invoice.error",
    "group": "rendeles-allapota",
    "hu": "A számlát most nem tudjuk letölteni. Próbáld újra később, vagy írj nekünk.",
    "en": "We cannot download the invoice right now. Please try again later, or write to us."
  },
  {
    "key": "guestOrder.invoice.typeInvoice",
    "group": "rendeles-allapota",
    "hu": "Számla",
    "en": "Invoice"
  },
  {
    "key": "guestOrder.invoice.typeAdvance",
    "group": "rendeles-allapota",
    "hu": "Előlegszámla",
    "en": "Advance invoice"
  },
  {
    "key": "guestOrder.invoice.typeFinal",
    "group": "rendeles-allapota",
    "hu": "Végszámla",
    "en": "Final invoice"
  },
  {
    "key": "guestOrder.invoice.typeCorrection",
    "group": "rendeles-allapota",
    "hu": "Helyesbítő számla",
    "en": "Correction invoice"
  },
  {
    "key": "guestOrder.invoice.download",
    "group": "rendeles-allapota",
    "hu": "{type} letöltése: {number}",
    "en": "Download {type}: {number}"
  },
  {
    "key": "guestOrder.invoice.downloadNoNumber",
    "group": "rendeles-allapota",
    "hu": "{type} letöltése",
    "en": "Download {type}"
  },
  {
    "key": "guestOrder.problem.openButton",
    "group": "hibabejelentes",
    "hu": "Probléma a szállítmánnyal",
    "en": "Problem with the shipment"
  },
  {
    "key": "guestOrder.problem.title",
    "group": "hibabejelentes",
    "hu": "Probléma a szállítmánnyal",
    "en": "Problem with the shipment"
  },
  {
    "key": "guestOrder.problem.intro",
    "group": "hibabejelentes",
    "hu": "Írd le, mi történt, és ha tudsz, csatolj fényképet. Minél előbb jelzed, annál gyorsabban tudunk segíteni.",
    "en": "Tell us what happened and, if you can, attach a photo. The sooner you report it, the faster we can help."
  },
  {
    "key": "guestOrder.problem.itemsLabel",
    "group": "hibabejelentes",
    "hu": "Melyik terméket érinti?",
    "en": "Which product is affected?"
  },
  {
    "key": "guestOrder.problem.kindLabel",
    "group": "hibabejelentes",
    "hu": "Mi a probléma?",
    "en": "What is the problem?"
  },
  {
    "key": "guestOrder.problem.kindPlaceholder",
    "group": "hibabejelentes",
    "hu": "Válassz…",
    "en": "Choose…"
  },
  {
    "key": "guestOrder.problem.kindAnimalDead",
    "group": "hibabejelentes",
    "hu": "Az állat elpusztult",
    "en": "The animal died"
  },
  {
    "key": "guestOrder.problem.kindAnimalHurt",
    "group": "hibabejelentes",
    "hu": "Az állat sérült vagy beteg",
    "en": "The animal is injured or ill"
  },
  {
    "key": "guestOrder.problem.kindItemDamaged",
    "group": "hibabejelentes",
    "hu": "A termék sérült vagy hibás",
    "en": "The product is damaged or faulty"
  },
  {
    "key": "guestOrder.problem.kindItemMissing",
    "group": "hibabejelentes",
    "hu": "Hiányzik egy tétel",
    "en": "An item is missing"
  },
  {
    "key": "guestOrder.problem.kindOther",
    "group": "hibabejelentes",
    "hu": "Más",
    "en": "Something else"
  },
  {
    "key": "guestOrder.problem.receivedLabel",
    "group": "hibabejelentes",
    "hu": "Mikor vetted át a csomagot?",
    "en": "When did you receive the parcel?"
  },
  {
    "key": "guestOrder.problem.descriptionLabel",
    "group": "hibabejelentes",
    "hu": "Mi történt pontosan?",
    "en": "What exactly happened?"
  },
  {
    "key": "guestOrder.problem.descriptionHelp",
    "group": "hibabejelentes",
    "hu": "Röviden írd le, mit látsz.",
    "en": "Briefly describe what you see."
  },
  {
    "key": "guestOrder.problem.phoneLabel",
    "group": "hibabejelentes",
    "hu": "Telefonszám (nem kötelező)",
    "en": "Phone number (optional)"
  },
  {
    "key": "guestOrder.problem.phoneHelp",
    "group": "hibabejelentes",
    "hu": "Ha gyorsabban tudunk segíteni telefonon, itt érhetünk el.",
    "en": "If we can help faster by phone, this is where we can reach you."
  },
  {
    "key": "guestOrder.problem.photosLabel",
    "group": "hibabejelentes",
    "hu": "Fényképek",
    "en": "Photos"
  },
  {
    "key": "guestOrder.problem.photosHelp",
    "group": "hibabejelentes",
    "hu": "Az állatról és a csomagolásról is készíts képet, lehetőleg jó fényben.",
    "en": "Take a picture of the animal and of the packaging too, in good light if possible."
  },
  {
    "key": "guestOrder.problem.addPhoto",
    "group": "hibabejelentes",
    "hu": "Kép hozzáadása",
    "en": "Add a photo"
  },
  {
    "key": "guestOrder.problem.removePhoto",
    "group": "hibabejelentes",
    "hu": "Eltávolítás",
    "en": "Remove"
  },
  {
    "key": "guestOrder.problem.photoErrorSize",
    "group": "hibabejelentes",
    "hu": "Ez a fájl túl nagy. A legnagyobb engedélyezett méret: 5 MB.",
    "en": "This file is too large. The largest allowed size is 5 MB."
  },
  {
    "key": "guestOrder.problem.photoErrorType",
    "group": "hibabejelentes",
    "hu": "Ez a fájltípus nem támogatott. Használj JPG vagy PNG képet.",
    "en": "This file type is not supported. Use a JPG or PNG picture."
  },
  {
    "key": "guestOrder.problem.photoErrorCount",
    "group": "hibabejelentes",
    "hu": "Legfeljebb 5 képet csatolhatsz.",
    "en": "You can attach at most 5 pictures."
  },
  {
    "key": "guestOrder.problem.photoErrorUpload",
    "group": "hibabejelentes",
    "hu": "A(z) {name} képet nem tudtuk feltölteni.",
    "en": "We could not upload the picture {name}."
  },
  {
    "key": "guestOrder.problem.submit",
    "group": "hibabejelentes",
    "hu": "Bejelentés elküldése",
    "en": "Send the report"
  },
  {
    "key": "guestOrder.problem.sending",
    "group": "hibabejelentes",
    "hu": "Küldés…",
    "en": "Sending…"
  },
  {
    "key": "guestOrder.problem.close",
    "group": "hibabejelentes",
    "hu": "Bezárás",
    "en": "Close"
  },
  {
    "key": "guestOrder.problem.errorItems",
    "group": "hibabejelentes",
    "hu": "Jelöld meg legalább egy terméket.",
    "en": "Mark at least one product."
  },
  {
    "key": "guestOrder.problem.errorKind",
    "group": "hibabejelentes",
    "hu": "Válaszd ki, mi a probléma.",
    "en": "Choose what the problem is."
  },
  {
    "key": "guestOrder.problem.errorDescription",
    "group": "hibabejelentes",
    "hu": "Írd le röviden, mi történt.",
    "en": "Please describe briefly what happened."
  },
  {
    "key": "guestOrder.problem.errorPhone",
    "group": "hibabejelentes",
    "hu": "A telefonszám csak számjegyet, szóközt, plusz- és kötőjelet tartalmazhat.",
    "en": "The phone number may contain only digits, spaces, plus and hyphen signs."
  },
  {
    "key": "guestOrder.problem.errorDuplicate",
    "group": "hibabejelentes",
    "hu": "Erről a problémáról már van bejelentésed. Az ügy azonosítóját a rendelésed alatt, a „Már leadott bejelentéseid” részben találod.",
    "en": "You have already reported this problem. You can find its case reference under your order, in \"Reports you have already filed\"."
  },
  {
    "key": "guestOrder.problem.errorSend",
    "group": "hibabejelentes",
    "hu": "A bejelentést most nem tudtuk elküldeni. A beírt adataid megmaradtak, próbáld újra. Ha nem sikerül, írj nekünk: webshop@acropora.hu.",
    "en": "We could not send the report right now. What you entered is kept, please try again. If it still does not work, write to us: webshop@acropora.hu."
  },
  {
    "key": "guestOrder.problem.reportsTitle",
    "group": "hibabejelentes",
    "hu": "Már leadott bejelentéseid",
    "en": "Reports you have already filed"
  },
  {
    "key": "guestOrder.problem.reportRef",
    "group": "hibabejelentes",
    "hu": "Ügy azonosítója: {id}",
    "en": "Case reference: {id}"
  },
  {
    "key": "guestOrder.problem.stageReceived",
    "group": "hibabejelentes",
    "hu": "Beérkezett",
    "en": "Received"
  },
  {
    "key": "guestOrder.problem.stageInProgress",
    "group": "hibabejelentes",
    "hu": "Átvette a csapatunk",
    "en": "Taken over by our team"
  },
  {
    "key": "guestOrder.problem.done",
    "group": "hibabejelentes",
    "hu": "Megkaptuk a bejelentésedet. Az ügy azonosítója: {id}. 2 munkanapon belül jelentkezünk.",
    "en": "We have received your report. The case reference is {id}. We will get back to you within 2 working days."
  },
  {
    "key": "guestOrder.withdrawal.openButton",
    "group": "elallas",
    "hu": "Elállás a szerződéstől",
    "en": "Withdraw from the contract"
  },
  {
    "key": "guestOrder.withdrawal.title",
    "group": "elallas",
    "hu": "Elállás a szerződéstől",
    "en": "Withdraw from the contract"
  },
  {
    "key": "guestOrder.withdrawal.itemsLabel",
    "group": "elallas",
    "hu": "Melyik termékektől állsz el?",
    "en": "Which products do you withdraw from?"
  },
  {
    "key": "guestOrder.withdrawal.nameLabel",
    "group": "elallas",
    "hu": "A neved",
    "en": "Your name"
  },
  {
    "key": "guestOrder.withdrawal.nameHelp",
    "group": "elallas",
    "hu": "Ezzel a névvel adod le az elállási nyilatkozatot.",
    "en": "You make the withdrawal declaration under this name."
  },
  {
    "key": "guestOrder.withdrawal.next",
    "group": "elallas",
    "hu": "Tovább a megerősítéshez",
    "en": "Continue to confirmation"
  },
  {
    "key": "guestOrder.withdrawal.confirmTitle",
    "group": "elallas",
    "hu": "Ellenőrizd a nyilatkozatot",
    "en": "Check your declaration"
  },
  {
    "key": "guestOrder.withdrawal.confirmText",
    "group": "elallas",
    "hu": "Ezzel kijelented, hogy elállsz a szerződéstől a(z) {number} számú rendelés következő termékeinél:",
    "en": "With this you declare that you withdraw from the contract for the following products of order {number}:"
  },
  {
    "key": "guestOrder.withdrawal.confirmName",
    "group": "elallas",
    "hu": "A nyilatkozat neve: {name}",
    "en": "Name on the declaration: {name}"
  },
  {
    "key": "guestOrder.withdrawal.confirmButton",
    "group": "elallas",
    "hu": "Elállás megerősítése",
    "en": "Confirm withdrawal"
  },
  {
    "key": "guestOrder.withdrawal.back",
    "group": "elallas",
    "hu": "Vissza a szerkesztéshez",
    "en": "Back to editing"
  },
  {
    "key": "guestOrder.withdrawal.sending",
    "group": "elallas",
    "hu": "Küldés…",
    "en": "Sending…"
  },
  {
    "key": "guestOrder.withdrawal.close",
    "group": "elallas",
    "hu": "Bezárás",
    "en": "Close"
  },
  {
    "key": "guestOrder.withdrawal.errorItems",
    "group": "elallas",
    "hu": "Jelölj meg legalább egy terméket.",
    "en": "Mark at least one product."
  },
  {
    "key": "guestOrder.withdrawal.errorName",
    "group": "elallas",
    "hu": "Add meg a nevedet.",
    "en": "Enter your name."
  },
  {
    "key": "guestOrder.withdrawal.errorDuplicate",
    "group": "elallas",
    "hu": "A kijelölt tételekről már van elállási nyilatkozatod. Az azonosítóját a rendelésed alatt, a „Már leadott elállási nyilatkozataid” részben találod.",
    "en": "There is already a withdrawal declaration for the products you marked. You will find its reference under your order, in the “Withdrawal declarations you have already made” section."
  },
  {
    "key": "guestOrder.withdrawal.errorUnknown",
    "group": "elallas",
    "hu": "Az elállási nyilatkozat elküldése közben hiba történt, és nem tudjuk, megérkezett-e. Nézd meg a rendelésed alatt a „Már leadott elállási nyilatkozataid” részt: ha ott megjelenik, nincs több teendőd. Ha nem, próbáld újra, vagy írj nekünk: webshop@acropora.hu.",
    "en": "Something went wrong while sending the withdrawal declaration, and we do not know whether it arrived. Look under your order at “Withdrawal declarations you have already made”: if it is listed there, there is nothing more to do. If not, try again or write to us: webshop@acropora.hu."
  },
  {
    "key": "guestOrder.withdrawal.errorSend",
    "group": "elallas",
    "hu": "Az elállási nyilatkozatot most nem tudtuk elküldeni. A beírt adataid megmaradtak, próbáld újra. Ha nem sikerül, írj nekünk: webshop@acropora.hu.",
    "en": "We could not send the withdrawal declaration just now. What you typed has been kept, please try again. If it still fails, write to us: webshop@acropora.hu."
  },
  {
    "key": "guestOrder.withdrawal.done",
    "group": "elallas",
    "hu": "Megkaptuk az elállási nyilatkozatodat. Az azonosítója: {id}. Az átvételét e-mailben is visszaigazoljuk. A terméket a nyilatkozattól számított 14 napon belül küldd vissza nekünk; a határidőt megtartod, ha addig feladod. A visszaküldés közvetlen költségét te viseled; utánvéttel vagy portósan feladott csomagot nem tudunk átvenni. A kifizetett összeget a szállítási díjjal együtt a nyilatkozat beérkezésétől számított 14 napon belül visszautaljuk, ugyanazzal a fizetési móddal, amellyel fizettél, többletköltség nélkül. A szállítási díjat a legolcsóbb szállítási mód díjáig térítjük vissza. A visszautalást addig visszatarthatjuk, amíg a termék vissza nem érkezik hozzánk, vagy amíg nem igazolod, hogy feladtad.",
    "en": "We have received your withdrawal declaration. Its reference is {id}. We will also confirm its receipt by e-mail. Please send the product back to us within 14 days of your declaration; you meet the deadline if you send it before it ends. You bear the direct cost of returning it; we cannot accept a parcel sent cash on delivery or with postage due. We will refund what you paid, including the delivery fee, within 14 days of receiving your declaration, by the payment method you used, at no extra cost. The delivery fee is refunded up to the fee of the cheapest delivery option. We may withhold the refund until the product is back with us or you show that you have sent it."
  },
  {
    "key": "guestOrder.withdrawal.donePartial",
    "group": "elallas",
    "hu": "Ezekről a tételekről korábban már leadtál nyilatkozatot, ezeket nem rögzítettük újra: {items}",
    "en": "You have already made a declaration for these products, so they were not recorded again: {items}"
  },
  {
    "key": "guestOrder.withdrawal.listTitle",
    "group": "elallas",
    "hu": "Már leadott elállási nyilatkozataid",
    "en": "Withdrawal declarations you have already made"
  },
  {
    "key": "guestOrder.withdrawal.listRef",
    "group": "elallas",
    "hu": "Azonosító: {id}",
    "en": "Reference: {id}"
  }
]
