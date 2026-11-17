"""Tests of scripts/two-payment-measure.py (task t-20261117-ketfizetesu-meres; commerce card c46502c8).

Run: cd <repo root> && python3 -m unittest scripts/test_two_payment_measure.py -v

WHAT TURNS RED: a backend other than the test showcase host (or one with a userinfo, port or path trick), a live or missing Stripe key, a Medusa key
that is a Stripe key, a write without --execute, a write call in `plan`, a credential or client secret or link token in the output (also inside an
error the server echoes), a redirect that is followed, the storefront's credential sent to another host, an order with one payment judged as a
two-payment order, a wrong other_captured read as fine, a failed Stripe refund read as fine, a cart that became two orders carried on, an edit
failure without the cancel hint. No test here holds a real key, token or id; the network is a fake that records every call.
"""

import contextlib
import importlib.util
import io
import json
import pathlib
import unittest
import urllib.request

SPEC = importlib.util.spec_from_file_location("two_payment", pathlib.Path(__file__).with_name("two-payment-measure.py"))
tp = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tp)

BASE = "https://commerce-stage.acropora.hu"
ADMIN = "sk_" + "a" * 24
MEDUSA_PK = "pk_" + "b" * 64
STRIPE_PK = "pk_test_" + "c" * 24
ENV = {"MEDUSA_STAGE_ADMIN_KEY": ADMIN, "MEDUSA_PUBLISHABLE_KEY": MEDUSA_PK, "STRIPE_PUBLISHABLE_KEY": STRIPE_PK}
HOLD_SECRET = "pi_hold_secret_HOLDSECRETVALUE"
DIFF_SECRET = "pi_diff_secret_DIFFSECRETVALUE"
TOKEN = "T" * 20 + "." + "U" * 20
ORDER = "order_01TESTORDER"


def pay(pid, captured=0, refunded=0, field=None):
    refunds = [{"type": "number", "value": refunded, "finite": True}] if refunded else []
    return {"id": pid, "canceled": False, "captured_total": captured, "refunded_total": refunded, "covered": max(0, captured - refunded),
            "refunds_field": field or ("present" if refunds else "empty"), "refunds": refunds}


def state(payments, other, findings=None, stripe=None):
    return {"order_id": ORDER, "readout": {"collections": [{"payments": payments}], "findings": findings or []}, "side": {"other_captured": other},
            "payments": stripe or []}


