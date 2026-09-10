import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Backend URL
BASE_URL = "http://localhost:3000"

# Paste FREE user's fresh JWT token here
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYTFiZTQzMy1hN2ZiLTQ3MWMtODQ2OS05M2ViNTNmODQ0ZTIiLCJlbWFpbCI6Im5laGFAZXhhbXBsZS5jb20iLCJyb2xlIjoiYXJ0aXN0IiwiaXNQYWlkIjpmYWxzZSwicGxhbiI6ImZyZWUiLCJpYXQiOjE3ODkwMTU4MDUsImV4cCI6MTc4OTYyMDYwNX0.j7VhhULrbK-DN-qYXZM_3DLXlkAVEHqY4m4O-VdN82k"

# Authorization headers
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Connect to PostgreSQL
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Get 2 different auditions
cursor.execute("""
    SELECT id
    FROM public.auditions
    ORDER BY id ASC
    LIMIT 2;
""")

audition_ids = [row[0] for row in cursor.fetchall()]

cursor.close()
conn.close()

print("Auditions found:", len(audition_ids))

successful = 0
failed = 0

# Apply to 2 auditions
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

    # Free user quota exceeded
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