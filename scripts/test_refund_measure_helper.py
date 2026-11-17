"""Tests of scripts/refund-measure-helper.py (task t-20261117-visszaterites-segedo).

Run: cd <repo root> && python3 -m unittest scripts/test_refund_measure_helper.py -v

WHAT TURNS RED: a task command that the backend would refuse or that carries another input than asked (the base64), an `apply` without its
confirmation, a log reading that says OK when the refund field is missing, a refund amount is not a number or a finding exists, the
`other_captured` of a ONE-payment order read as evidence (it is 0 by design), a two-payment order whose other_captured is wrong read as fine,
a cut log line read as complete. No test here holds a key, a token or a real id.
"""

import base64
import importlib.util
import json
import pathlib
import unittest

SPEC = importlib.util.spec_from_file_location("helper", pathlib.Path(__file__).with_name("refund-measure-helper.py"))
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)


def amount(value, kind="number"):
    return {"type": kind, "value": value, "as_number": float(value) if kind != "object" else float("nan"), "finite": kind != "object"}


def payment(pid, captured=0, refunded=0, refunds=None, field=None, canceled=False):
    refunds = refunds if refunds is not None else ([amount(refunded)] if refunded else [])
    return {
        "id": pid,
        "provider_id": "pp_stripe_stripe",
        "canceled": canceled,
        "captured_total": captured,
        "refunded_total": refunded,
        "covered": max(0, captured - refunded),
        "refunds_field": field or ("present" if refunds else "empty"),
        "refunds": refunds,
    }


def readout(payments, findings=None):
    return {"order_id": "order_01TEST", "collections": [{"id": "paycol_1", "status": "completed", "payments": payments}], "findings": findings or []}


def log_line(section, value):
    return f"2026-11-17T13:50:00Z stdout MEASURE-RESULT {section} {json.dumps(value)}"


def after_section(payments, payment_id, other, findings=None):
    return {"order_id": "order_01TEST", "payment_id": payment_id, "readout_after": readout(payments, findings), "side": {"total": 1000, "currency_code": "huf", "other_captured": other, "payment_canceled": False}}


STRIPE_OK = {"http_status": 200, "refunds": [{"status": "succeeded", "amount_smallest_unit": 10000, "amount": 100, "currency": "huf"}]}


class Inputs(unittest.TestCase):
    def test_list_command_is_the_documented_base64(self):
        self.assertEqual(helper.encode(helper.list_input(5)), "eyJtb2RlIjoibGlzdCIsImxpbWl0Ijo1fQ==")
        self.assertTrue(helper.command(helper.list_input(5)).startswith("cd /app && npx medusa exec ./src/scripts/book-test-refund.js --input "))

    def test_apply_repeats_the_order_id_as_confirmation(self):
        payload = json.loads(base64.b64decode(helper.encode(helper.refund_input("apply", "order_01ABC", 100))))
        self.assertEqual(payload, {"mode": "apply", "order_id": "order_01ABC", "amount": 100, "confirm_order_id": "order_01ABC"})

    def test_plan_has_no_confirmation_and_keeps_the_payment(self):
        payload = helper.refund_input("plan", "order_01ABC", 100, "pay_01XYZ")
        self.assertEqual(payload, {"mode": "plan", "order_id": "order_01ABC", "amount": 100, "payment_id": "pay_01XYZ"})

    def test_what_the_backend_refuses_is_refused_here(self):
        for bad in [
            lambda: helper.list_input(0),
            lambda: helper.list_input(21),
            lambda: helper.refund_input("plan", "01ABC", 100),
            lambda: helper.refund_input("plan", "order_01-ABC", 100),
            lambda: helper.refund_input("plan", "order_01ABC", 0),
            lambda: helper.refund_input("plan", "order_01ABC", True),
            lambda: helper.refund_input("plan", "order_01ABC", 100, "payment_1"),
            lambda: helper.refund_input("list", "order_01ABC", 100),
        ]:
            with self.assertRaises(ValueError):
                bad()

    def test_cli_prints_three_commands_and_refuses_a_bad_order_before_printing_any(self):
        import contextlib
        import io

        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(helper.main(["inputs", "--order", "order_01ABC"]), 0)
        self.assertEqual(len(out.getvalue().strip().splitlines()), 3)
        out = io.StringIO()
        err = io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            self.assertEqual(helper.main(["inputs", "--order", "bad"]), 2)
        self.assertEqual(out.getvalue(), "")


class ParseLog(unittest.TestCase):
    def test_reads_sections_through_prefixes_and_colour_codes(self):
        text = "noise\n\x1b[32m" + log_line("list", {"test_key": True, "orders": []}) + "\x1b[0m\nmore noise\n"
        sections, unreadable = helper.parse_log(text)
        self.assertEqual([name for name, _ in sections], ["list"])
        self.assertEqual(unreadable, 0)

    def test_a_cut_line_is_counted_not_dropped_silently(self):
        text = log_line("list", {"orders": []}) + "\n2026 MEASURE-RESULT after {\"order_id\": \"order_01\n"
        sections, unreadable = helper.parse_log(text)
        self.assertEqual(len(sections), 1)
        self.assertEqual(unreadable, 1)
        self.assertIn("WARN 1 MEASURE-RESULT", "\n".join(helper.read_log(text)))

    def test_a_log_without_a_marker_says_so(self):
        self.assertIn("no readable MEASURE-RESULT", helper.read_log("nothing here")[0])


