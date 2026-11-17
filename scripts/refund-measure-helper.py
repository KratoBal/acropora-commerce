#!/usr/bin/env python3
"""Helper for the test-refund measurement (docs/TEST-REFUND-MEASUREMENT.md; commerce card 04b6010e, task t-20261117-visszaterites-segedo).

Two jobs, standard library only, nothing is sent anywhere and nothing is written:

  inputs  prints the ready Coolify task commands (the base64 input of list / plan / apply)
  read    reads a task log (a file, or stdin) and prints what its MEASURE-RESULT lines say, with the verdict of the measurement

  python3 scripts/refund-measure-helper.py inputs
  python3 scripts/refund-measure-helper.py inputs --order order_01ABC --amount 100 [--payment pay_01ABC]
  python3 scripts/refund-measure-helper.py read task.log      (or: ... read - < task.log)

The input rules repeat `decodeInput` of `apps/backend/src/workflows/utils/order-payment/refund-measure.ts`: the script refuses here what the
backend would refuse there, so a typo is found before a Coolify run is spent on it.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
from typing import Any

SCRIPT_COMMAND = "cd /app && npx medusa exec ./src/scripts/book-test-refund.js --input"
ORDER_ID = re.compile(r"^order_[A-Za-z0-9]+$")
PAYMENT_ID = re.compile(r"^pay_[A-Za-z0-9]+$")
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
MARKER = re.compile(r"MEASURE-RESULT\s+([a-z_]+)\s+(\{.*\})\s*$")


def encode(payload: dict[str, Any]) -> str:
    """The base64 of the compact JSON, with no line break (the command carries it as one word)."""
    return base64.b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).decode("ascii")


def command(payload: dict[str, Any]) -> str:
    return f"{SCRIPT_COMMAND} {encode(payload)}"


def list_input(limit: int = 5) -> dict[str, Any]:
    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 20:
        raise ValueError("limit must be a whole number from 1 to 20")
    return {"mode": "list", "limit": limit}


def refund_input(mode: str, order_id: str, amount: int, payment_id: str | None = None) -> dict[str, Any]:
    if mode not in ("plan", "apply"):
        raise ValueError("mode must be plan or apply")
    if not ORDER_ID.match(order_id or ""):
        raise ValueError("order_id must look like order_01...")
    if not isinstance(amount, int) or isinstance(amount, bool) or amount < 1:
        raise ValueError("amount must be a whole number of at least 1 (forints)")
    if payment_id is not None and not PAYMENT_ID.match(payment_id):
        raise ValueError("payment_id must look like pay_01...")
    payload: dict[str, Any] = {"mode": mode, "order_id": order_id, "amount": amount}
    if payment_id:
        payload["payment_id"] = payment_id
    if mode == "apply":
        payload["confirm_order_id"] = order_id
    return payload


def parse_log(text: str) -> tuple[list[tuple[str, dict[str, Any]]], int]:
    """The MEASURE-RESULT sections of a log in order, and how many marker lines could NOT be read (a wrapped or cut line)."""
    sections: list[tuple[str, dict[str, Any]]] = []
    unreadable = 0
    for raw in text.splitlines():
        line = ANSI.sub("", raw)
        if "MEASURE-RESULT" not in line:
            continue
        found = MARKER.search(line)
        if not found:
            unreadable += 1
            continue
        try:
            value = json.loads(found.group(2))
        except ValueError:
            unreadable += 1
            continue
        if isinstance(value, dict):
            sections.append((found.group(1), value))
        else:
            unreadable += 1
    return sections, unreadable


def live_payments(readout: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        p
        for c in readout.get("collections") or []
        for p in c.get("payments") or []
        if not p.get("canceled")
    ]


def read_list(section: dict[str, Any]) -> list[str]:
    lines = [f"LIST test_key={section.get('test_key')} orders={len(section.get('orders') or [])}"]
    if section.get("test_key") is not True:
        lines.append("FAIL the backend does not hold a Stripe TEST key: the apply will refuse")
    for order in section.get("orders") or []:
        payments = [p for p in order.get("payments") or [] if not p.get("canceled")]
        two = " <- two live payments: the one that checks loadSide's refund subtraction" if len(payments) > 1 else ""
        lines.append(f"  {order.get('order_id')} (#{order.get('display_id')}) total {order.get('total')} {order.get('currency')}{two}")
        for p in payments:
            lines.append(f"    {p.get('payment_id')} captured {p.get('captured')} refunded {p.get('refunded')} refunds_field {p.get('refunds_field')}")
    return lines


def read_plan(section: dict[str, Any]) -> list[str]:
    plan = section.get("plan") or {}
    intent = section.get("stripe_intent") or {}
    lines = [
        f"PLAN order {section.get('order_id')} amount {section.get('amount')} mode {section.get('mode')}: "
        + ("OK, may be booked" if plan.get("ok") else "REFUSED")
        + f" (payment {plan.get('payment_id')}, refundable {plan.get('refundable')})"
    ]
    for problem in plan.get("problems") or []:
        lines.append(f"  FAIL {problem}")
    lines.append(f"  Stripe intent: status {intent.get('status')} livemode {intent.get('livemode')} (http {intent.get('http_status')})")
    for finding in (section.get("readout_before") or {}).get("findings") or []:
        lines.append(f"  finding before: {finding}")
    return lines


def payment_of(readout: dict[str, Any] | None, payment_id: str | None) -> dict[str, Any] | None:
    for collection in (readout or {}).get("collections") or []:
        for payment in collection.get("payments") or []:
            if payment.get("id") == payment_id:
                return payment
    return None


def verdict_after(after: dict[str, Any], plan: dict[str, Any] | None, stripe: dict[str, Any] | None) -> list[str]:
    """What the run decides about #615. `plan` and `stripe` are the other sections of the same log (None when absent)."""
    readout = after.get("readout_after") or {}
    payment = payment_of(readout, after.get("payment_id"))
    lines = [f"AFTER order {after.get('order_id')} payment {after.get('payment_id')}"]
    if payment is None:
        return lines + ["  FAIL the refunded payment is not in readout_after: nothing can be read"]

    def check(ok: bool, text: str) -> None:
        lines.append(f"  {'OK  ' if ok else 'FAIL'} {text}")

    refunds = payment.get("refunds") or []
    check(payment.get("refunds_field") == "present", f"refunds field is {payment.get('refunds_field')} (present = Medusa resolves the refunds)")
    check(
        bool(refunds) and all(r.get("finite") for r in refunds),
        "refund amounts: " + (", ".join(f"{r.get('type')} {json.dumps(r.get('value'))}" + ("" if r.get("finite") else " (Number() is NaN)") for r in refunds) or "none"),
    )
    findings = readout.get("findings") or []
    check(not findings, "findings: " + ("none" if not findings else "; ".join(findings)))
    if plan is not None:
        before = payment_of(plan.get("readout_before"), after.get("payment_id"))
        if before is not None and isinstance(plan.get("amount"), (int, float)):
            delta = (payment.get("refunded_total") or 0) - (before.get("refunded_total") or 0)
            check(delta == plan["amount"], f"refunded total grew by {delta}, the booked amount is {plan['amount']}")
    live = live_payments(readout)
    other = (after.get("side") or {}).get("other_captured")
    if len(live) <= 1:
        lines.append(
            f"  NOTE other_captured is {other}: with ONE live payment it is 0 by design (that payment is the order's own payment), "
            "so it does NOT test loadSide's refund subtraction; the shape checks above are the decision for this order"
        )
    else:
        holds = [p for p in live if not p.get("captured_total")]
        hold = holds[0] if len(holds) == 1 else (live[0] if not holds else None)
        if hold is None:
            lines.append(f"  NOTE other_captured is {other}; several uncaptured payments, so which one is the hold needs created_at: check by eye")
        else:
            expected = sum(p.get("covered") or 0 for p in live if p is not hold)
            check(other == expected, f"other_captured {other}, expected {expected} (covered of every live payment except the hold {hold.get('id')})")
    if stripe is not None:
        stripe_refunds = stripe.get("refunds") or []
        text = ", ".join(f"{r.get('status')} {r.get('amount')} {r.get('currency')}" for r in stripe_refunds) or "none"
        check(bool(stripe_refunds) and all(r.get("status") == "succeeded" for r in stripe_refunds), f"Stripe refunds: {text}")
    else:
        lines.append("  NOTE no stripe_refunds section in the log")
    return lines


