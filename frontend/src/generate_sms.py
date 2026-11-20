import csv
import random
from datetime import date
from pathlib import Path

# ---------------------------------------------------------------
# PAISALENS - SYNTHETIC SMS DATA GENERATOR (v2)
#
# Creates two files inside the project's "data" folder:
#   sample_sms.csv    -> what your parser sees (no answers)
#   test_labeled.csv  -> same messages WITH the correct answers
#
# Put this script in a folder like  PaisaLens/scripts/
# The data folder will be created at  PaisaLens/data/
# ---------------------------------------------------------------

random.seed(42)  # same seed = same dataset every time you run it

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)

TOTAL_MESSAGES = 80

# Categories match the PaisaLens dashboard.
# "Income" is NOT spending (salary, pocket money, money from friends).
VALID_CATEGORIES = {
    "Food", "Shopping", "Travel", "Bills",
    "Entertainment", "Others", "Income", ""
}

# status values:
#   success            -> money left your account (counts as spending)
#   failed             -> payment failed (must NOT count)
#   refund             -> money back from a purchase (reduces spending)
#   income             -> salary / pocket money (NOT a refund, NOT spending)
#   not_a_transaction  -> OTPs, offers, reminders (must be ignored)
VALID_STATUSES = {"success", "failed", "refund", "income", "not_a_transaction"}

messages = []


def random_time():
    return f"{random.randint(8, 22):02d}:{random.randint(0, 59):02d}"


def add_message(
    message_id, sms_text, difficulty,
    amount, direction, merchant, txn_date, status, category,
    transaction_id="", match_to="", duplicate_group="",
    received_date=None,
):
    """Adds one SMS plus its correct answers.

    transaction_id: fill ONLY if the reference number is written in the SMS.
    received_date: when the phone received the SMS (defaults to txn_date).
    """
    received_date = received_date or txn_date
    messages.append({
        "message_id": message_id,
        "received_at": f"{received_date} {random_time()}",
        "sms_text": sms_text,
        "difficulty": difficulty,
        "expected_amount": amount,
        "expected_direction": direction,
        "expected_merchant": merchant,
        "expected_date": txn_date,
        "expected_status": status,
        "expected_category": category,
        "expected_transaction_id": transaction_id,
        "expected_match_to": match_to,
        "expected_duplicate_group": duplicate_group,
    })


def add_non_transaction(message_id, sms_text, difficulty, received_date):
    """Messages that look financial but are NOT transactions."""
    add_message(
        message_id, sms_text, difficulty,
        "", "", "", "", "not_a_transaction", "",
        received_date=received_date,
    )


# ---------------------------------------------------------------
# 1. CURATED MESSAGES (MSG001 - MSG030)
# ---------------------------------------------------------------

add_message(
    "MSG001",
    "SBI: Rs.1200.00 debited from A/c XX1234 to Zomato on 15-11-2026. "
    "UPI Ref 100001.",
    "easy", 1200, "debit", "Zomato", "2026-11-15", "success", "Food",
    "100001",
)

add_message(
    "MSG002",
    "HDFC Bank: Your account is credited with Rs.300.00 from Zomato "
    "refund on 16-11-2026.",
    "easy", 300, "credit", "Zomato", "2026-11-16", "refund", "Food",
    match_to="MSG001",
)

# Deliberately has NO date in the text. The parser must use received_at.
add_message(
    "MSG003",
    "Rs.500 payment to Amazon failed. Amount will be reversed if debited.",
    "hard", 500, "debit", "Amazon", "2026-11-15", "failed", "Shopping",
)

add_message(
    "MSG004",
    "UPI: ₹500 paid successfully to Amazon on 15-11-2026. Ref 100004.",
    "easy", 500, "debit", "Amazon", "2026-11-15", "success", "Shopping",
    "100004",
)

# Refund with no matching purchase in the dataset (orphan refund).
add_message(
    "MSG005",
    "Swiggy: Refund of Rs.250 credited to your account on 16-11-2026.",
    "hard", 250, "credit", "Swiggy", "2026-11-16", "refund", "Food",
)

add_message(
    "MSG006",
    "UPI payment Rs.700 to ZOMATO LTD successful on 14-11-2026. "
    "Ref 100006.",
    "medium", 700, "debit", "Zomato", "2026-11-14", "success", "Food",
    "100006",
)

add_message(
    "MSG007",
    "Netflix: Rs.649 debited from your account on 01-10-2026.",
    "easy", 649, "debit", "Netflix", "2026-10-01", "success",
    "Entertainment",
)

add_message(
    "MSG008",
    "Netflix refund Rs.649 credited on 25-10-2026. "
    "Transaction reference 100008.",
    "medium", 649, "credit", "Netflix", "2026-10-25", "refund",
    "Entertainment", "100008", 
)

