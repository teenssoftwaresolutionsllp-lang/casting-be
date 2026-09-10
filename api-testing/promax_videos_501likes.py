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

# Find a video that Pro Max has NOT liked yet
cursor.execute("""
    SELECT v.id
    FROM public.videos v
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.video_likes vl
        WHERE vl.video_id = v.id
        AND vl.user_id = (
            SELECT id
            FROM public.users
            WHERE email = 'promax@example.com'
        )
    )
    ORDER BY v.id ASC
    LIMIT 1;
""")

result = cursor.fetchone()

cursor.close()
conn.close()

if not result:
    print("No unliked video found.")
    exit()

video_id = result[0]

print("501st Video ID:", video_id)

response = requests.post(
    f"{BASE_URL}/videos/{video_id}/like",
    headers=headers
)

print("Status:", response.status_code)
print("Response:", response.text)

if response.status_code == 403:
    print("\nPASS - 501st video like correctly blocked.")
else:
    print("\nFAIL - 501st video like was not blocked.")