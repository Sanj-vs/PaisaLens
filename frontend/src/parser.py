
import re
from datetime import datetime
from typing import Optional


# Common Indian banks and payment-service names.
BANK_NAMES = {
    "sbi", "state bank of india", "hdfc", "hdfc bank",
    "icici", "icici bank", "axis", "axis bank",
    "kotak", "kotak bank", "yes bank", "pnb",
    "punjab national bank", "bob", "bank of baroda",
    "paytm payments bank", "airtel payments bank"
}

NON_TRANSACTION_WORDS = [
    "otp", "one time password", "verification code",
    "special offer", "limited period offer", "loan offer",
    "bill reminder", "payment reminder", "statement",
    "shipped", "out for delivery", "delivered",
    "kyc", "sip reminder", "available balance",
    "minimum balance"
]

MERCHANT_ALIASES = {
    "zomato ltd": "Zomato",
    "zomato limited": "Zomato",
    "zomato": "Zomato",
    "swiggy": "Swiggy",
    "amazon": "Amazon",
    "amazon pay": "Amazon",
    "netflix": "Netflix",
    "bigbasket": "BigBasket",
    "big basket": "BigBasket",
    "jio": "Jio",
    "apollo pharmacy": "Apollo Pharmacy",
    "apollo": "Apollo Pharmacy",
    "uber": "Uber",
    "ola": "Ola",
    "rahul": "Rahul",
        "salary": "Salary",
    "pocket money": "Pocket Money",
    "tea shop": "Tea Shop",
    "electricity": "Electricity",
    "college": "College",
    "friend": "Friend",
    "spotify": "Spotify",
    "myntra": "Myntra",
    "croma": "Croma",
    "bookmyshow": "BookMyShow",
    "flipkart": "Flipkart",
}


def extract_amount(text: str) -> Optional[float]:
    """Extract transaction amounts in common Indian SMS formats."""

    patterns = [
        r"(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)",
        r"([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)",
        r"([\d,]+(?:\.\d{1,2})?)\s*(?:rupees?|rup(?:aye|ay|iya|iye))\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                return None

    return None

def extract_date(text: str, received_at: Optional[str] = None) -> Optional[str]:
    """Extract a date and return it in YYYY-MM-DD format."""

    patterns = [
        r"\b\d{4}-\d{2}-\d{2}\b",
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b",
        r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2}\b",
        r"\b\d{1,2}[-/\s][A-Za-z]{3,9}[-/\s]\d{4}\b",
    ]

    formats = [
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d-%m-%y",
        "%d/%m/%y",
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%d/%b/%Y",
        "%d/%B/%Y",
        "%d %b %Y",
        "%d %B %Y",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)

        if match:
            raw_date = match.group(0)

            for fmt in formats:
                try:
                    return datetime.strptime(
                        raw_date, fmt
                    ).strftime("%Y-%m-%d")
                except ValueError:
                    continue

    # Use the SMS received date when the message has no date.
    if received_at:
        try:
            return datetime.strptime(
                received_at[:10], "%Y-%m-%d"
            ).strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def extract_status(text: str) -> str:
    """Classify the SMS as a transaction or non-transaction."""

    lower = text.lower()

    # Future payments and reminders are not completed transactions.
    future_patterns = [
        "will be auto-debited",
        "will be debited",
        "scheduled for",
        "auto-debit on",
        "is due on",
        "due date",
        "pay now to avoid",
        "sip reminder",
        "bill reminder",
        "payment reminder",
    ]

    if any(phrase in lower for phrase in future_patterns):
        return "not_a_transaction"

    # Ignore OTPs, promotions and informational messages.
    if any(word in lower for word in NON_TRANSACTION_WORDS):
        return "not_a_transaction"

    # Failed transactions must be checked first.
    if any(word in lower for word in [
        "failed", "declined", "unsuccessful"
    ]):
        return "failed"

    if any(word in lower for word in [
        "refund", "reversed", "reversal", "money returned"
    ]):
        return "refund"

    if any(word in lower for word in [
        "salary", "credited", "received", "cashback",
        "money added", "deposit received"
    ]):
        return "income"

    # Successful or completed payments.
    if any(word in lower for word in [
        "successful", "successfully", "completed",
        "payment done", "paid successfully",
        "debited", "sent", "paid", "purchase",
        "spent", "withdrawn", "transferred",
        "deducted", "charged",
        "kat gaye", "kat gaya", "kat gya", "kat liye"
    ]):
        return "success"

    return "not_a_transaction"





