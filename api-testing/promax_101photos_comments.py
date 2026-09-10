import os
import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:3000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJlZWE4MS01MDExLTRkMjQtODQ5Yi01NTcxNWEwOWRjNzAiLCJlbWFpbCI6InByb21heEBleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOmZhbHNlLCJwbGFuIjoiZnJlZSIsImlhdCI6MTc4OTAxNzU4OSwiZXhwIjoxNzg5NjIyMzg5fQ.1Iw1AGGog2UPnEXCDy5W-VrORF-B-hR57kzFQsXozfU"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

cursor.execute("""
    SELECT id
    FROM public.photos
    ORDER BY id ASC
    LIMIT 1;
""")

result = cursor.fetchone()

cursor.close()
conn.close()

if not result:
    print("No photo found.")
    exit()

photo_id = result[0]

print("101st Photo ID:", photo_id)

payload = {
    "text": "Pro Max 101st photo comment"
}

response = requests.post(
    f"{BASE_URL}/photos/{photo_id}/comments",
    headers=headers,
    json=payload
)

print("Status:", response.status_code)
print("Response:", response.text)

if response.status_code == 403:
    print("\nPASS - 101st photo comment correctly blocked.")
else:
    print("\nFAIL - 101st photo comment was not blocked.")