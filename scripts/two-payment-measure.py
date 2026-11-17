#!/usr/bin/env python3
"""Makes a TEST order with a card hold plus a difference paid through the payment link, then refunds part of the difference, and reads the
state after each step (commerce card c46502c8, task t-20261117-ketfizetesu-meres; docs/TEST-TWO-PAYMENT-MEASUREMENT.md).

It measures what the one-payment refund test (docs/TEST-REFUND-MEASUREMENT.md) cannot: `loadSide` sums what the OTHER live payments still cover
(captures minus refunds), and that is 0 on an order with one live payment. Standard library only. Every call goes to the test showcase's own
routes and to the Stripe TEST API; no browser, no Coolify task, no new endpoint.

  python3 scripts/two-payment-measure.py keys                         public keys from the test storefront (needs STAGE_BASIC_AUTH)
  python3 scripts/two-payment-measure.py plan                         reads only (plus one probe that cannot write): says what would run
  python3 scripts/two-payment-measure.py hold       --execute         step 1-2: cart, ASZF record, card hold, order            -> order id
  python3 scripts/two-payment-measure.py difference --execute --order order_01...   step 3-6: edit above the hold, link, pay the difference
  python3 scripts/two-payment-measure.py refund     --execute --order order_01... [--amount 100]   step 7: refund part of the difference
  python3 scripts/two-payment-measure.py state      --order order_01...             reads and judges the order's state
  python3 scripts/two-payment-measure.py all        --execute [--amount 100]        the three write steps in a row

Settings come from the ENVIRONMENT, never from arguments (an argument shows in the process list):
  MEDUSA_STAGE_ADMIN_KEY     the test showcase's admin secret API key (secret; the runner loads it from its file)
  MEDUSA_PUBLISHABLE_KEY     the Store API publishable key (public: it is in the storefront's bundle)
  STRIPE_PUBLISHABLE_KEY     the Stripe TEST publishable key, pk_test_... (public: it is in the storefront's bundle)
  STAGE_BASIC_AUTH           user:password of the storefront's HTTP basic auth (only `keys`, only to the storefront host)

REFUSALS, before anything is written: a backend that is not the test showcase host; a Stripe key that is not pk_test_; a Medusa publishable key that
looks like a Stripe key; a missing admin key; a write command without --execute (it prints what it WOULD do). No redirect is followed, so a
credential never travels to another host. The output carries ids, amounts and statuses: never a key, a client secret or a link token.
"""

from __future__ import annotations

import argparse
import base64
import importlib.util
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

BACKEND_HOSTS = ("commerce-stage.acropora.hu",)
STOREFRONT_HOST = "shop-staging.acropora.hu"
DEFAULT_BASE = "https://commerce-stage.acropora.hu"
DEFAULT_STOREFRONT = "https://shop-staging.acropora.hu"
TEST_EMAIL = "ketfizetesu-teszt@example.com"
TEST_CARD = "pm_card_visa"
ASZF_VERSIONS = ("teszt-mod", "unas-shop-2026-09-29")
ORDER_ID = re.compile(r"^order_[A-Za-z0-9]+$")
STRIPE_PK = re.compile(r"^pk_test_[A-Za-z0-9]{16,}$")
MEDUSA_PK = re.compile(r"^pk_[A-Za-z0-9]{16,}$")
NO_SUCH_ORDER = "order_01NOSUCHORDERFORPROBE0000"

_HELPER_SPEC = importlib.util.spec_from_file_location("refund_helper", pathlib.Path(__file__).with_name("refund-measure-helper.py"))
helper = importlib.util.module_from_spec(_HELPER_SPEC)
_HELPER_SPEC.loader.exec_module(helper)  # type: ignore[union-attr]


class MeasureError(Exception):
    """A refusal or a failed step: the message is safe to print."""


class Reply:
    def __init__(self, status: int, body: Any, text: str) -> None:
        self.status, self.body, self.text = status, body, text


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:  # a credential must never follow a redirect to another host
        return None