def extract_direction(text: str, status: Optional[str] = None) -> Optional[str]:
    """Identify whether money moved out or in."""

    lower = text.lower()

    if status in ("refund", "income"):
        return "credit"

    if status == "not_a_transaction":
        return None

    if status in ("success", "failed"):
        return "debit"

    credit_words = [
        "credited", "received", "cashback",
        "refund", "money added", "deposit received"
    ]

    debit_words = [
        "debited", "sent", "paid", "purchase",
        "spent", "withdrawn", "transferred",
        "kat gaye", "kat gya"
    ]

    if any(word in lower for word in credit_words):
        return "credit"

    if any(word in lower for word in debit_words):
        return "debit"

    return None



def clean_merchant(candidate: str) -> Optional[str]:
    """Clean and normalize an extracted merchant name."""

    candidate = candidate.strip(" .,:;-")
    candidate = re.sub(r"\s+", " ", candidate)

    if not candidate:
        return None

    lower = candidate.lower().strip()

    # Reject generic phrases and bank names.
    if lower in BANK_NAMES:
        return None

    if lower in {
        "your account", "account", "refund", "payment",
        "upi", "bank", "the account", "unknown"
    }:
        return None

    # Remove common legal suffixes before alias matching.
    lower = re.sub(
        r"\s+(pvt\.?|private|limited|ltd\.?)$",
        "",
        lower
    ).strip()

    if lower in MERCHANT_ALIASES:
        return MERCHANT_ALIASES[lower]

    # Keep a readable version for merchants not in the alias list.
    return candidate[:1].upper() + candidate[1:]



def extract_merchant(text: str) -> Optional[str]:
    """Extract and normalize the merchant or source of a transaction."""

    # First, search for known merchants and sources.
    # Longer names are checked before shorter names.
    for alias in sorted(MERCHANT_ALIASES, key=len, reverse=True):
        pattern = r"(?<![A-Za-z0-9])" + re.escape(alias) + r"(?![A-Za-z0-9])"

        if re.search(pattern, text, re.IGNORECASE):
            return MERCHANT_ALIASES[alias]

    # Generic extraction for merchants not in our alias dictionary.
    patterns = [
        r"\bto\s+([A-Za-z][A-Za-z0-9 &'.-]{1,35})",
        r"\bfrom\s+([A-Za-z][A-Za-z0-9 &'.-]{1,35})",
        r"\bat\s+([A-Za-z][A-Za-z0-9 &'.-]{1,35})",
        r"\bfor\s+([A-Za-z][A-Za-z0-9 &'.-]{1,35})",
    ]

    stop_words = (
        r"\b(?:on|via|using|through|ref|upi|txn|transaction|"
        r"successful|successfully|failed|declined|completed|"
        r"was|as|amount|if|at|for|from|to)\b|[.;,:]"
    )

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            candidate = re.split(
                stop_words,
                match.group(1),
                maxsplit=1,
                flags=re.IGNORECASE
            )[0]

            merchant = clean_merchant(candidate)

            if merchant:
                return merchant

    return None

def parse_sms(text: str, received_at: Optional[str] = None) -> dict:
    """Convert one SMS into structured transaction fields."""

    if not isinstance(text, str) or not text.strip():
        return {
            "amount": None,
            "direction": None,
            "merchant": None,
            "date": None,
            "status": "not_a_transaction",
            "parser_source": "regex"
        }

    status = extract_status(text)

    return {
        "amount": extract_amount(text),
        "direction": extract_direction(text, status),
        "merchant": extract_merchant(text),
        "date": extract_date(text, received_at),
        "status": status,
        "parser_source": "regex"
    }


if __name__ == "__main__":
    sample = (
        "Rs. 250.00 debited from your account "
        "for payment to Swiggy on 18-11-2026"
    )

    print("PAISALENS SMS PARSER TEST")
    print(parse_sms(sample))
