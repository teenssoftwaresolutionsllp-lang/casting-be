import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Backend URL
BASE_URL = "http://localhost:3000"

# Pro user's JWT token
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWExMDMxNC1kMjk0LTQwNWQtOTQzYS1kNjNhNzNhMDJlYjUiLCJlbWFpbCI6InByb0BleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOnRydWUsInBsYW4iOiJwcm8iLCJpYXQiOjE3ODkwMTY1NjYsImV4cCI6MTc4OTYyMTM2Nn0.P07yWtVyk8OqOfF9Jpl9d7axwQIaT8IWe3_vNNC_0bI"

# Authorization headers
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Connect to PostgreSQL
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Get 10 different auditions
cursor.execute("""
    SELECT id
    FROM public.auditions
    ORDER BY id ASC
    LIMIT 10;
""")

audition_ids = [row[0] for row in cursor.fetchall()]

cursor.close()
conn.close()

print("Auditions found:", len(audition_ids))

successful = 0
failed = 0

# Apply to 10 auditions
for number, audition_id in enumerate(audition_ids, start=1):

    payload = {
        "coverLetter": f"I am interested in this audition. Test application {number}."
    }

    response = requests.post(
        f"{BASE_URL}/auditions/{audition_id}/apply",
        headers=headers,
        json=payload
    )

    print(
        f"{number}. Audition {audition_id} → "
        f"Status: {response.status_code}"
    )

    # Successful application
    if response.status_code in [200, 201]:
        successful += 1
        print("   Application: SUCCESS")

    # Quota exceeded
    elif response.status_code == 403:
        failed += 1
        print("   Application: BLOCKED - QUOTA LIMIT")
        print("  ", response.text)

    # Other errors
    else:
        failed += 1
        print("   Application: FAILED")
        print("  ", response.text)

    time.sleep(0.2)


# Final result
print("\n========== FINAL RESULT ==========")
print("Auditions attempted:", len(audition_ids))
print("Successful applications:", successful)
print("Failed applications:", failed)