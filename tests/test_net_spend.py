
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "frontend" / "src"))

from parser import parse_sms
from net_spend import calculate_net_spend


def load_processed_data():
    data_file = ROOT / "frontend" / "data" / "test_labeled.csv"
    df = pd.read_csv(data_file)

    parsed_rows = []

    for _, row in df.iterrows():
        result = parse_sms(row["sms_text"], row["received_at"])
        result["message_id"] = row["message_id"]
        result["transaction_id"] = row["expected_transaction_id"]
        parsed_rows.append(result)

    transactions = pd.DataFrame(parsed_rows)

    return calculate_net_spend(transactions)


def test_net_spend_arithmetic():
    processed, summary = load_processed_data()

    assert summary["net_spend"] == pytest.approx(
        summary["gross_spend"] - summary["matched_refunds"]
    )


def test_refund_deductions_do_not_exceed_gross_spend():
    processed, summary = load_processed_data()

    assert summary["matched_refunds"] <= summary["gross_spend"]


def test_only_refunds_require_refund_review():
    processed, summary = load_processed_data()

    review = processed[processed["treatment"] == "Needs review"]

    assert (review["status"] == "refund").all()


def test_duplicate_transactions_are_not_counted():
    processed, summary = load_processed_data()

    duplicates = processed[
        processed["treatment"] == "Duplicate - excluded"
    ]

    if not duplicates.empty:
        assert (duplicates["counted_amount"] == 0).all()