def read_log(text: str) -> list[str]:
    sections, unreadable = parse_log(text)
    lines: list[str] = []
    if not sections:
        return [f"no readable MEASURE-RESULT line in the log ({unreadable} unreadable marker lines): the run did not print one, or the log viewer cut the long line"]
    plan = next((s for name, s in sections if name == "plan"), None)
    stripe = next((s for name, s in sections if name == "stripe_refunds"), None)
    for name, section in sections:
        if name == "list":
            lines += read_list(section)
        elif name == "plan":
            lines += read_plan(section)
        elif name == "after":
            lines += verdict_after(section, plan, stripe)
        elif name == "stripe_refunds":
            continue
        else:
            lines.append(f"{name.upper()} (a section this helper does not know): {json.dumps(section)[:200]}")
    if unreadable:
        lines.append(f"WARN {unreadable} MEASURE-RESULT line(s) could not be read (cut or wrapped by the log viewer): the reading above is incomplete")
    return lines


def main(argv: list[str], stdin: str | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="job", required=True)
    inputs = sub.add_parser("inputs", help="print the ready task commands")
    inputs.add_argument("--limit", type=int, default=5)
    inputs.add_argument("--order")
    inputs.add_argument("--amount", type=int, default=100)
    inputs.add_argument("--payment")
    read = sub.add_parser("read", help="read a task log")
    read.add_argument("log", nargs="?", default="-")
    args = parser.parse_args(argv)
    try:
        if args.job == "inputs":
            out = [f"1. list   {command(list_input(args.limit))}"]
            if args.order:
                out.append(f"2. plan   {command(refund_input('plan', args.order, args.amount, args.payment))}")
                out.append(f"3. apply  {command(refund_input('apply', args.order, args.amount, args.payment))}")
            else:
                out.append("2. plan and 3. apply need an order id from the list: rerun with --order order_01... [--amount 100] [--payment pay_01...]")
            print("\n".join(out))
            return 0
        text = stdin if stdin is not None else (sys.stdin.read() if args.log == "-" else open(args.log, encoding="utf-8", errors="replace").read())
        print("\n".join(read_log(text)))
        return 0
    except ValueError as error:
        print(f"refused: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