class Http:
    """The one place that touches the network (tests give another object with the same `request`)."""

    def __init__(self) -> None:
        self.opener = urllib.request.build_opener(_NoRedirect)

    def request(self, method: str, url: str, headers: dict[str, str] | None = None, json_body: Any = None, form: dict[str, str] | None = None) -> Reply:
        data = None
        head = {"user-agent": "acropora-two-payment-measure/1", **(headers or {})}
        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            head["content-type"] = "application/json"
        elif form is not None:
            data = urllib.parse.urlencode(form).encode("utf-8")
            head["content-type"] = "application/x-www-form-urlencoded"
        request = urllib.request.Request(url, data=data, method=method, headers=head)
        try:
            with self.opener.open(request, timeout=30) as response:
                status, raw = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read()
        except urllib.error.URLError as error:
            raise MeasureError(f"{method} {urllib.parse.urlsplit(url).netloc}: {error.reason}") from None
        text = raw.decode("utf-8", errors="replace")
        try:
            body = json.loads(text)
        except ValueError:
            body = None
        return Reply(status, body, text)


# ---- pure rules -----------------------------------------------------------------------------------------------------------------------------


def check_base(base: str) -> str:
    parts = urllib.parse.urlsplit(base)
    if parts.scheme != "https" or parts.hostname not in BACKEND_HOSTS or parts.port or parts.username or parts.path.strip("/"):
        raise MeasureError(f"the backend must be https://{BACKEND_HOSTS[0]} (the test showcase), not {parts.hostname or base!r}: nothing is written elsewhere")
    return f"https://{parts.hostname}"


def check_settings(env: dict[str, str]) -> dict[str, str]:
    admin = env.get("MEDUSA_STAGE_ADMIN_KEY", "").strip()
    publishable = env.get("MEDUSA_PUBLISHABLE_KEY", "").strip()
    stripe = env.get("STRIPE_PUBLISHABLE_KEY", "").strip()
    missing = [name for name, value in (("MEDUSA_STAGE_ADMIN_KEY", admin), ("MEDUSA_PUBLISHABLE_KEY", publishable), ("STRIPE_PUBLISHABLE_KEY", stripe)) if not value]
    if missing:
        raise MeasureError("missing environment variable(s): " + ", ".join(missing))
    if not STRIPE_PK.match(stripe):
        raise MeasureError("STRIPE_PUBLISHABLE_KEY must be a Stripe TEST publishable key (pk_test_...): a live key is refused")
    if publishable.startswith("pk_test_") or not MEDUSA_PK.match(publishable):
        raise MeasureError("MEDUSA_PUBLISHABLE_KEY must be the Medusa publishable API key (pk_ and hex), not a Stripe key")
    if re.search(r"\s", admin):
        raise MeasureError("MEDUSA_STAGE_ADMIN_KEY has white space in it")
    return {"admin": admin, "publishable": publishable, "stripe": stripe}


