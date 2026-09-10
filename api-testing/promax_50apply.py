import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:3000"

# USE PRO MAX USER TOKEN HERE
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJlZWE4MS01MDExLTRkMjQtODQ5Yi01NTcxNWEwOWRjNzAiLCJlbWFpbCI6InByb21heEBleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOnRydWUsInBsYW4iOiJwcm9fbWF4IiwiaWF0IjoxNzg5MDIxNzc4LCJleHAiOjE3ODk2MjY1Nzh9.aW-y3I94HPC-OWpjnaaERbpbyhKCDMvmRh0TFrmE4P8"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Connect to database
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Get 50 fresh auditions created by other users
cursor.execute("""
    SELECT a.id
    FROM public.auditions a
    WHERE a.creator_id != (
        SELECT id
        FROM public.users
        WHERE email = 'promax@example.com'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM public.applications ap
        WHERE ap.audition_id = a.id
        AND ap.applicant_id = (
            SELECT id
            FROM public.users
            WHERE email = 'promax@example.com'
        )
    )
    ORDER BY a.id ASC
    LIMIT 50;
""")

audition_ids = [row[0] for row in cursor.fetchall()]

cursor.close()
conn.close()

print("Fresh auditions found:", len(audition_ids))

successful = 0
failed = 0

for number, audition_id in enumerate(audition_ids, start=1):

    payload = {
        "coverLetter": f"Pro Max test application {number}."
    }

    response = requests.post(
        f"{BASE_URL}/auditions/{audition_id}/apply",
        headers=headers,
        json=payload
    )

    print(
        f"{number}. Audition {audition_id} "
        f"→ Status: {response.status_code}"
    )

    if response.status_code in [200, 201]:
        successful += 1
        print("   Application: SUCCESS")

    else:
        failed += 1
        print("   Application: FAILED")
        print("  ", response.text)

    time.sleep(0.2)

print("\n========== FINAL RESULT ==========")
print("Fresh auditions found:", len(audition_ids))
print("Auditions attempted:", len(audition_ids))
print("Successful applications:", successful)
print("Failed applications:", failed)