import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:3000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWExMDMxNC1kMjk0LTQwNWQtOTQzYS1kNjNhNzNhMDJlYjUiLCJlbWFpbCI6InByb0BleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOnRydWUsInBsYW4iOiJwcm8iLCJpYXQiOjE3ODg5NDQwODEsImV4cCI6MTc4OTU0ODg4MX0.OmbCOQL9ZlLVYnmX33cNP_6lMmh3oLMwy1m6Prpybl4"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

cursor.execute("""
    SELECT id
    FROM public.photos
    ORDER BY id ASC
    LIMIT 201;
""")

photo_ids = [row[0] for row in cursor.fetchall()]

cursor.close()
conn.close()

print("Photos available:", len(photo_ids))

successful = 0
failed = 0

for number, photo_id in enumerate(photo_ids, start=1):

    response = requests.post(
        f"{BASE_URL}/photos/{photo_id}/like",
        headers=headers
    )

    print(f"{number}. Photo {photo_id} → {response.status_code}")

    if response.status_code == 200:
        data = response.json()

        if data.get("liked") is True:
            successful += 1
            print(f"   SUCCESS → {successful}")

    elif response.status_code == 403:
        failed += 1
        print("   ❌ 403 - LIKE LIMIT REACHED")
        print(response.text)
        break

    else:
        failed += 1
        print("   ERROR:", response.text)

    time.sleep(0.1)

print("\n========== FINAL RESULT ==========")
print("Photos attempted:", successful + failed)
print("Successful likes:", successful)
print("Failed:", failed)