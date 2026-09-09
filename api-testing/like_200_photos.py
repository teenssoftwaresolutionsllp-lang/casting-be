import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

# Load values from .env
load_dotenv()

# Backend URL
BASE_URL = "http://localhost:3000"

# Paste your fresh JWT token here
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWExMDMxNC1kMjk0LTQwNWQtOTQzYS1kNjNhNzNhMDJlYjUiLCJlbWFpbCI6InByb0BleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOnRydWUsInBsYW4iOiJwcm8iLCJpYXQiOjE3ODg5NDQwODEsImV4cCI6MTc4OTU0ODg4MX0.OmbCOQL9ZlLVYnmX33cNP_6lMmh3oLMwy1m6Prpybl4"

# Authorization header
headers = {
    "Authorization": f"Bearer {TOKEN}"
}

# Connect to PostgreSQL
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Get photo IDs from database
cursor.execute("""
    SELECT id
    FROM public.photos
    ORDER BY id ASC
    LIMIT 204;
""")

photo_ids = [row[0] for row in cursor.fetchall()]

# Close database connection
cursor.close()
conn.close()

print("Total photos found in database:", len(photo_ids))

# Counters
successful = 0
failed = 0

# Like photos one by one
for number, photo_id in enumerate(photo_ids, start=1):

    response = requests.post(
        f"{BASE_URL}/photos/{photo_id}/like",
        headers=headers
    )

    print(
        f"{number}. Photo {photo_id} → "
        f"Status: {response.status_code}"
    )

    # Successful API response
    if response.status_code == 200:

        data = response.json()

        # Like was created
        if data.get("liked") is True:

            successful += 1

            print("   Like: SUCCESS")

        # Photo was already liked, so API toggled it to unlike
        elif data.get("liked") is False:

            # Like it again
            response2 = requests.post(
                f"{BASE_URL}/photos/{photo_id}/like",
                headers=headers
            )

            if response2.status_code == 200:

                data2 = response2.json()

                if data2.get("liked") is True:
                    successful += 1
                    print("   Like: SUCCESS (after re-like)")
                else:
                    failed += 1
                    print("   Like: FAILED")

            else:
                failed += 1
                print("   Re-like failed:", response2.text)

    # Quota reached
    elif response.status_code == 403:

        failed += 1

        print("   403 QUOTA/PERMISSION:")
        print("  ", response.text)

        print("\nQuota limit reached. Stopping script.")
        break

    # Other errors
    else:

        failed += 1

        print("   ERROR:")
        print("  ", response.text)

    # Small delay between requests
    time.sleep(0.1)


# Final result
print("\n========== FINAL RESULT ==========")
print("Photos found:", len(photo_ids))
print("Successful likes:", successful)
print("Failed:", failed)