class Fake:
    """A scripted showcase: it keeps the order's progress and answers the routes the script calls."""

    def __init__(self, **flags):
        self.calls = []
        self.flags = flags
        self.stage = "none"  # none -> held -> edited -> paid -> refunded
        self.refunded = 0
        self.aszf_seen = []

    def reply(self, status, body):
        return tp.Reply(status, body, json.dumps(body))

    def request(self, method, url, headers=None, json_body=None, form=None):
        self.calls.append((method, url, dict(headers or {}), json_body, form))
        if url.startswith("https://api.stripe.com"):
            if self.flags.get("stripe_error"):
                return self.reply(402, {"error": {"code": "card_declined", "message": "declined " + ADMIN}})
            return self.reply(200, {"status": "requires_capture"})
        path = url[len(BASE):]
        if method == "GET" and path.startswith("/admin/refund-measure?limit"):
            return self.reply(200, {"sections": [{"section": "list", "value": {"test_key": not self.flags.get("live_key"), "orders": []}}]})
        if method == "GET" and path.startswith("/admin/refund-measure?order_id"):
            return self.reply(200, {"sections": [{"section": "state", "value": self.state()}]})
        if method == "GET" and path == "/store/regions":
            return self.reply(200, {"regions": [{"id": "reg_1", "countries": [{"iso_2": "hu"}]}]})
        if method == "GET" and path.startswith("/store/products"):
            variants = [{"id": "var_1", "manage_inventory": True, "inventory_quantity": 5, "calculated_price": {"calculated_amount": 4000}},
                        {"id": "var_2", "manage_inventory": False, "calculated_price": {"calculated_amount": 5000}}]
            return self.reply(200, {"products": [{"handle": "x", "variants": variants}]})
        if method == "POST" and path == "/store/carts":
            return self.reply(200, {"cart": {"id": "cart_1"}})
        if method == "POST" and path.startswith("/store/carts/cart_1") and path.endswith("/line-items"):
            return self.reply(200, {})
        if method == "POST" and path == "/store/carts/cart_1":
            return self.reply(200, {})
        if method == "GET" and path.startswith("/store/shipping-options"):
            return self.reply(200, {"shipping_options": [{"id": "so_1"}]})
        if method == "POST" and path.endswith("/shipping-methods"):
            return self.reply(200, {})
        if method == "POST" and path.endswith("/aszf-elfogadas"):
            self.aszf_seen.append(json_body["megjelenitett_verzio"])
            if json_body["megjelenitett_verzio"] in self.flags.get("aszf_ok", ("teszt-mod",)):
                return self.reply(200, {})
            return self.reply(409, {"code": "aszf_version_mismatch", "message": "mismatch"})
        if method == "POST" and path.endswith("/stripe-start"):
            return self.reply(200, {"client_secret": HOLD_SECRET, "total": 4000})
        if method == "POST" and path.endswith("/complete-split"):
            self.stage = "held"
            orders = [{"id": ORDER, "display_id": 77}] + ([{"id": "order_02", "display_id": 78}] if self.flags.get("two_orders") else [])
            return self.reply(200, {"orders": orders})
        if method == "POST" and path == "/admin/order-edits":
            return self.reply(200, {"order_change": {"id": "oc_1"}})
        if method == "POST" and path.endswith("/items"):
            return self.reply(200, {})
        if method == "POST" and path.endswith("/request"):
            return self.reply(200, {})
        if method == "POST" and path.endswith("/confirm"):
            if self.flags.get("confirm_refused"):
                return self.reply(400, {"type": "not_allowed", "message": "A szerkesztes elutasitva"})
            self.stage = "edited"
            return self.reply(200, {"order_preview": {}})
        if method == "POST" and path.endswith("/payment-link"):
            if path == f"/admin/order-payment/{tp.NO_SUCH_ORDER}/payment-link":
                if self.flags.get("no_link_config"):
                    return self.reply(400, {"message": "A fizetési link nincs beállítva a szerveren"})
                return self.reply(409, {"message": "Nincs ilyen rendelés"})
            return self.reply(200, {"state": "link_sent", "link": {"url": f"{BASE}/hu/rendeles-fizetese/{TOKEN}", "expires_at": "2026-12-01", "amount": 5000}})
        if method == "POST" and path.endswith("/session"):
            return self.reply(200, {"client_secret": DIFF_SECRET, "amount": 5000})
        if method == "POST" and path.endswith("/complete"):
            self.stage = "paid"
            return self.reply(200, {"state": "paid"})
        if method == "POST" and "/admin/payments/" in path and path.endswith("/refund"):
            self.refunded += json_body["amount"]
            self.stage = "refunded"
            return self.reply(200, {"payment": {}})
        return self.reply(404, {"message": f"no route {method} {path}"})

    def state(self):
        hold = pay("pay_hold")
        if self.stage in ("none", "held", "edited"):
            return state([hold], 0)
        diff = pay("pay_diff", 5000 - 0, self.refunded)
        stripe = [{"payment_id": "pay_diff", "stripe_refunds": {"refunds": [{"status": self.flags.get("refund_status", "succeeded"), "amount": self.refunded}]}}] if self.refunded else []
        return state([hold, diff], self.flags.get("other", 5000 - self.refunded), stripe=stripe)

    def writes(self):
        return [c for c in self.calls if c[0] != "GET"]


def run(argv, env=None, http=None):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = tp.main(argv, ENV if env is None else env, http or Fake())
    return code, out.getvalue(), err.getvalue()


