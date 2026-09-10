import os
import time
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
    FROM public.videos
    ORDER BY id ASC
    LIMIT 100;
""")

video_ids = [row[0] for row in cursor.fetchall()]

cursor.close()
conn.close()

print("Videos found:", len(video_ids))

successful = 0
failed = 0

for number, video_id in enumerate(video_ids, start=1):

    payload = {
        "text": f"Pro Max test comment {number}"
    }

    response = requests.post(
        f"{BASE_URL}/videos/{video_id}/comments",
        headers=headers,
        json=payload
    )

    print(f"{number}. Video {video_id} → Status: {response.status_code}")

    if response.status_code in [200, 201]:
        successful += 1
        print("   Comment: SUCCESS")
    else:
        failed += 1
        print("   Comment: FAILED")
        print("  ", response.text)

    time.sleep(0.1)

print("\n========== FINAL RESULT ==========")
print("Comments attempted:", len(video_ids))
print("Successful comments:", successful)
print("Failed:", failed)