import os
import sys
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Connect existing PaisaLens modules.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_SRC = PROJECT_ROOT / "frontend" / "src"

sys.path.insert(0, str(FRONTEND_SRC))

from parser import parse_sms
from categorizer import categorize_transaction
from net_spend import calculate_net_spend
from insights import generate_insights


app = FastAPI(
    title="PaisaLens API",
    description="AI-powered personal finance and smart budgeting backend",
    version="1.0.0"
)
# Allow the local frontend and deployed frontend to access the API.
frontend_origins = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:5173"
).split(",")

frontend_origins = [
    origin.strip()
    for origin in frontend_origins
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models.
class SMSRequest(BaseModel):
    sms_text: str
    received_at: str | None = None


class SMSItem(BaseModel):
    sms_text: str
    received_at: str | None = None


class BatchRequest(BaseModel):
    messages: list[SMSItem] = Field(min_length=1)


@app.get("/")
def home():
    return {
        "message": "Welcome to PaisaLens API!",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": "PaisaLens"
    }


@app.get("/modules")
def check_modules():
    return {
        "status": "success",
        "modules": {
            "parser": "loaded",
            "categorizer": "loaded",
            "net_spend": "loaded"
        }
    }


# Process one SMS.
@app.post("/parse-sms")
def parse_sms_endpoint(request: SMSRequest):
    transaction = parse_sms(
        request.sms_text,
        request.received_at
    )

    transaction["category"] = categorize_transaction(transaction)

    return {
        "status": "success",
        "transaction": transaction
    }


# Process multiple SMS messages and calculate net spending.

@app.post("/process-transactions")
def process_transactions(request: BatchRequest):
    parsed_transactions = []

    # Step 1: Parse each SMS and assign its ID.
    for index, message in enumerate(request.messages, start=1):
        transaction = parse_sms(
            message.sms_text,
            message.received_at
        )

        transaction["category"] = categorize_transaction(transaction)
        transaction["message_id"] = f"MSG{index:03d}"

        parsed_transactions.append(transaction)

    # Step 2: Calculate spending and refunds.
    transactions_df = pd.DataFrame(parsed_transactions)
    processed_df, summary = calculate_net_spend(transactions_df)

    # Calculate all refunds received, including unmatched refunds.
    total_refunds_received = round(
        processed_df.loc[
            processed_df["status"] == "refund", "amount"
        ].sum(),
        2
    )

    summary["total_refunds_received"] = total_refunds_received

    # Step 3: Calculate category-wise spending.
    category_spend = (
        processed_df[processed_df["direction"] == "debit"]
        .groupby("category")["net_amount"]
        .sum()
        .round(2)
        .to_dict()
    )
    # Step 3: Generate AI-powered financial insights.
    insight_result = generate_insights(summary, category_spend)
    # Step 4: Prepare transactions for JSON response.
    transaction_results = []

    for row in processed_df.to_dict(orient="records"):
        clean_row = {}

        for key, value in row.items():
            if pd.isna(value):
                clean_row[key] = None
            elif hasattr(value, "item"):
                clean_row[key] = value.item()
            else:
                clean_row[key] = value

        transaction_results.append(clean_row)

    return {
        "status": "success",
        "summary": summary,
        "category_spend": category_spend,
        "insights": insight_result,
        "transactions": transaction_results
    }
