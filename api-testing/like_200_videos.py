import os
import time
import requests
import psycopg2
from dotenv import load_dotenv

# Load .env
load_dotenv()

# Backend URL
BASE_URL = "http://localhost:3000"

# Paste your fresh JWT token here
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZWExMDMxNC1kMjk0LTQwNWQtOTQzYS1kNjNhNzNhMDJlYjUiLCJlbWFpbCI6InByb0BleGFtcGxlLmNvbSIsInJvbGUiOiJhcnRpc3QiLCJpc1BhaWQiOnRydWUsInBsYW4iOiJwcm8iLCJpYXQiOjE3ODg5NDQwODEsImV4cCI6MTc4OTU0ODg4MX0.OmbCOQL9ZlLVYnmX33cNP_6lMmh3oLMwy1m6Prpybl4"

# Authorization headers
headers = {
    "Authorization": f"Bearer {TOKEN}"
}

# Connect to PostgreSQL
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Get 200 different video IDs
cursor.execute("""
    SELECT id
    FROM public.videos
    ORDER BY id ASC
    LIMIT 200;
""")

video_ids = [row[0] for row in cursor.fetchall()]

# Close database connection
cursor.close()
conn.close()

print("Total videos found in database:", len(video_ids))

successful = 0
failed = 0

# Like each video
for number, video_id in enumerate(video_ids, start=1):

    response = requests.post(
        f"{BASE_URL}/videos/{video_id}/like",
        headers=headers
    )

    print(
        f"{number}. Video {video_id} → "
        f"Status: {response.status_code}"
    )

    if response.status_code == 200:

        data = response.json()

        if data.get("liked") is True:
            successful += 1
            print("   Like: SUCCESS")

        elif data.get("liked") is False:
            failed += 1
            print("   Like: UNLIKED / TOGGLE RESULT")

    elif response.status_code == 403:

        failed += 1
        print("   403 QUOTA/PERMISSION:")
        print("  ", response.text)

        print("\nLike quota reached. Stopping script.")
        break

    else:

        failed += 1
        print("   ERROR:")
        print("  ", response.text)

    time.sleep(0.1)


# Final result
print("\n========== FINAL RESULT ==========")
print("Videos found:", len(video_ids))
print("Successful likes:", successful)
print("Failed:", failed)