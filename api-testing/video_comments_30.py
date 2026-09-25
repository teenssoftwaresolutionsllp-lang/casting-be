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
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Connect to PostgreSQL
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()

# Get 30 different video IDs
cursor.execute("""
    SELECT id
    FROM public.videos
    ORDER BY id ASC
    LIMIT 30;
""")

video_ids = [row[0] for row in cursor.fetchall()]

# Close database connection
cursor.close()
conn.close()

print("Total videos found:", len(video_ids))

successful = 0
failed = 0

# Post one comment on each video
for number, video_id in enumerate(video_ids, start=1):

    payload = {
        "text": f"Test video comment {number}"
    }

    response = requests.post(
        f"{BASE_URL}/videos/{video_id}/comments",
        headers=headers,
        json=payload
    )

    print(
        f"{number}. Video {video_id} → "
        f"Status: {response.status_code}"
    )

    # Successful comment
    if response.status_code in [200, 201]:

        successful += 1
        print("   Comment: SUCCESS")

    # Comment quota reached
    elif response.status_code == 403:

        failed += 1
        print("   Comment: BLOCKED - QUOTA LIMIT")
        print("  ", response.text)

    # Other errors
    else:

        failed += 1
        print("   Comment: FAILED")
        print("  ", response.text)

    time.sleep(0.1)


# Final result
print("\n========== FINAL RESULT ==========")
print("Videos found:", len(video_ids))
print("Videos attempted:", len(video_ids))
print("Successful comments:", successful)
print("Failed:", failed)