add_message(
    "MSG009",
    "Your account has been credited with salary of Rs.25,000 "
    "on 01-11-2026.",
    "easy", 25000, "credit", "Salary", "2026-11-01", "income", "Income",
)

add_message(
    "MSG010",
    "Rs.2000 received as pocket money on 05-11-2026.",
    "easy", 2000, "credit", "Pocket Money", "2026-11-05", "income",
    "Income",
)

add_message(
    "MSG011",
    "Rs.120 kat gaye Zomato ko. UPI payment successful on 16-11-2026.",
    "hard", 120, "debit", "Zomato", "2026-11-16", "success", "Food",
)

add_message(
    "MSG012",
    "Paid Rs.350 to Ola using UPI on 16-11-2026. Ref 100012.",
    "easy", 350, "debit", "Ola", "2026-11-16", "success", "Travel",
    "100012",
)

add_message(
    "MSG013",
    "Your UPI transaction of Rs 1,800 to Myntra was successful on "
    "13-11-2026. Ref 100013.",
    "medium", 1800, "debit", "Myntra", "2026-11-13", "success", "Shopping",
    "100013",
)

add_message(
    "MSG014",
    "Myntra refund Rs.300 credited to your account on 17-11-2026.",
    "medium", 300, "credit", "Myntra", "2026-11-17", "refund", "Shopping",
    match_to="MSG013",
)

add_message(
    "MSG015",
    "Rs 99 debited for Spotify Premium subscription on 10-11-2026.",
    "medium", 99, "debit", "Spotify", "2026-11-10", "success",
    "Entertainment",
)

add_message(
    "MSG016",
    "Jio recharge successful. Rs.299 paid on 12-11-2026.",
    "medium", 299, "debit", "Jio", "2026-11-12", "success", "Bills",
)

add_message(
    "MSG017",
    "UPI payment of Rs.1000 to Croma successful on 11-11-2026. "
    "Ref 100017.",
    "easy", 1000, "debit", "Croma", "2026-11-11", "success", "Shopping",
    "100017",
)

add_message(
    "MSG018",
    "Rs.80 paid to Tea Shop through UPI on 17-11-2026.",
    "easy", 80, "debit", "Tea Shop", "2026-11-17", "success", "Food",
)

add_message(
    "MSG019",
    "Electricity bill payment Rs.1,450.00 successful on 08Nov26.",
    "medium", 1450, "debit", "Electricity", "2026-11-08", "success",
    "Bills",
)

add_message(
    "MSG020",
    "Rs.5,000 transferred to Rahul using UPI on 09-11-2026.",
    "hard", 5000, "debit", "Rahul", "2026-11-09", "success", "Others",
)

add_message(
    "MSG021",
    "Received Rs.1500 from friend through UPI on 10-11-2026.",
    "easy", 1500, "credit", "Friend", "2026-11-10", "income", "Income",
)

add_message(
    "MSG022",
    "BigBasket order payment Rs.650 successful on 12-11-2026.",
    "easy", 650, "debit", "BigBasket", "2026-11-12", "success", "Food",
)

add_message(
    "MSG023",
    "Payment of Rs.900 to Apollo Pharmacy completed on 13-Nov-2026.",
    "medium", 900, "debit", "Apollo Pharmacy", "2026-11-13", "success",
    "Others",
)

add_message(
    "MSG024",
    "College fee payment INR 12,000.00 successful on 05/11/2026.",
    "medium", 12000, "debit", "College", "2026-11-05", "success",
    "Others",
)

add_message(
    "MSG025",
    "UPI payment Rs.450 to BookMyShow successful on 14-11-2026.",
    "easy", 450, "debit", "BookMyShow", "2026-11-14", "success",
    "Entertainment",
)

# Refund with no matching purchase in the dataset (orphan refund).
add_message(
    "MSG026",
    "Rs.400 received from Flipkart as reversal for cancelled order "
    "on 15-11-2026.",
    "medium", 400, "credit", "Flipkart", "2026-11-15", "refund",
    "Shopping",
)

add_message(
    "MSG027",
    "Payment failed: Rs.850 to Uber on 16-11-2026. "
    "No amount has been deducted.",
    "hard", 850, "debit", "Uber", "2026-11-16", "failed", "Travel",
)

# MSG028, MSG029 and MSG030 are three messages about ONE payment.
# All three are in DUP001. The first one (MSG028) is the original.
add_message(
    "MSG028",
    "UPI: Rs.420 paid to Swiggy on 16-11-2026. Transaction ID 100028.",
    "easy", 420, "debit", "Swiggy", "2026-11-16", "success", "Food",
    "100028", duplicate_group="DUP001",
)

