
import os
import time

from dotenv import load_dotenv
from google import genai

load_dotenv()


def generate_text(prompt, model="gemini-3.5-flash-lite"):
    """Send a prompt to Gemini with retries for temporary errors."""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from .env")

    client = genai.Client(api_key=api_key)

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt
            )

            if not response.text:
                raise RuntimeError("Gemini returned an empty response.")

            return response.text.strip()

        except Exception as error:
            if attempt == 2:
                raise

            print(f"Gemini attempt {attempt + 1} failed: {error}")
            time.sleep(2 ** (attempt + 1))
