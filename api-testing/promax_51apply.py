import os
import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:3000"

# USE FRESH PRO MAX USER TOKEN
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJlZWE4MS01MDExLTRkMjQtODQ5Yi01NTcxNWEwOWRjNzAiLCJlbWFpbCI6InByb21heEBleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOnRydWUsInBsYW4iOiJwcm9fbWF4IiwiaWF0IjoxNzg5MDIxNzc4LCJleHAiOjE3ODk2MjY1Nzh9.aW-y3I94HPC-OWpjnaaERbpbyhKCDMvmRh0TFrmE4P8"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Find one fresh audition
# - Not created by Pro Max
# - Pro Max has not already applied
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

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
    LIMIT 1;
""")

result = cursor.fetchone()

cursor.close()
conn.close()

if not result:
    print("No fresh audition found.")
    exit()

audition_id = result[0]

print("51st Audition ID:", audition_id)

payload = {
    "coverLetter": "Pro Max 51st application quota test."
}

response = requests.post(
    f"{BASE_URL}/auditions/{audition_id}/apply",
    headers=headers,
    json=payload
)

print("Status:", response.status_code)
print("Response:", response.text)

if response.status_code == 403:
    print("\nPASS - 51st audition application correctly blocked.")
else:
    print("\nFAIL - 51st audition application was not blocked.")