add_message(
    "MSG029",
    "SBI: Rs.420 debited for Swiggy on 16-11-2026. UPI Ref 100028.",
    "hard", 420, "debit", "Swiggy", "2026-11-16", "success", "Food",
    "100028", duplicate_group="DUP001",
)

add_message(
    "MSG030",
    "UPI payment Rs.420 to Swiggy successful on 16-11-2026. Ref 100028.",
    "hard", 420, "debit", "Swiggy", "2026-11-16", "success", "Food",
    "100028", duplicate_group="DUP001",
)


# ---------------------------------------------------------------
# 2. NON-TRANSACTION MESSAGES (MSG031 - MSG040)
# A real inbox is full of these. The parser must ignore them.
# ---------------------------------------------------------------

add_non_transaction(
    "MSG031",
    "123456 is your OTP for login to SBI YONO. Do not share it with "
    "anyone.",
    "easy", "2026-11-16",
)

add_non_transaction(
    "MSG032",
    "Get 20% off on your next Swiggy order! Use code SAVE20. T&C apply.",
    "easy", "2026-11-14",
)

add_non_transaction(
    "MSG033",
    "Reminder: Your Jio postpaid bill of Rs.499 is due on 25-11-2026. "
    "Pay now to avoid late fees.",
    "hard", "2026-11-17",
)

add_non_transaction(
    "MSG034",
    "Your HDFC credit card statement for Nov 2026 is ready. "
    "Total due Rs.8,450. Pay by 05-12-2026.",
    "hard", "2026-11-17",
)

add_non_transaction(
    "MSG035",
    "Pre-approved personal loan of Rs.5,00,000 just for you! "
    "Click to apply.",
    "medium", "2026-11-12",
)

add_non_transaction(
    "MSG036",
    "Your Amazon order #405-1234567 has been shipped. "
    "Arriving 20-11-2026.",
    "medium", "2026-11-16",
)

add_non_transaction(
    "MSG037",
    "A/c XX1234 balance: Rs.14,320.50 as on 17-11-2026.",
    "medium", "2026-11-17",
)

add_non_transaction(
    "MSG038",
    "Dear Customer, KYC update pending. Visit your branch with documents "
    "to avoid account freeze.",
    "easy", "2026-11-09",
)

add_non_transaction(
    "MSG039",
    "Rs.3,000 will be auto-debited on 01-12-2026 for your SIP.",
    "hard", "2026-11-15",
)

add_non_transaction(
    "MSG040",
    "4821 is your OTP for Zomato order. Valid for 10 minutes.",
    "easy", "2026-11-13",
)


# ---------------------------------------------------------------
# 3. GENERATED MESSAGES (MSG041 - MSG080)
# Different templates, amount styles and date styles so a single
# regex cannot solve everything.
# ---------------------------------------------------------------

merchants = [
    ("Zomato", "Food"),
    ("Swiggy", "Food"),
    ("Ola", "Travel"),
    ("Uber", "Travel"),
    ("Amazon", "Shopping"),
    ("Myntra", "Shopping"),
    ("BigBasket", "Food"),
    ("Jio", "Bills"),
    ("Spotify", "Entertainment"),
    ("Apollo Pharmacy", "Others"),
]

banks = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank"]

# (template text, does the SMS contain a reference number?)
debit_templates = [
    ("{bank}: {amt} debited from A/c {acct} to {merchant} on {date}. "
     "UPI Ref {ref}.", True),
    ("UPI payment {amt} to {merchant} successful on {date}. Ref {ref}.",
     True),
    ("Paid {amt} to {merchant} via UPI on {date}. Txn ID {ref}. "
     "Avl Bal: Rs.{bal}", True),
    ("Dear Customer, {amt} spent at {merchant} on {date} using your "
     "{bank} Card {acct}.", False),
]

failed_template = (
    "{amt} payment to {merchant} failed on {date}. "
    "Amount, if debited, will be reversed in 3-5 days."
)


def format_amount(amount, style):
    if style == 0:
        return f"Rs.{amount}"
    if style == 1:
        return f"Rs {amount:,}"
    if style == 2:
        return f"INR {amount:,.2f}"
    return f"₹{amount:,}"


def format_date(day, style):
    d = date(2026, 11, day)
    if style == 0:
        return d.strftime("%d-%m-%Y")
    if style == 1:
        return d.strftime("%d/%m/%Y")
    if style == 2:
        return d.strftime("%d%b%y")
    return d.strftime("%d-%b-%Y")


# Remember every (merchant, amount, date) already used, so a random
# message can never accidentally copy a curated one.
used = {
    (m["expected_merchant"], m["expected_amount"], m["expected_date"])
    for m in messages
}

