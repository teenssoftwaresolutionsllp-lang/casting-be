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

# Find a photo that Pro Max has NOT liked yet
cursor.execute("""
    SELECT p.id
    FROM public.photos p
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.photo_likes pl
        WHERE pl.photo_id = p.id
        AND pl.user_id = (
            SELECT id
            FROM public.users
            WHERE email = 'promax@example.com'
        )
    )
    ORDER BY p.id ASC
    LIMIT 1;
""")

result = cursor.fetchone()

cursor.close()
conn.close()

if not result:
    print("No unliked photo found.")
    exit()

photo_id = result[0]

print("501st Photo ID:", photo_id)

response = requests.post(
    f"{BASE_URL}/photos/{photo_id}/like",
    headers=headers
)

print("Status:", response.status_code)
print("Response:", response.text)

if response.status_code == 403:
    print("\nPASS - 501st photo like correctly blocked.")
else:
    print("\nFAIL - 501st photo like was not blocked.")