class Guards(unittest.TestCase):
    def test_base_only_the_test_host(self):
        self.assertEqual(tp.check_base(BASE), BASE)
        self.assertEqual(tp.check_base(BASE + "/"), BASE)
        for bad in ("http://commerce-stage.acropora.hu", "https://localhost:9000", "https://acropora.hu", "https://shop.acropora.hu",
                    "https://commerce-stage.acropora.hu@evil.example", "https://commerce-stage.acropora.hu:8443", "https://commerce-stage.acropora.hu/x",
                    "https://commerce-stage.acropora.hu.evil.example", "https://evil.example/commerce-stage.acropora.hu"):
            with self.assertRaises(tp.MeasureError, msg=bad):
                tp.check_base(bad)

    def test_settings(self):
        self.assertEqual(tp.check_settings(ENV)["stripe"], STRIPE_PK)
        for name in ENV:
            with self.assertRaises(tp.MeasureError, msg=name):
                tp.check_settings({k: v for k, v in ENV.items() if k != name})
        with self.assertRaises(tp.MeasureError):
            tp.check_settings({**ENV, "STRIPE_PUBLISHABLE_KEY": "pk_live_" + "d" * 24})
        with self.assertRaises(tp.MeasureError):
            tp.check_settings({**ENV, "STRIPE_PUBLISHABLE_KEY": "sk_test_" + "d" * 24})
        with self.assertRaises(tp.MeasureError):
            tp.check_settings({**ENV, "MEDUSA_PUBLISHABLE_KEY": STRIPE_PK})
        with self.assertRaises(tp.MeasureError):
            tp.check_settings({**ENV, "MEDUSA_STAGE_ADMIN_KEY": "sk_ a"})

    def test_refusal_exit_code_and_no_call(self):
        fake = Fake()
        for bad in ("https://localhost", "https://shop-staging.acropora.hu"):  # no port or path: only the host check can refuse these
            code, _out, err = run(["plan", "--base", bad], http=fake)
            self.assertEqual(code, 2, bad)
            self.assertIn("refused", err)
            self.assertEqual(fake.calls, [], bad)
        code, _out, _err = run(["plan"], env={**ENV, "STRIPE_PUBLISHABLE_KEY": "pk_live_" + "d" * 24}, http=fake)
        self.assertEqual((code, fake.calls), (2, []))

    def test_order_needed(self):
        for job in ("difference", "refund", "state"):
            self.assertEqual(run([job, "--execute"])[0], 2, job)
            self.assertEqual(run([job, "--execute", "--order", "ord_1"])[0], 2, job)

    def test_no_redirect_is_followed(self):
        handler = tp._NoRedirect()
        request = urllib.request.Request("https://shop-staging.acropora.hu/")
        self.assertIsNone(handler.redirect_request(request, None, 302, "Found", {}, "https://evil.example/"))