def candidates(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Buyable variants with a price: no stock management, or stock left."""
    out: list[dict[str, Any]] = []
    for product in products:
        for variant in product.get("variants") or []:
            price = (variant.get("calculated_price") or {}).get("calculated_amount")
            stock = variant.get("inventory_quantity")
            if not isinstance(price, (int, float)) or isinstance(price, bool) or price <= 0:
                continue
            managed = bool(variant.get("manage_inventory"))
            if managed and not (isinstance(stock, (int, float)) and stock > 0):
                continue
            out.append({"id": variant.get("id"), "price": price, "stock": stock if managed else None})
    return out


def choose_variants(cands: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    """The variant of the held cart and the variant the edit adds (another one when there is one; the same needs stock for two)."""
    if not cands:
        raise MeasureError("no buyable variant with a price in the first products: nothing to order")
    first = cands[0]
    other = next((c for c in cands[1:] if c["id"] != first["id"]), None)
    if other is None:
        if first["stock"] is not None and first["stock"] < 2:
            raise MeasureError("only one buyable variant, and its stock is below 2: the edit has nothing to add")
        other = first
    return first, other


def payment_token(url: str) -> str:
    """The token of `<storefront>/<country>/rendeles-fizetese/<token>` (payment-link.ts paymentLinkUrl; the token is `<base64url>.<base64url>`)."""
    found = re.search(r"/[a-z]{2}/rendeles-fizetese/([A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})$", urllib.parse.urlsplit(url).path)
    if not found:
        raise MeasureError("the payment link is not <storefront>/<country>/rendeles-fizetese/<token>")
    return found.group(1)


def intent_id(client_secret: str) -> str:
    head, sep, _ = client_secret.partition("_secret_")
    if not sep or not head.startswith("pi_"):
        raise MeasureError("the client secret does not look like a PaymentIntent's")
    return head


def judge(state: dict[str, Any], difference: int | None = None, refunded: int = 0) -> list[tuple[str, str]]:
    """What the state of a hold + difference order says. Pairs of (OK|FAIL|NOTE, text). `difference` is what the link asked for."""
    out: list[tuple[str, str]] = []

    def check(ok: bool, text: str) -> None:
        out.append(("OK" if ok else "FAIL", text))

    readout = state.get("readout") or {}
    live = helper.live_payments(readout)
    check(len(live) == 2, f"live payments: {len(live)} (two expected: the hold and the difference)")
    holds = [p for p in live if not p.get("captured_total")]
    paid = [p for p in live if p.get("captured_total")]
    if len(live) != 2 or len(holds) != 1 or len(paid) != 1:
        out.append(("FAIL", f"cannot tell the hold from the difference ({len(holds)} uncaptured, {len(paid)} captured): the rest is not judged"))
        return out
    hold, diff = holds[0], paid[0]
    out.append(("NOTE", f"hold {hold.get('id')} (captured 0), difference {diff.get('id')} (captured {diff.get('captured_total')}, refunded {diff.get('refunded_total')})"))
    if difference is not None:
        check(diff.get("captured_total") == difference, f"the difference payment captured {diff.get('captured_total')}, the link asked {difference}")
    expected = (diff.get("captured_total") or 0) - (diff.get("refunded_total") or 0)
    other = (state.get("side") or {}).get("other_captured")
    check(other == expected, f"other_captured {other}, expected {expected} (the difference's captures less its refunds)")
    if difference is not None and refunded:
        check(other == difference - refunded, f"other_captured {other} = difference {difference} less the refund {refunded}")
    if refunded:
        check(diff.get("refunded_total") == refunded, f"refunded_total of the difference payment {diff.get('refunded_total')}, booked {refunded}")
        check(diff.get("refunds_field") == "present", f"refunds field is {diff.get('refunds_field')} (present = Medusa resolves the refunds)")
        refunds = diff.get("refunds") or []
        check(bool(refunds) and all(r.get("finite") for r in refunds), "refund amounts are finite numbers")
        reading = next((p.get("stripe_refunds") for p in state.get("payments") or [] if p.get("payment_id") == diff.get("id")), None)
        if reading is None:
            out.append(("NOTE", "no stripe_refunds section for the difference payment: the Stripe side was not read"))
        else:
            listed = reading.get("refunds") or []
            check(bool(listed) and all(r.get("status") == "succeeded" for r in listed), "Stripe refunds: " + (", ".join(f"{r.get('status')} {r.get('amount')}" for r in listed) or "none"))
    findings = readout.get("findings") or []
    check(not findings, "findings: " + ("none" if not findings else "; ".join(findings)))
    return out


def extract_keys(texts: list[str]) -> dict[str, list[str]]:
    joined = "\n".join(texts)
    return {
        "stripe": sorted(set(re.findall(r"pk_test_[A-Za-z0-9]{16,}", joined))),
        "medusa": sorted(set(re.findall(r"(?<![A-Za-z0-9_])pk_[a-f0-9]{64}(?![A-Za-z0-9])", joined))),
    }


def script_paths(html: str) -> list[str]:
    return sorted(set(re.findall(r"[\"'](/_next/static/[^\"'\\ ]+\.js)[\"']", html)))


# ---- the calls ------------------------------------------------------------------------------------------------------------------------------


class Shop:
    def __init__(self, http: Any, base: str, settings: dict[str, str]) -> None:
        self.http, self.base, self.s = http, base, settings
        self.secrets = {settings["admin"]}

    def scrub(self, text: str) -> str:
        for secret in self.secrets:
            text = text.replace(secret, "***")
        return text

    def _check(self, reply: Reply, what: str, ok: tuple[int, ...] = (200, 201)) -> Reply:
        if reply.status in ok:
            return reply
        body = reply.body if isinstance(reply.body, dict) else {}
        said = body.get("message") or reply.text[:160]
        code = f" [{body['code']}]" if body.get("code") else ""
        raise MeasureError(self.scrub(f"{what}: HTTP {reply.status}{code} {str(said)[:200]}"))

    def store(self, method: str, path: str, what: str, body: Any = None, ok: tuple[int, ...] = (200, 201)) -> Reply:
        reply = self.http.request(method, self.base + path, {"x-publishable-api-key": self.s["publishable"]}, json_body=body)
        return self._check(reply, what, ok)

    def admin(self, method: str, path: str, what: str, body: Any = None, ok: tuple[int, ...] = (200, 201)) -> Reply:
        auth = "Basic " + base64.b64encode((self.s["admin"] + ":").encode()).decode()
        reply = self.http.request(method, self.base + path, {"authorization": auth}, json_body=body)
        return self._check(reply, what, ok)

    def confirm_card(self, client_secret: str, what: str) -> str:
        """What Stripe.js does: confirm the intent with the publishable key, the client secret and the Stripe test card."""
        self.secrets.add(client_secret)
        reply = self.http.request(
            "POST",
            f"https://api.stripe.com/v1/payment_intents/{intent_id(client_secret)}/confirm",
            None,
            form={"key": self.s["stripe"], "client_secret": client_secret, "payment_method": TEST_CARD, "return_url": DEFAULT_STOREFRONT + "/"},
        )
        if reply.status != 200 or not isinstance(reply.body, dict):
            error = (reply.body or {}).get("error", {}) if isinstance(reply.body, dict) else {}
            raise MeasureError(self.scrub(f"{what}: Stripe HTTP {reply.status} {error.get('code') or ''} {str(error.get('message') or '')[:160]}"))
        status = str(reply.body.get("status"))
        if status not in ("requires_capture", "succeeded"):
            raise MeasureError(f"{what}: the intent is {status}, not requires_capture")
        return status

    def state(self, order_id: str) -> dict[str, Any]:
        reply = self.admin("GET", f"/admin/refund-measure?order_id={order_id}", "read the order state")
        sections = helper.parse_answer(reply.text) or []
        found = next((value for name, value in sections if name == "state"), None)
        if found is None:
            raise MeasureError("the state route answered without a state section")
        return found


def say(text: str) -> None:
    print(text, flush=True)


def show(lines: list[tuple[str, str]]) -> bool:
    for level, text in lines:
        say(f"  {level:<4} {text}")
    return all(level != "FAIL" for level, _ in lines)


def catalog(shop: Shop) -> tuple[str, dict[str, Any], dict[str, Any]]:
    regions = shop.store("GET", "/store/regions", "regions").body.get("regions") or []
    region = next((r for r in regions if any(c.get("iso_2") == "hu" for c in r.get("countries") or [])), regions[0] if regions else None)
    if not region:
        raise MeasureError("the shop has no region")
    query = f"limit=200&region_id={region['id']}&order=handle&fields=handle,*variants,*variants.calculated_price,%2Bvariants.inventory_quantity"
    products = shop.store("GET", f"/store/products?{query}", "products").body.get("products") or []
    hold, edit = choose_variants(candidates(products))
    return region["id"], hold, edit


def step_plan(shop: Shop) -> bool:
    ok = True
    say("PLAN (reads, plus one probe that cannot write: a payment link for an order that does not exist)")
    listed = shop.admin("GET", "/admin/refund-measure?limit=1", "admin key and Stripe test key check")
    sections = helper.parse_answer(listed.text) or []
    test_key = next((v.get("test_key") for n, v in sections if n == "list"), None)
    ok &= show([("OK" if test_key is True else "FAIL", f"admin key works; the backend holds a Stripe TEST key: {test_key}")])
    _region, hold, edit = catalog(shop)
    ok &= show([("OK", f"hold variant {hold['id']} price {hold['price']}; edit variant {edit['id']} price {edit['price']}")])
    probe = shop.http.request("POST", f"{shop.base}/admin/order-payment/{NO_SUCH_ORDER}/payment-link", {"authorization": "Basic " + base64.b64encode((shop.s["admin"] + ":").encode()).decode()}, json_body={"notify_customer": False})
    message = str((probe.body or {}).get("message", "")) if isinstance(probe.body, dict) else ""
    if "nincs beállítva" in message:
        ok &= show([("FAIL", "the payment link is not configured on the backend (ACROPORA_PAYMENT_LINK_SECRET / ACROPORA_STOREFRONT_URL): step 4 would fail")])
    else:
        ok &= show([("OK", f"the payment link setting is there (the probe reached the order lookup: HTTP {probe.status})")])
    say("WOULD RUN (with --execute): 1 cart and ASZF record, 2 card hold (Stripe confirm) and order, 3 edit above the hold, 4 payment link, 5 pay the difference, 6 read, 7 refund and read")
    say("NOT MEASURED here: the ASZF version the server records (tried: " + ", ".join(ASZF_VERSIONS) + "), the checkout and shipping-option sequence on the live backend, the Stripe confirm with the test card.")
    return ok


def build_cart(shop: Shop, region_id: str, variant: dict[str, Any], aszf: tuple[str, ...]) -> str:
    cart_id = shop.store("POST", "/store/carts", "create cart", {"region_id": region_id}).body["cart"]["id"]
    shop.store("POST", f"/store/carts/{cart_id}/line-items", "add the line", {"variant_id": variant["id"], "quantity": 1})
    address = {"first_name": "Teszt", "last_name": "Ketfizetes", "address_1": "Teszt utca 1.", "city": "Budapest", "postal_code": "1111", "phone": "+36301234567", "country_code": "hu"}
    shop.store("POST", f"/store/carts/{cart_id}", "set email and address", {"email": TEST_EMAIL, "shipping_address": address, "billing_address": address})
    options = shop.store("GET", f"/store/shipping-options?cart_id={cart_id}", "shipping options").body.get("shipping_options") or []
    last = ""
    for option in options:
        try:
            shop.store("POST", f"/store/carts/{cart_id}/shipping-methods", "set the shipping method", {"option_id": option["id"]})
            break
        except MeasureError as error:
            last = str(error)
    else:
        raise MeasureError("no shipping option was accepted" + (f" (last: {last})" if last else ""))
    for version in aszf:
        reply = shop.http.request("POST", f"{shop.base}/store/carts/{cart_id}/aszf-elfogadas", {"x-publishable-api-key": shop.s["publishable"]}, json_body={"elfogadom": True, "megjelenitett_verzio": version, "nyelv": "hu"})
        if reply.status in (200, 201):
            return cart_id
        if not (reply.status == 409 and isinstance(reply.body, dict) and reply.body.get("code") == "aszf_version_mismatch"):
            shop._check(reply, "ASZF acceptance")
    raise MeasureError("the server records another ASZF version than " + ", ".join(aszf) + ": pass --aszf-version <the version> (the fogyasztobarat-<shop id> form)")


def step_hold(shop: Shop, aszf: tuple[str, ...]) -> str:
    say("STEP 1-2: cart, card hold, order")
    region_id, hold, _edit = catalog(shop)
    cart_id = build_cart(shop, region_id, hold, aszf)
    started = shop.store("POST", f"/store/carts/{cart_id}/stripe-start", "start the card payment").body
    secret = started.get("client_secret")
    if not isinstance(secret, str):
        raise MeasureError("stripe-start gave no client secret")
    say(f"  OK   cart {cart_id}: card payment started, total {started.get('total')}")
    say(f"  OK   card confirmed on the intent: {shop.confirm_card(secret, 'confirm the hold')}")
    placed = shop.store("POST", f"/store/carts/{cart_id}/complete-split", "place the order").body
    orders = placed.get("orders") or []
    if len(orders) != 1:
        raise MeasureError(f"{len(orders)} orders were made, one expected (a pickup-only line splits the cart): orders {[o.get('id') for o in orders]}")
    order_id = orders[0]["id"]
    say(f"  OK   order {order_id} (#{orders[0].get('display_id')})")
    state = shop.state(order_id)
    live = helper.live_payments(state.get("readout") or {})
    uncaptured = len(live) == 1 and not live[0].get("captured_total")
    show([("OK" if uncaptured else "FAIL", f"one live payment, nothing captured (the hold): {len(live)} live")])
    say(f"ORDER {order_id}")
    if not uncaptured:
        raise MeasureError(f"{order_id} does not carry exactly one uncaptured payment: it is not a held order")
    return order_id


def only_hold(state: dict[str, Any]) -> bool:
    live = helper.live_payments(state.get("readout") or {})
    return len(live) == 1 and not live[0].get("captured_total")


def step_difference(shop: Shop, order_id: str) -> tuple[bool, int]:
    say("STEP 3-6: edit above the hold, payment link, pay the difference")
    _region, _hold, edit = catalog(shop)
    if not only_hold(shop.state(order_id)):
        raise MeasureError(f"{order_id} is not an order with one held payment and nothing captured: this step needs exactly that")
    shop.admin("POST", "/admin/order-edits", "begin the order edit", {"order_id": order_id, "description": "two-payment measurement (test)"})
    try:
        shop.admin("POST", f"/admin/order-edits/{order_id}/items", "add the item", {"items": [{"variant_id": edit["id"], "quantity": 1}]})
        shop.admin("POST", f"/admin/order-edits/{order_id}/request", "request the edit", {"no_notification": True})
        shop.admin("POST", f"/admin/order-edits/{order_id}/confirm", "confirm the edit (the hold must stay)")
    except MeasureError as error:
        raise MeasureError(f"{error}; an open edit may remain on {order_id}: DELETE /admin/order-edits/{order_id} cancels it") from None
    say(f"  OK   edit confirmed: variant {edit['id']} (price {edit['price']}) added above the hold")
    link = shop.admin("POST", f"/admin/order-payment/{order_id}/payment-link", "send the payment link", {"notify_customer": False}).body
    amount = (link.get("link") or {}).get("amount")
    if link.get("state") != "link_sent" or not isinstance(amount, int) or amount < 1:
        raise MeasureError(f"the payment link answer is not a sent difference link (state {link.get('state')}, amount {amount})")
    token = payment_token(str((link.get("link") or {}).get("url") or ""))
    shop.secrets.add(token)
    say(f"  OK   difference link sent (no mail), amount {amount}, expires {(link.get('link') or {}).get('expires_at')}")
    session = shop.store("POST", f"/store/order-payment/{token}/session", "open the link's payment session").body
    if session.get("amount") != amount or not isinstance(session.get("client_secret"), str):
        raise MeasureError(f"the link session asks {session.get('amount')} (link {amount}) or has no client secret")
    say(f"  OK   card confirmed on the difference intent: {shop.confirm_card(session['client_secret'], 'confirm the difference')}")
    done = shop.store("POST", f"/store/order-payment/{token}/complete", "complete the link payment").body
    say(f"  {'OK  ' if done.get('state') == 'paid' else 'FAIL'} link payment state: {done.get('state')}")
    ok = show(judge(shop.state(order_id), difference=amount)) and done.get("state") == "paid"
    return ok, amount


def step_refund(shop: Shop, order_id: str, amount: int) -> bool:
    say(f"STEP 7: refund {amount} of the difference payment")
    state = shop.state(order_id)
    live = helper.live_payments(state.get("readout") or {})
    paid = [p for p in live if p.get("captured_total")]
    if len(live) != 2 or len(paid) != 1:
        raise MeasureError(f"{order_id} has {len(live)} live payments and {len(paid)} captured: this step needs the hold and one paid difference")
    diff = paid[0]
    covered = (diff.get("captured_total") or 0) - (diff.get("refunded_total") or 0)
    if amount > covered:
        raise MeasureError(f"the difference payment {diff.get('id')} still covers {covered}: a refund of {amount} is refused here")
    shop.admin("POST", f"/admin/payments/{diff['id']}/refund", "refund the difference", {"amount": amount, "note": "two-payment measurement (test)"})
    say(f"  OK   refund booked on {diff['id']}")
    return show(judge(shop.state(order_id), difference=diff.get("captured_total"), refunded=(diff.get("refunded_total") or 0) + amount))


def step_state(shop: Shop, order_id: str) -> bool:
    say(f"STATE {order_id}")
    return show(judge(shop.state(order_id)))


def step_keys(http: Any, env: dict[str, str], storefront: str) -> bool:
    parts = urllib.parse.urlsplit(storefront)
    if parts.scheme != "https" or parts.hostname != STOREFRONT_HOST or parts.port or parts.path.strip("/"):
        raise MeasureError(f"the credential goes only to https://{STOREFRONT_HOST}")
    login = env.get("STAGE_BASIC_AUTH", "")
    if ":" not in login:
        raise MeasureError("STAGE_BASIC_AUTH must be user:password")
    head = {"authorization": "Basic " + base64.b64encode(login.encode()).decode()}
    base = f"https://{parts.hostname}"  # the validated host: the check above is what keeps the credential on the storefront
    texts: list[str] = []
    paths: set[str] = set()
    for page in ("/hu", "/hu/cart", "/hu/checkout"):
        reply = http.request("GET", base + page, head)
        if reply.status != 200:
            say(f"  NOTE {page}: HTTP {reply.status}")
            continue
        texts.append(reply.text)
        paths.update(script_paths(reply.text))
    for path in sorted(paths)[:80]:
        reply = http.request("GET", base + path, head)
        if reply.status == 200:
            texts.append(reply.text)
    found = extract_keys(texts)
    say(f"KEYS scanned {len(texts)} files ({len(paths)} scripts listed)")
    say("  Stripe test publishable key(s): " + (", ".join(found["stripe"]) or "none found"))
    say("  Medusa publishable key(s):      " + (", ".join(found["medusa"]) or "none found"))
    say("  (both are public: they ship in the storefront's code)")
    return bool(found["stripe"]) and bool(found["medusa"])


def main(argv: list[str], env: dict[str, str] | None = None, http: Any = None) -> int:
    env = dict(os.environ) if env is None else env
    http = http or Http()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("job", choices=["keys", "plan", "hold", "difference", "refund", "state", "all"])
    parser.add_argument("--execute", action="store_true", help="write on the test showcase (without it a write job only says what it would do)")
    parser.add_argument("--order")
    parser.add_argument("--amount", type=int, default=100, help="forints to refund from the difference (default 100)")
    parser.add_argument("--base", default=DEFAULT_BASE)
    parser.add_argument("--storefront", default=DEFAULT_STOREFRONT)
    parser.add_argument("--aszf-version", action="append", default=[], help="an ASZF version to try first (repeatable)")
    args = parser.parse_args(argv)
    writes = args.job in ("hold", "difference", "refund", "all")
    try:
        if args.job == "keys":
            return 0 if step_keys(http, env, args.storefront) else 1
        base = check_base(args.base)
        settings = check_settings(env)
        if args.job in ("difference", "refund", "state") and not ORDER_ID.match(args.order or ""):
            raise MeasureError("--order order_01... is needed")
        if args.amount < 1:
            raise MeasureError("--amount must be a whole number of at least 1")
        if writes and not args.execute:
            say(f"{args.job}: dry run, nothing is written. It would run against {base}; add --execute to run it.")
            return 0
    except MeasureError as error:
        print(f"refused: {error}", file=sys.stderr)
        return 2
    shop = Shop(http, base, settings)
    aszf = tuple(dict.fromkeys([*args.aszf_version, *ASZF_VERSIONS]))
    try:
        if args.job == "plan":
            ok = step_plan(shop)
        elif args.job == "state":
            ok = step_state(shop, args.order)
        elif args.job == "hold":
            step_hold(shop, aszf)
            ok = True
        elif args.job == "difference":
            ok, _ = step_difference(shop, args.order)
        elif args.job == "refund":
            ok = step_refund(shop, args.order, args.amount)
        else:
            order = step_hold(shop, aszf)
            ok, _ = step_difference(shop, order)
            ok = ok and step_refund(shop, order, args.amount)
    except MeasureError as error:
        print(f"FAILED: {shop.scrub(str(error))}", file=sys.stderr)
        say("RESULT FAIL")
        return 1
    say("RESULT " + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:], dict(os.environ)))
