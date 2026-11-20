
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "frontend" / "src"))

from parser import parse_sms
from categorizer import categorize_transactions


def test_categorization():
    data_file = ROOT / "frontend" / "data" / "test_labeled.csv"
    df = pd.read_csv(data_file)

    rows = []

    for _, row in df.iterrows():
        parsed = parse_sms(row["sms_text"], row["received_at"])
        parsed["message_id"] = row["message_id"]
        parsed["sms_text"] = row["sms_text"]
        rows.append(parsed)

    transactions = pd.DataFrame(rows)
    categorized = categorize_transactions(transactions)

    valid_categories = {
        "Food",
        "Travel",
        "Shopping",
        "Bills and Recharge",
        "Entertainment",
        "Groceries",
        "Health",
        "Education",
        "Transfers",
        "Others",
        "Income",
    }

    assert len(categorized) > 0
    assert set(categorized["category"]).issubset(valid_categories)

    income_rows = categorized[categorized["status"] == "income"]
    assert (income_rows["category"] == "Income").all()

    refund_rows = categorized[categorized["status"] == "refund"]
    assert (refund_rows["category"] != "Income").all()