class Pure(unittest.TestCase):
    def test_candidates_and_choice(self):
        products = [{"variants": [
            {"id": "a", "manage_inventory": True, "inventory_quantity": 0, "calculated_price": {"calculated_amount": 10}},
            {"id": "b", "manage_inventory": False, "calculated_price": {"calculated_amount": 0}},
            {"id": "c", "manage_inventory": False, "calculated_price": {}},
            {"id": "d", "manage_inventory": True, "inventory_quantity": 1, "calculated_price": {"calculated_amount": 20}},
            {"id": "e", "manage_inventory": False, "calculated_price": {"calculated_amount": 30}}]}]
        cands = tp.candidates(products)
        self.assertEqual([c["id"] for c in cands], ["d", "e"])
        self.assertEqual([c["id"] for c in tp.choose_variants(cands)], ["d", "e"])
        with self.assertRaises(tp.MeasureError):
            tp.choose_variants([])
        with self.assertRaises(tp.MeasureError):
            tp.choose_variants(cands[:1])  # one variant, stock 1: nothing for the edit
        same = tp.choose_variants(cands[1:])
        self.assertEqual([c["id"] for c in same], ["e", "e"])

    def test_token_and_intent(self):
        self.assertEqual(tp.payment_token(f"{BASE}/hu/rendeles-fizetese/{TOKEN}"), TOKEN)
        for bad in (f"{BASE}/hu/rendeles-fizetese/", f"{BASE}/hu/masik/{TOKEN}", f"{BASE}/hu/rendeles-fizetese/{TOKEN}/tovabb", f"{BASE}/hu/rendeles-fizetese/abc"):
            with self.assertRaises(tp.MeasureError, msg=bad):
                tp.payment_token(bad)
        self.assertEqual(tp.intent_id(HOLD_SECRET), "pi_hold")
        with self.assertRaises(tp.MeasureError):
            tp.intent_id("seti_1_secret_x")

    def test_keys_extraction(self):
        text = f'..."pk":"{STRIPE_PK}","m":"{MEDUSA_PK}", {"pk_" + "f" * 63} "pk_live_{"e" * 24}"'
        found = tp.extract_keys([text])
        self.assertEqual(found["stripe"], [STRIPE_PK])
        self.assertEqual(found["medusa"], [MEDUSA_PK])
        self.assertEqual(tp.script_paths('<script src="/_next/static/chunks/a.js"></script><link href="/_next/static/b.css">'), ["/_next/static/chunks/a.js"])

    def levels(self, lines):
        return [level for level, _ in lines]

    def test_judge_two_payments(self):
        good = state([pay("h"), pay("d", 5000)], 5000)
        self.assertNotIn("FAIL", self.levels(tp.judge(good, difference=5000)))

    def test_judge_one_payment_is_not_evidence(self):
        lines = tp.judge(state([pay("h")], 0))
        self.assertIn("FAIL", self.levels(lines))
        self.assertTrue(any("two expected" in text for _, text in lines))

    def test_judge_wrong_other_captured(self):
        self.assertIn("FAIL", self.levels(tp.judge(state([pay("h"), pay("d", 5000)], 0), difference=5000)))
        self.assertIn("FAIL", self.levels(tp.judge(state([pay("h"), pay("d", 4000)], 4000), difference=5000)))

    def test_judge_refund(self):
        stripe = [{"payment_id": "d", "stripe_refunds": {"refunds": [{"status": "succeeded", "amount": 100}]}}]
        good = state([pay("h"), pay("d", 5000, 100)], 4900, stripe=stripe)
        self.assertNotIn("FAIL", self.levels(tp.judge(good, difference=5000, refunded=100)))
        # the subtraction missing: other_captured still the whole difference
        self.assertIn("FAIL", self.levels(tp.judge(state([pay("h"), pay("d", 5000, 100)], 5000, stripe=stripe), difference=5000, refunded=100)))
        # the refunds field not resolved
        self.assertIn("FAIL", self.levels(tp.judge(state([pay("h"), pay("d", 5000, 100, field="missing")], 4900, stripe=stripe), difference=5000, refunded=100)))
        # Stripe did not succeed
        failed = [{"payment_id": "d", "stripe_refunds": {"refunds": [{"status": "failed", "amount": 100}]}}]
        self.assertIn("FAIL", self.levels(tp.judge(state([pay("h"), pay("d", 5000, 100)], 4900, stripe=failed), difference=5000, refunded=100)))
        # no Stripe reading is a note, not a pass of the Stripe check
        lines = tp.judge(state([pay("h"), pay("d", 5000, 100)], 4900), difference=5000, refunded=100)
        self.assertIn("NOTE", self.levels(lines))

    def test_judge_findings(self):
        self.assertIn("FAIL", self.levels(tp.judge(state([pay("h"), pay("d", 5000)], 5000, findings=["amount is a string"]), difference=5000)))


