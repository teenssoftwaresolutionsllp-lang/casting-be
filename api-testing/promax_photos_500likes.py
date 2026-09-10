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
    FROM public.photos
    ORDER BY id ASC
    LIMIT 500;
""")

photo_ids = [row[0] for row in cursor.fetchall()]

cursor.close()
conn.close()

print("Photos found:", len(photo_ids))

successful = 0
failed = 0

for number, photo_id in enumerate(photo_ids, start=1):

    response = requests.post(
        f"{BASE_URL}/photos/{photo_id}/like",
        headers=headers
    )

    print(f"{number}. Photo {photo_id} → Status: {response.status_code}")

    if response.status_code == 200:
        try:
            data = response.json()

            if data.get("liked") is True:
                successful += 1
                print("   Like: SUCCESS")
            else:
                failed += 1
                print("   Like: NOT LIKED")
        except:
            failed += 1
            print("   Like: FAILED")
    else:
        failed += 1
        print("   Like: FAILED")
        print("  ", response.text)

    time.sleep(0.1)

print("\n========== FINAL RESULT ==========")
print("Photos attempted:", len(photo_ids))
print("Successful likes:", successful)
print("Failed:", failed)