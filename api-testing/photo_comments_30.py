import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Backend URL
BASE_URL = "http://localhost:3000"

# Paste your fresh JWT token
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWExMDMxNC1kMjk0LTQwNWQtOTQzYS1kNjNhNzNhMDJlYjUiLCJlbWFpbCI6InByb0BleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOnRydWUsInBsYW4iOiJwcm8iLCJpYXQiOjE3ODg5NDQwODEsImV4cCI6MTc4OTU0ODg4MX0.OmbCOQL9ZlLVYnmX33cNP_6lMmh3oLMwy1m6Prpybl4"

# Authorization
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Connect to PostgreSQL
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Get one valid photo ID
cursor.execute("""
    SELECT id
    FROM public.photos
    ORDER BY id ASC
    LIMIT 1;
""")

photo_id = cursor.fetchone()[0]

cursor.close()
conn.close()

print("Photo ID used:", photo_id)

successful = 0
failed = 0

# Post 30 comments
for number in range(1, 31):

    payload = {
        "text": f"Test comment {number}"
    }

    response = requests.post(
        f"{BASE_URL}/photos/{photo_id}/comments",
        headers=headers,
        json=payload
    )

    print(
        f"{number}. Comment → Status: {response.status_code}"
    )

    if response.status_code == 201:
        successful += 1
        print("   Comment: SUCCESS")

    elif response.status_code == 403:
        failed += 1
        print("   403 QUOTA/PERMISSION:")
        print("  ", response.text)

        print("\nQuota limit reached. Stopping script.")
        break

    else:
        failed += 1
        print("   ERROR:")
        print("  ", response.text)

    time.sleep(0.1)


# Final result
print("\n========== FINAL RESULT ==========")
print("Successful comments:", successful)
print("Failed:", failed)