class Flow(unittest.TestCase):
    def test_plan_reads_and_probes_only(self):
        fake = Fake()
        code, out, err = run(["plan"], http=fake)
        self.assertEqual((code, err), (0, ""), out)
        self.assertEqual([(m, u[len(BASE):]) for m, u, *_ in fake.writes()], [("POST", f"/admin/order-payment/{tp.NO_SUCH_ORDER}/payment-link")])
        self.assertIn("RESULT PASS", out)

    def test_plan_says_link_not_configured(self):
        code, out, _ = run(["plan"], http=Fake(no_link_config=True))
        self.assertEqual(code, 1)
        self.assertIn("not configured", out)

    def test_write_job_without_execute_writes_nothing(self):
        for job in ("hold", "all"):
            fake = Fake()
            code, out, _ = run([job], http=fake)
            self.assertEqual((code, fake.calls), (0, []), job)
            self.assertIn("dry run", out)

    def test_all_passes_and_hides_secrets(self):
        fake = Fake()
        code, out, err = run(["all", "--execute"], http=fake)
        self.assertEqual((code, err), (0, ""), out)
        self.assertIn("RESULT PASS", out)
        self.assertIn(f"ORDER {ORDER}", out)
        for secret in (ADMIN, HOLD_SECRET, DIFF_SECRET, TOKEN, "pi_hold", STRIPE_PK):
            if secret == "pi_hold":
                continue  # the intent id is not secret, the client secret is
            self.assertNotIn(secret, out + err, secret)
        stripe = [c for c in fake.calls if c[1].startswith("https://api.stripe.com")]
        self.assertEqual(len(stripe), 2)
        self.assertEqual(stripe[0][4]["payment_method"], "pm_card_visa")
        self.assertEqual(stripe[0][4]["key"], STRIPE_PK)
        self.assertEqual(stripe[0][1], "https://api.stripe.com/v1/payment_intents/pi_hold/confirm")
        self.assertEqual(stripe[1][1], "https://api.stripe.com/v1/payment_intents/pi_diff/confirm")
        self.assertEqual(fake.refunded, 100)

    def test_headers_and_hosts(self):
        fake = Fake()
        run(["all", "--execute"], http=fake)
        for method, url, headers, *_ in fake.calls:
            if url.startswith("https://api.stripe.com"):
                self.assertNotIn("authorization", headers)
                continue
            self.assertTrue(url.startswith(BASE), url)
            if "/admin/" in url:
                self.assertTrue(headers["authorization"].startswith("Basic "), url)
            else:
                self.assertEqual(headers["x-publishable-api-key"], MEDUSA_PK, url)
                self.assertNotIn("authorization", headers, url)

    def test_the_notification_is_off_and_the_edit_is_silent(self):
        fake = Fake()
        run(["all", "--execute"], http=fake)
        link = next(c for c in fake.calls if c[1].endswith(f"/admin/order-payment/{ORDER}/payment-link"))
        self.assertEqual(link[3], {"notify_customer": False})
        request = next(c for c in fake.calls if c[1].endswith("/request"))
        self.assertEqual(request[3], {"no_notification": True})
        cart = next(c for c in fake.calls if c[1] == f"{BASE}/store/carts/cart_1")
        self.assertEqual(cart[3]["email"], tp.TEST_EMAIL)
        self.assertTrue(tp.TEST_EMAIL.endswith("@example.com"))

    def test_aszf_version_falls_through_the_candidates(self):
        fake = Fake(aszf_ok=("unas-shop-2026-09-29",))
        code, _out, _err = run(["hold", "--execute"], http=fake)
        self.assertEqual(code, 0)
        self.assertEqual(fake.aszf_seen, ["teszt-mod", "unas-shop-2026-09-29"])
        fake = Fake(aszf_ok=("fogyasztobarat-9",))
        code, _out, _err = run(["hold", "--execute", "--aszf-version", "fogyasztobarat-9"], http=fake)
        self.assertEqual((code, fake.aszf_seen[0]), (0, "fogyasztobarat-9"))

    def test_aszf_no_version_matches(self):
        code, out, err = run(["hold", "--execute"], http=Fake(aszf_ok=()))
        self.assertEqual(code, 1)
        self.assertIn("--aszf-version", err)
        self.assertNotIn("ORDER", out)

    def test_a_backend_without_a_test_key_stops_before_the_first_write(self):
        for job in (["hold", "--execute"], ["all", "--execute"]):
            fake = Fake(live_key=True)
            code, _out, err = run(job, http=fake)
            self.assertEqual(code, 1, job)
            self.assertIn("TEST key", err)
            self.assertEqual(fake.writes(), [], job)

    def test_two_orders_stop_the_run(self):
        fake = Fake(two_orders=True)
        code, _out, err = run(["all", "--execute"], http=fake)
        self.assertEqual(code, 1)
        self.assertIn("2 orders were made", err)
        self.assertFalse(any("/admin/order-edits" in c[1] for c in fake.calls))

    def test_edit_refused_names_the_cancel(self):
        code, _out, err = run(["all", "--execute"], http=Fake(confirm_refused=True))
        self.assertEqual(code, 1)
        self.assertIn("DELETE /admin/order-edits/" + ORDER, err)

    def test_stripe_error_is_scrubbed(self):
        code, out, err = run(["all", "--execute"], http=Fake(stripe_error=True))
        self.assertEqual(code, 1)
        self.assertIn("card_declined", err)
        self.assertNotIn(ADMIN, out + err)

    def test_wrong_other_captured_fails_the_run(self):
        code, out, _ = run(["all", "--execute"], http=Fake(other=0))
        self.assertEqual(code, 1)
        self.assertIn("RESULT FAIL", out)

    def test_stripe_refund_failure_fails_the_run(self):
        code, out, _ = run(["all", "--execute"], http=Fake(refund_status="failed"))
        self.assertEqual(code, 1)
        self.assertIn("RESULT FAIL", out)

    def test_refund_larger_than_the_difference_is_refused(self):
        fake = Fake()
        run(["hold", "--execute"], http=fake)
        run(["difference", "--execute", "--order", ORDER], http=fake)
        before = len(fake.writes())
        code, _out, err = run(["refund", "--execute", "--order", ORDER, "--amount", "6000"], http=fake)
        self.assertEqual(code, 1)
        self.assertIn("refused here", err)
        self.assertEqual(len(fake.writes()), before)

    def test_difference_needs_a_plain_held_order(self):
        fake = Fake()
        fake.stage = "paid"
        code, _out, err = run(["difference", "--execute", "--order", ORDER], http=fake)
        self.assertEqual(code, 1)
        self.assertIn("exactly that", err)
        self.assertEqual(fake.writes(), [])

    def test_state_reads_only(self):
        fake = Fake()
        fake.stage = "paid"
        code, out, _ = run(["state", "--order", ORDER], http=fake)
        self.assertEqual(code, 0, out)
        self.assertEqual(fake.writes(), [])


