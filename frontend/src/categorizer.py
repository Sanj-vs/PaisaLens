
import re


CATEGORY_KEYWORDS = {
    "Food": [
        "zomato", "swiggy", "restaurant", "cafe",
        "dominos", "pizza", "food", "burger",
        "mcdonald", "kfc", "tea shop"
    ],

    "Travel": [
        "uber", "ola", "rapido", "irctc",
        "makemytrip", "redbus", "flight",
        "metro", "bus", "railway"
    ],

    "Shopping": [
        "amazon", "flipkart", "myntra",
        "ajio", "meesho", "nykaa",
        "retail", "shopping", "croma"
    ],

    "Bills and Recharge": [
        "airtel", "jio", "vi", "bsnl",
        "electricity", "bescom", "water bill",
        "recharge", "broadband", "gas bill"
    ],

    "Entertainment": [
        "netflix", "spotify", "prime video",
        "hotstar", "youtube", "bookmyshow",
        "gaming"
    ],

    "Groceries": [
        "bigbasket", "blinkit", "zepto",
        "dmart", "instamart", "grocery",
        "supermarket"
    ],

    "Health": [
        "pharmacy", "apollo", "medplus",
        "hospital", "clinic", "medical",
        "doctor"
    ],

    "Education": [
        "college", "university", "school",
        "udemy", "coursera", "education",
        "tuition"
    ],

    "Transfers": [
        "transfer", "imps", "neft", "rtgs",
        "sent to", "received from"
    ]
}


def normalize_text(value):
    if value is None:
        return ""

    return str(value).lower().strip()


def categorize_transaction(transaction):
    merchant = normalize_text(transaction.get("merchant"))
    sms_text = normalize_text(transaction.get("sms_text"))

    direction = normalize_text(transaction.get("direction"))
    status = normalize_text(transaction.get("status"))

    # Actual income is different from a refund.
    if status == "income":
        return "Income"

    # Ignore non-transaction messages.
    if status == "not_a_transaction":
        return "Others"

    # Refunds must be categorized by merchant,
    # not classified as income just because they are credits.
    combined_text = f"{merchant} {sms_text}"

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            pattern = r"(?<!\w)" + re.escape(keyword) + r"(?!\w)"

            if re.search(pattern, combined_text):
                return category

    # Other genuine credits are income, unless they are refunds.
    if direction == "credit" and status != "refund":
        return "Income"

    return "Others"


def categorize_transactions(transactions):
    result = transactions.copy()

    result["category"] = result.apply(
        categorize_transaction,
        axis=1
    )

    return result
