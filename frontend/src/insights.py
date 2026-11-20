
import json

from ai_client import generate_text


def create_rule_based_insights(summary, category_spend):
    """
    Generate factual insights using Python only.
    These insights work even when Gemini is unavailable.
    """

    insights = []

    gross_spend = float(summary.get("gross_spend", 0) or 0)
    matched_refunds = float(summary.get("matched_refunds", 0) or 0)
    net_spend = float(summary.get("net_spend", 0) or 0)
    income = float(summary.get("income", 0) or 0)
    failed = int(summary.get("failed_transactions", 0) or 0)

    insights.append(
        f"Your recorded gross spending is ₹{gross_spend:,.2f}, "
        f"and your true net spending after matched refunds is "
        f"₹{net_spend:,.2f}."
    )

    if matched_refunds > 0:
        insights.append(
            f"You received ₹{matched_refunds:,.2f} in matched refunds. "
            "These refunds have been deducted from net spending."
        )

    if category_spend:
        valid_categories = {
            category: float(amount)
            for category, amount in category_spend.items()
            if float(amount) > 0
        }

        if valid_categories:
            highest_category = max(
                valid_categories,
                key=valid_categories.get
            )

            highest_amount = valid_categories[highest_category]

            insights.append(
                f"{highest_category} is your highest spending category "
                f"at ₹{highest_amount:,.2f}."
            )

    if failed > 0:
        insights.append(
            f"{failed} failed transaction(s) were excluded "
            "from your spending total."
        )

    if income > 0:
        insights.append(
            f"Your recorded income is ₹{income:,.2f}. "
            "Income is kept separate from spending calculations."
        )

    return insights


def generate_insights(summary, category_spend):
    """
    Generate AI explanations using Gemini.
    Fall back to Python-generated insights if Gemini fails.

    Gemini only explains pre-calculated facts.
    It never calculates or changes financial amounts.
    """

    rule_insights = create_rule_based_insights(
        summary,
        category_spend
    )

    facts = {
        "summary": summary,
        "category_spend": category_spend,
        "verified_insights": rule_insights
    }

    prompt = f"""
You are PaisaLens, a friendly personal finance assistant.

Explain the following verified financial insights in simple,
helpful language for an Indian user.

Verified financial data:
{json.dumps(facts, indent=2)}

Rules:
1. Use only the supplied financial data and verified insights.
2. Never calculate, modify, estimate, or invent financial amounts.
3. Do not invent transactions, merchants, or spending patterns.
4. Do not treat income as a refund.
5. Do not claim that the user saved money unless the data proves it.
6. Give 3 to 5 short, useful bullet-point insights.
7. Include practical suggestions only when supported by the data.
8. Use ₹ for Indian currency.
9. Keep the explanation friendly and easy to understand.

Return only the insights as bullet points.
"""

    try:
        ai_response = generate_text(prompt)

        return {
            "source": "gemini",
            "insights": ai_response
        }

    except Exception as error:
        print(f"Gemini insights unavailable: {error}")

        return {
            "source": "rules",
            "insights": rule_insights,
            "message": "AI unavailable, used rules only."
        }