for i in range(40):
    is_failed = (i % 8 == 7)  # 5 of the 40 messages are failed payments

    while True:
        merchant, category = random.choice(merchants)
        amount = random.choice([99, 149, 199, 250, 399, 499, 799, 999, 1250])
        day = random.randint(1, 17)
        iso_date = f"2026-11-{day:02d}"
        if (merchant, amount, iso_date) not in used:
            used.add((merchant, amount, iso_date))
            break

    amount_style = random.randint(0, 3)
    date_style = random.randint(0, 3)
    amt_text = format_amount(amount, amount_style)
    date_text = format_date(day, date_style)
    message_id = f"MSG{41 + i:03d}"

    if is_failed:
        sms_text = failed_template.format(
            amt=amt_text, merchant=merchant, date=date_text
        )
        add_message(
            message_id, sms_text, "medium",
            amount, "debit", merchant, iso_date, "failed", category,
        )
        continue

    template_index = random.randrange(len(debit_templates))
    template, has_ref = debit_templates[template_index]
    ref = f"{200000 + i}"

    sms_text = template.format(
        bank=random.choice(banks),
        amt=amt_text,
        merchant=merchant,
        date=date_text,
        ref=ref,
        acct="XX" + str(random.randint(1000, 9999)),
        bal=f"{random.randint(2000, 40000):,}",
    )

    # Harder if: unusual date format, extra numbers (balance), no ref
    difficulty = "easy"
    if date_style >= 2 or template_index >= 2:
        difficulty = "medium"

    add_message(
        message_id, sms_text, difficulty,
        amount, "debit", merchant, iso_date, "success", category,
        ref if has_ref else "",
    )


# ---------------------------------------------------------------
# 4. VALIDATE THE DATASET
# Catches label mistakes before they cause confusing test scores.
# ---------------------------------------------------------------

assert len(messages) == TOTAL_MESSAGES, (
    f"Expected {TOTAL_MESSAGES} messages, got {len(messages)}"
)

all_ids = [m["message_id"] for m in messages]
assert len(set(all_ids)) == len(all_ids), "Duplicate message_id found"

for m in messages:
    assert m["expected_status"] in VALID_STATUSES, m["message_id"]
    assert m["expected_category"] in VALID_CATEGORIES, m["message_id"]
    assert m["difficulty"] in {"easy", "medium", "hard"}, m["message_id"]

    if m["expected_match_to"]:
        assert m["expected_match_to"] in all_ids, (
            f"{m['message_id']} matches a message that does not exist"
        )

    # A transaction id may only be labelled if it is in the SMS text
    if m["expected_transaction_id"]:
        assert m["expected_transaction_id"] in m["sms_text"], (
            f"{m['message_id']} expects an id that is not in its text"
        )

group_sizes = {}
for m in messages:
    group = m["expected_duplicate_group"]
    if group:
        group_sizes[group] = group_sizes.get(group, 0) + 1
for group, size in group_sizes.items():
    assert size >= 2, f"Duplicate group {group} has only one message"


# ---------------------------------------------------------------
# 5. WRITE THE CSV FILES
# ---------------------------------------------------------------

sample_file = DATA_DIR / "sample_sms.csv"
test_file = DATA_DIR / "test_labeled.csv"

# The sample file looks like real input: no difficulty, no answers.
sample_fields = ["message_id", "received_at", "sms_text"]

label_fields = [
    "message_id",
    "received_at",
    "sms_text",
    "difficulty",
    "expected_amount",
    "expected_direction",
    "expected_merchant",
    "expected_date",
    "expected_status",
    "expected_category",
    "expected_transaction_id",
    "expected_match_to",
    "expected_duplicate_group",
]

with open(sample_file, "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=sample_fields)
    writer.writeheader()
    for message in messages:
        writer.writerow({key: message[key] for key in sample_fields})

with open(test_file, "w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=label_fields)
    writer.writeheader()
    writer.writerows(messages)


# ---------------------------------------------------------------
# 6. PRINT A SUMMARY
# ---------------------------------------------------------------

def count_by(field):
    counts = {}
    for m in messages:
        counts[m[field]] = counts.get(m[field], 0) + 1
    return counts


print("\n===================================")
print("       PAISALENS DATA GENERATOR")
print("===================================")
print(f"Total messages: {len(messages)}")

print("\nBy difficulty:")
for name, count in sorted(count_by("difficulty").items()):
    print(f"  {name}: {count}")

print("\nBy status:")
for name, count in sorted(count_by("expected_status").items()):
    print(f"  {name}: {count}")

print("\nFiles created successfully:")
print(sample_file)
print(test_file)

print("\nPaisaLens dataset generation complete!")