class Keys(unittest.TestCase):
    class Site:
        def __init__(self):
            self.calls = []

        def request(self, method, url, headers=None, json_body=None, form=None):
            self.calls.append((url, dict(headers or {})))
            if url.endswith("/hu"):
                return tp.Reply(200, None, '<script src="/_next/static/chunks/app.js"></script>')
            if url.endswith("/app.js"):
                return tp.Reply(200, None, f'x="{STRIPE_PK}";y="{MEDUSA_PK}"')
            return tp.Reply(404, None, "")

    def test_keys_found_and_credential_stays_on_the_storefront(self):
        site = self.Site()
        code, out, _ = run(["keys"], env={"STAGE_BASIC_AUTH": "user:pass"}, http=site)
        self.assertEqual(code, 0, out)
        self.assertIn(STRIPE_PK, out)
        self.assertIn(MEDUSA_PK, out)
        self.assertNotIn("user:pass", out)
        self.assertTrue(all(url.startswith("https://shop-staging.acropora.hu/") for url, _ in site.calls))

    def test_keys_refuse_another_host_and_a_missing_login(self):
        site = self.Site()
        code, _out, err = run(["keys", "--storefront", "https://evil.example"], env={"STAGE_BASIC_AUTH": "user:pass"}, http=site)
        self.assertEqual((code, site.calls), (2, []))
        code, _out, err = run(["keys"], env={}, http=site)
        self.assertEqual((code, site.calls), (2, []))

    def test_nothing_found_is_not_a_pass(self):
        class Empty(self.Site):
            def request(self, *a, **k):
                return tp.Reply(200, None, "<html></html>")

        code, out, _ = run(["keys"], env={"STAGE_BASIC_AUTH": "user:pass"}, http=Empty())
        self.assertEqual(code, 1)
        self.assertIn("none found", out)