class ReadList(unittest.TestCase):
    def test_marks_the_order_with_two_live_payments_and_ignores_a_canceled_one(self):
        orders = [
            {"order_id": "order_01A", "display_id": 1, "total": 1000, "currency": "huf", "payments": [{"payment_id": "pay_1", "canceled": False, "captured": 1000, "refunded": 0, "refunds_field": "empty"}]},
            {"order_id": "order_01B", "display_id": 2, "total": 1000, "currency": "huf", "payments": [
                {"payment_id": "pay_2", "canceled": False, "captured": 0, "refunded": 0, "refunds_field": "empty"},
                {"payment_id": "pay_3", "canceled": False, "captured": 200, "refunded": 0, "refunds_field": "empty"},
                {"payment_id": "pay_4", "canceled": True, "captured": 0, "refunded": 0, "refunds_field": "empty"}]},
        ]
        text = "\n".join(helper.read_list({"test_key": True, "orders": orders}))
        self.assertEqual(text.count("two live payments"), 1)
        self.assertLess(text.index("order_01B"), text.index("two live payments"))
        self.assertNotIn("pay_4", text)

    def test_a_missing_test_key_is_a_failure_line(self):
        self.assertIn("FAIL the backend does not hold a Stripe TEST key", "\n".join(helper.read_list({"test_key": False, "orders": []})))


class ReadPlan(unittest.TestCase):
    def test_a_refused_plan_names_every_reason(self):
        section = {"order_id": "order_01A", "amount": 5000, "mode": "plan", "plan": {"ok": False, "problems": ["amount 5000 is more than what is refundable (1000)", "second reason"], "payment_id": "pay_1", "refundable": 1000}, "stripe_intent": {"status": "succeeded", "livemode": False}}
        text = "\n".join(helper.read_plan(section))
        self.assertIn("REFUSED", text)
        self.assertEqual(text.count("FAIL"), 2)


class VerdictAfter(unittest.TestCase):
    def one_payment(self, **kwargs):
        return after_section([payment("pay_1", captured=1000, refunded=100)], "pay_1", 0, **kwargs)

    def test_a_good_single_payment_run_is_ok_and_says_other_captured_proves_nothing(self):
        text = "\n".join(helper.verdict_after(self.one_payment(), None, STRIPE_OK))
        self.assertNotIn("FAIL", text)
        self.assertIn("ONE live payment", text)
        self.assertIn("does NOT test loadSide", text)

    def test_the_refunds_field_missing_fails(self):
        section = after_section([payment("pay_1", captured=1000, refunds=[], field="missing")], "pay_1", 0)
        self.assertIn("FAIL refunds field is missing", "\n".join(helper.verdict_after(section, None, STRIPE_OK)))

    def test_a_refund_amount_that_is_not_a_number_fails(self):
        bad = payment("pay_1", captured=1000, refunds=[amount("x", "object")])
        section = after_section([bad], "pay_1", 0, findings=["payment pay_1: a refund amount is object, Number() of it is NaN"])
        text = "\n".join(helper.verdict_after(section, None, STRIPE_OK))
        self.assertIn("FAIL refund amounts", text)
        self.assertIn("FAIL findings", text)

    def test_the_booked_amount_must_be_the_growth_of_the_refunded_total(self):
        plan = {"amount": 100, "readout_before": readout([payment("pay_1", captured=1000)])}
        self.assertNotIn("FAIL", "\n".join(helper.verdict_after(self.one_payment(), plan, STRIPE_OK)))
        wrong = {"amount": 250, "readout_before": readout([payment("pay_1", captured=1000)])}
        self.assertIn("FAIL refunded total grew by 100, the booked amount is 250", "\n".join(helper.verdict_after(self.one_payment(), wrong, STRIPE_OK)))

    TWO = [payment("pay_hold", captured=0), payment("pay_diff", captured=300, refunded=100)]

    def test_two_payments_other_captured_matching_the_covered_of_the_non_hold_payment_is_ok(self):
        good = after_section(self.TWO, "pay_diff", 200)
        self.assertIn("OK   other_captured 200, expected 200", "\n".join(helper.verdict_after(good, None, STRIPE_OK)))

    def test_two_payments_other_captured_ignoring_the_refund_fails(self):
        # loadSide ignoring the refund would report the full capture
        ignoring = after_section(self.TWO, "pay_diff", 300)
        self.assertIn("FAIL other_captured 300, expected 200", "\n".join(helper.verdict_after(ignoring, None, STRIPE_OK)))

    def test_a_stripe_refund_that_is_not_succeeded_fails_and_a_missing_section_is_a_note(self):
        pending = {"refunds": [{"status": "pending", "amount": 100, "currency": "huf"}]}
        self.assertIn("FAIL Stripe refunds", "\n".join(helper.verdict_after(self.one_payment(), None, pending)))
        self.assertIn("NOTE no stripe_refunds section", "\n".join(helper.verdict_after(self.one_payment(), None, None)))

    def test_the_refunded_payment_missing_from_the_readout_is_a_failure(self):
        section = after_section([payment("pay_other", captured=10)], "pay_1", 0)
        self.assertIn("FAIL the refunded payment is not in readout_after", "\n".join(helper.verdict_after(section, None, STRIPE_OK)))

    def test_a_whole_apply_log_reads_end_to_end(self):
        plan_section = {"order_id": "order_01TEST", "amount": 100, "mode": "apply", "plan": {"ok": True, "problems": [], "payment_id": "pay_1", "refundable": 1000}, "stripe_intent": {"status": "succeeded", "livemode": False}, "readout_before": readout([payment("pay_1", captured=1000)])}
        log = "\n".join([log_line("plan", plan_section), log_line("after", self.one_payment()), log_line("stripe_refunds", STRIPE_OK)])
        text = "\n".join(helper.read_log(log))
        self.assertIn("PLAN order order_01TEST amount 100 mode apply: OK", text)
        self.assertIn("AFTER order order_01TEST", text)
        self.assertNotIn("FAIL", text)


if __name__ == "__main__":
    unittest.main()
