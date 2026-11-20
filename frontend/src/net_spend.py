
from datetime import datetime
from typing import Optional

import pandas as pd


REFUND_WINDOW_DAYS = 15


def normalize_merchant(merchant: Optional[str]) -> str:
    if merchant is None or pd.isna(merchant):
        return ""
    return " ".join(str(merchant).lower().strip().split())


def parse_date(value) -> Optional[datetime]:
    if value is None or pd.isna(value) or value == "":
        return None
    try:
        return pd.to_datetime(value).to_pydatetime()
    except (ValueError, TypeError):
        return None


def calculate_net_spend(
    transactions: pd.DataFrame,
    refund_window_days: int = REFUND_WINDOW_DAYS,
) -> tuple[pd.DataFrame, dict]:

    df = transactions.copy().reset_index(drop=True)

    required_columns = {
        "amount", "direction", "merchant", "date", "status"
    }
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(
            f"Missing required columns: {', '.join(sorted(missing))}"
        )

    if refund_window_days < 0:
        raise ValueError("refund_window_days cannot be negative.")

    df["amount"] = pd.to_numeric(
        df["amount"], errors="coerce"
    ).fillna(0).clip(lower=0)

    for column in ["direction", "merchant", "status"]:
        df[column] = (
            df[column].fillna("").astype(str).str.strip()
        )

    df["status"] = df["status"].str.lower()
    df["direction"] = df["direction"].str.lower()

    df["_parsed_date"] = df["date"].apply(parse_date)
    df["_merchant_key"] = df["merchant"].apply(normalize_merchant)

    df["counted_amount"] = 0.0
    df["refunded_amount"] = 0.0
    df["net_amount"] = 0.0
    df["treatment"] = "Excluded"
    df["reason"] = ""
    df["matched_to"] = ""
    df["match_confidence"] = "not_applicable"

    # Deduplicate transaction IDs.
    seen_transaction_ids = set()

    if "transaction_id" in df.columns:
        for index, row in df.iterrows():
            transaction_id = row["transaction_id"]

            if pd.isna(transaction_id):
                continue

            transaction_id = str(transaction_id).strip()
            if not transaction_id:
                continue

            if transaction_id in seen_transaction_ids:
                df.at[index, "treatment"] = "Duplicate - excluded"
                df.at[index, "reason"] = (
                    "Same transaction ID was already counted."
                )
            else:
                seen_transaction_ids.add(transaction_id)

    # Classify transactions.
    for index, row in df.iterrows():
        if row["treatment"] == "Duplicate - excluded":
            continue

        status = row["status"]
        direction = row["direction"]

        if status == "success" and direction == "debit":
            df.at[index, "counted_amount"] = row["amount"]
            df.at[index, "net_amount"] = row["amount"]
            df.at[index, "treatment"] = "Counted"
            df.at[index, "reason"] = (
                "Successful payment counted as spending."
            )

        elif status == "failed":
            df.at[index, "treatment"] = "Failed - excluded"
            df.at[index, "reason"] = (
                "Failed payment is not actual spending."
            )

        elif status == "income":
            df.at[index, "treatment"] = "Income"
            df.at[index, "reason"] = (
                "Income is not treated as spending."
            )

        elif status == "not_a_transaction":
            df.at[index, "treatment"] = "Not a transaction"
            df.at[index, "reason"] = (
                "Message does not represent a transaction."
            )

        elif status == "refund":
            df.at[index, "treatment"] = "Refund pending match"
            df.at[index, "reason"] = (
                "Checking for an eligible original payment."
            )

        else:
            df.at[index, "treatment"] = "Unknown - excluded"
            df.at[index, "reason"] = (
                "Transaction status could not be confirmed."
            )

    # Process refunds chronologically.
    refund_indices = df.index[
        (df["status"] == "refund")
        & (df["treatment"] == "Refund pending match")
    ].tolist()

    refund_indices.sort(
        key=lambda i: (
            df.at[i, "_parsed_date"] is None,
            df.at[i, "_parsed_date"] or datetime.max,
        )
    )

    for refund_index in refund_indices:
        refund = df.loc[refund_index]

        refund_amount = float(refund["amount"])
        refund_merchant = refund["_merchant_key"]
        refund_date = refund["_parsed_date"]

        if (
            refund_amount <= 0
            or not refund_merchant
            or refund_date is None
        ):
            df.at[refund_index, "treatment"] = "Needs review"
            df.at[refund_index, "match_confidence"] = "low"
            df.at[refund_index, "reason"] = (
                "Refund amount, merchant, or date is missing."
            )
            continue

        candidates = []

        for debit_index, debit in df.iterrows():
            if debit["treatment"] not in [
                "Counted", "Partially refunded"
            ]:
                continue

            if debit["_merchant_key"] != refund_merchant:
                continue

            debit_date = debit["_parsed_date"]
            if debit_date is None:
                continue

            days_difference = (refund_date - debit_date).days

            if (
                days_difference < 0
                or days_difference > refund_window_days
            ):
                continue

            remaining_amount = (
                debit["counted_amount"] - debit["refunded_amount"]
            )

            if remaining_amount <= 0:
                continue

            candidates.append({
                "index": debit_index,
                "remaining": float(remaining_amount),
                "days": days_difference,
            })

        # No eligible payment.
        if not candidates:
            df.at[refund_index, "treatment"] = "Refund unmatched"
            df.at[refund_index, "match_confidence"] = "low"
            df.at[refund_index, "reason"] = (
                "No eligible payment found within the refund window."
            )
            continue

        # Prefer exactly one exact-amount candidate.
        exact_matches = [
            c for c in candidates
            if abs(c["remaining"] - refund_amount) < 0.01
        ]

        selected = None
        confidence = None

        if len(exact_matches) == 1:
            selected = exact_matches[0]
            confidence = "high"

        elif len(exact_matches) > 1:
            df.at[refund_index, "treatment"] = "Needs review"
            df.at[refund_index, "match_confidence"] = "low"
            df.at[refund_index, "reason"] = (
                "Multiple exact-amount payments found. "
                "Original payment needs confirmation."
            )
            continue

        elif len(candidates) == 1:
            selected = candidates[0]
            confidence = "medium"

        else:
            df.at[refund_index, "treatment"] = "Needs review"
            df.at[refund_index, "match_confidence"] = "low"
            df.at[refund_index, "reason"] = (
                "Multiple eligible payments found. "
                "Original payment needs confirmation."
            )
            continue

        # Apply refund to exactly one payment.
        debit_index = selected["index"]
        amount_to_match = min(
            refund_amount,
            selected["remaining"],
        )

        df.at[debit_index, "refunded_amount"] += amount_to_match
        df.at[debit_index, "net_amount"] -= amount_to_match

        if "message_id" in df.columns:
            matched_label = str(df.at[debit_index, "message_id"])
        elif "transaction_id" in df.columns:
            matched_label = str(df.at[debit_index, "transaction_id"])
        else:
            matched_label = str(debit_index)

        df.at[refund_index, "matched_to"] = matched_label
        df.at[refund_index, "refunded_amount"] = amount_to_match
        df.at[refund_index, "match_confidence"] = confidence

        if (
            df.at[debit_index, "refunded_amount"]
            >= df.at[debit_index, "counted_amount"] - 0.01
        ):
            df.at[debit_index, "treatment"] = (
                "Refunded - cancelled out"
            )
            df.at[debit_index, "reason"] = (
                "Original payment was fully refunded."
            )
        else:
            df.at[debit_index, "treatment"] = "Partially refunded"
            df.at[debit_index, "reason"] = (
                "Original payment was partially refunded."
            )

        df.at[refund_index, "treatment"] = "Refund matched"
        df.at[refund_index, "reason"] = (
            f"Matched ₹{amount_to_match:.2f} to {matched_label}."
        )

        if refund_amount > amount_to_match:
            unmatched_amount = refund_amount - amount_to_match
            df.at[refund_index, "reason"] += (
                f" ₹{unmatched_amount:.2f} needs manual review."
            )

    # Summary: only confirmed matched refunds reduce net spending.
    gross_spend = round(df["counted_amount"].sum(), 2)

    total_refunds_matched = round(
        df.loc[df["status"] == "refund", "refunded_amount"].sum(),
        2,
    )

    net_spend = round(df["net_amount"].sum(), 2)

    total_income = round(
        df.loc[df["status"] == "income", "amount"].sum(), 2
    )

    failed_count = int((df["status"] == "failed").sum())

    summary = {
        "gross_spend": gross_spend,
        "matched_refunds": total_refunds_matched,
        "net_spend": net_spend,
        "income": total_income,
        "failed_transactions": failed_count,
        "refund_window_days": refund_window_days,
    }

    df = df.drop(
        columns=["_parsed_date", "_merchant_key"],
        errors="ignore",
    )

    return df, summary