class AdminKeys(unittest.TestCase):
    """`keys` with an admin key: the Medusa publishable key is found through the admin API and PROVEN through the Store API, never picked by name.

    WHAT TURNS RED: a key chosen by its title; a revoked key, a key without a sales channel or a Stripe-shaped token chosen; the listing read
    only to its first page (Medusa 2.20.1 lists 20 a page); the admin key sent to the storefront host or into the output; the storefront login
    sent to the backend; a choice made when no key sees a buyable catalog."""

    GOOD = "pk_" + "1" * 64
    WORKS_NOT = "pk_" + "2" * 64
    NO_CHANNEL = "pk_" + "3" * 64
    REVOKED = "pk_" + "4" * 64
    OLD_GOOD = "pk_" + "5" * 64

    class Net:
        def __init__(self, rows, working, page_size=50, scan=""):
            self.rows, self.working, self.page_size, self.scan = rows, set(working), page_size, scan
            self.calls = []

        def request(self, method, url, headers=None, json_body=None, form=None):
            headers = dict(headers or {})
            self.calls.append((method, url, headers))
            if url.startswith("https://shop-staging.acropora.hu"):
                if url.endswith("/hu"):
                    return tp.Reply(200, None, '<script src="/_next/static/chunks/app.js"></script>')
                if url.endswith("/app.js"):
                    return tp.Reply(200, None, self.scan)
                return tp.Reply(404, None, "")
            path = url[len(BASE):]
            if path.startswith("/admin/api-keys"):
                query = dict(part.split("=") for part in path.split("?")[1].split("&"))
                offset, limit = int(query["offset"]), int(query["limit"])
                page = self.rows[offset : offset + min(limit, self.page_size)]
                body = {"api_keys": page, "count": len(self.rows), "offset": offset, "limit": limit}
                return tp.Reply(200, body, json.dumps(body))
            key = headers.get("x-publishable-api-key")
            if key not in self.working:
                return tp.Reply(400, {"message": "publishable key required"}, "{}")
            if path == "/store/regions":
                body = {"regions": [{"id": "reg_1", "countries": [{"iso_2": "hu"}]}]}
                return tp.Reply(200, body, json.dumps(body))
            if path.startswith("/store/products"):
                body = {"products": [{"variants": [{"id": "var_1", "calculated_price": {"calculated_amount": 1500}, "manage_inventory": False}]}]}
                return tp.Reply(200, body, json.dumps(body))
            return tp.Reply(404, None, "")

    def row(self, token, title="Default Publishable API Key", channels=("sc_1",), revoked=None, created="2026-11-10T10:00:00Z", kind="publishable"):
        return {"id": "apk_" + token[3:6] + created[8:10], "title": title, "token": token, "type": kind, "revoked_at": revoked, "created_at": created,
                "sales_channels": [{"id": c, "name": "x"} for c in channels]}

    def keys(self, net, env=None, extra=()):
        base_env = {"STAGE_BASIC_AUTH": "user:pass", "MEDUSA_STAGE_ADMIN_KEY": ADMIN}
        return run(["keys", *extra], env=base_env if env is None else env, http=net)

    def test_the_choice_is_made_by_what_the_store_api_answers_not_by_the_name(self):
        rows = [
            self.row(self.WORKS_NOT, created="2026-11-17T09:00:00Z"),  # newest, the default name, but the store refuses it
            self.row(self.NO_CHANNEL, channels=(), created="2026-11-16T09:00:00Z"),
            self.row(self.REVOKED, revoked="2026-11-01T00:00:00Z", created="2026-11-15T09:00:00Z"),
            self.row("pk_test_" + "6" * 40, created="2026-11-14T09:00:00Z"),  # a Stripe-shaped token in the list
            self.row(self.GOOD, title="Acrobot Publish Test", created="2026-11-13T09:00:00Z"),
            self.row(self.OLD_GOOD, created="2026-11-12T09:00:00Z"),
        ]
        # every key but the first would be ANSWERED by the store: only the listing's own rules (revoked, no channel, shape) keep them out
        working = {self.GOOD, self.OLD_GOOD, self.REVOKED, self.NO_CHANNEL, "pk_test_" + "6" * 40}
        net = self.Net(rows, working=working, scan=f'x="{STRIPE_PK}"')
        code, out, _ = self.keys(net)
        self.assertEqual(code, 0, out)
        self.assertIn(f"MEDUSA_PUBLISHABLE_KEY={self.GOOD}", out)
        self.assertIn("6 publishable keys listed, 3 not revoked", out)
        self.assertIn("1 older key(s) bound to the same channel(s)", out)

    def test_every_page_of_the_listing_is_read(self):
        rows = [self.row("pk_" + f"{i:064d}", created=f"2026-11-{10 + i:02d}T09:00:00Z") for i in range(5)]
        rows.append(self.row(self.GOOD, created="2026-11-01T09:00:00Z"))  # the oldest: on the last page
        net = self.Net(rows, working={self.GOOD}, page_size=2, scan=f'x="{STRIPE_PK}"')
        old = tp.KEY_PAGE
        tp.KEY_PAGE = 2
        try:
            code, out, _ = self.keys(net)
        finally:
            tp.KEY_PAGE = old
        self.assertEqual(code, 0, out)
        self.assertIn(f"MEDUSA_PUBLISHABLE_KEY={self.GOOD}", out)
        self.assertIn("6 publishable keys listed", out)

    def test_the_admin_key_goes_to_the_backend_only_and_the_login_to_the_storefront_only(self):
        net = self.Net([self.row(self.GOOD)], working={self.GOOD}, scan=f'x="{STRIPE_PK}"')
        code, out, err = self.keys(net)
        self.assertEqual(code, 0, out)
        for _method, url, headers in net.calls:
            sent = " ".join(headers.values())
            if url.startswith("https://shop-staging.acropora.hu"):
                self.assertNotIn(base64_of(ADMIN + ":"), sent)
            else:
                self.assertTrue(url.startswith(BASE))
                self.assertNotIn(base64_of("user:pass"), sent)
        self.assertNotIn(ADMIN, out + err)

    def test_no_working_key_is_not_a_pass_and_chooses_nothing(self):
        net = self.Net([self.row(self.WORKS_NOT)], working=set(), scan=f'x="{STRIPE_PK}"')
        code, out, _ = self.keys(net)
        self.assertEqual(code, 1)
        self.assertIn("no listed key sees a buyable catalog", out)
        self.assertNotIn("MEDUSA_PUBLISHABLE_KEY=", out)

    def test_a_different_key_in_the_storefront_files_is_named(self):
        net = self.Net([self.row(self.GOOD)], working={self.GOOD}, scan=f'x="{STRIPE_PK}";y="{MEDUSA_PK}"')
        code, out, _ = self.keys(net)
        self.assertEqual(code, 0, out)
        self.assertIn("carry a different Medusa key", out)

    def test_another_backend_host_is_refused_before_any_call(self):
        net = self.Net([self.row(self.GOOD)], working={self.GOOD})
        code, _out, _err = self.keys(net, extra=("--base", "https://evil.example"))
        self.assertEqual((code, net.calls), (2, []))

    def test_without_an_admin_key_the_scan_alone_decides_as_before(self):
        net = self.Net([self.row(self.GOOD)], working={self.GOOD}, scan=f'x="{STRIPE_PK}"')
        code, out, _ = self.keys(net, env={"STAGE_BASIC_AUTH": "user:pass"})
        self.assertEqual(code, 1)
        self.assertTrue(all(url.startswith("https://shop-staging.acropora.hu/") for _m, url, _h in net.calls))
        self.assertIn("no admin key in the environment", out)


def base64_of(text):
    import base64

    return base64.b64encode(text.encode()).decode()


if __name__ == "__main__":
    unittest.main()
