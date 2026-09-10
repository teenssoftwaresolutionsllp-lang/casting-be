import time
import requests

# Backend URL
BASE_URL = "http://localhost:3000"

# Director user's JWT token
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDZjNTczNi1lZDgxLTQ2NDAtOTRkMS02NTU1YTc2OTZmNGIiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiYXJ0aXN0IiwiaXNQYWlkIjpmYWxzZSwicGxhbiI6ImZyZWUiLCJpYXQiOjE3ODkwMTU2MTEsImV4cCI6MTc4OTYyMDQxMX0.ZU6D2MjXnPgX3ZsFdha_V5WFuSRpl67fIV0BVbwXXaA"

# Authorization headers
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

successful = 0
failed = 0

# Create 50 auditions
for number in range(1, 51):

    payload = {
        "title": f"Test Audition {number}",
        "category": "Actor",
        "role": f"Lead Role {number}",
        "location": "Hyderabad",
        "pay": "50000",
        "deadline": "2026-12-31",
        "lang": "Telugu",
        "desc": f"Automation test audition {number}"
    }

    response = requests.post(
        f"{BASE_URL}/auditions",
        headers=headers,
        json=payload
    )

    print(
        f"{number}. Audition → Status: {response.status_code}"
    )

    if response.status_code in [200, 201]:
        successful += 1
        print("   Audition: SUCCESS")

        # Print created audition ID
        try:
            data = response.json()
            print("   Audition ID:", data.get("id"))
        except:
            pass

    else:
        failed += 1
        print("   Audition: FAILED")
        print("  ", response.text)

    time.sleep(0.1)

# Final result
print("\n========== FINAL RESULT ==========")
print("Auditions attempted:", 50)
print("Successful:", successful)
print("Failed:", failed)