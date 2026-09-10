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

# Get 11 auditions that the Pro user has NOT already applied to
cursor.execute("""
    SELECT a.id
    FROM public.auditions a
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.applications ap
        WHERE ap.audition_id = a.id
        AND ap.applicant_id = (
            SELECT id
            FROM public.users
            WHERE email = 'pro@example.com'
        )
    )
    ORDER BY a.id ASC
    LIMIT 11;
""")

audition_ids = [row[0] for row in cursor.fetchall()]

# Close database connection
cursor.close()
conn.close()

print("Fresh auditions found:", len(audition_ids))

successful = 0
failed = 0

# Apply to 11 different fresh auditions
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

    # Daily application quota reached
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
print("Fresh auditions found:", len(audition_ids))
print("Auditions attempted:", len(audition_ids))
print("Successful applications:", successful)
print("Failed applications:", failed)