import os
import requests
from dotenv import load_dotenv

load_dotenv()
HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")

def check_video_status(video_id):
    """Fetch the latest status of a HeyGen video."""
    url = f"https://api.heygen.com/v1/video_status.get?video_id={video_id}"
    headers = {"X-Api-Key": HEYGEN_API_KEY}

    response = requests.get(url, headers=headers)
    data = response.json()

    print("🔍 Full Response from API:", data)

    video_url = data.get("data", {}).get("video_url")

    if video_url:
        print(f"🎉 Video is ready! Download it here: {video_url}")
    else:
        print("⏳ Still processing, try again later.")

# Replace with your video_id from the email
video_id = "18b5993e0cb3470d91bd3c296368b541"
check_video_status(video_id)
