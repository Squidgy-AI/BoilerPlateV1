import os
import requests
import time
import json  # Added to store video URLs
from dotenv import load_dotenv

load_dotenv()  # Load environment variables

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
BASE_URL = "https://api.heygen.com/v2/video/generate"
VIDEO_DATA_FILE = "video_data.json"  # File to store video URLs


def save_video_data(video_id, video_url, script):
    """Save generated video URL to a file to avoid regenerating the same content."""
    data = load_video_data()
    data[script] = {"video_id": video_id, "video_url": video_url}

    with open(VIDEO_DATA_FILE, "w") as file:
        json.dump(data, file, indent=4)
    print("✅ Video URL saved for future use!")


def load_video_data():
    """Load stored video URLs."""
    if os.path.exists(VIDEO_DATA_FILE):
        with open(VIDEO_DATA_FILE, "r") as file:
            return json.load(file)
    return {}


def generate_video(text: str, character_id: str, voice_id: str):
    """Generate a video using HeyGen API, or return an existing one if it has been generated before."""
    # Check if the video was already generated
    existing_videos = load_video_data()
    if text in existing_videos:
        print("🎥 Reusing existing video.")
        print(f"📌 Video URL: {existing_videos[text]['video_url']}")
        return existing_videos[text]["video_url"]

    url = BASE_URL
    headers = {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": character_id,
                    "avatar_style": "normal"
                },
                "voice": {
                    "type": "text",
                    "input_text": text,
                    "voice_id": voice_id
                },
                "background": {
                    "type": "color",
                    "value": "#008000"
                }
            }
        ],
        "dimension": {
            "width": 1280,
            "height": 720
        }
    }

    response = requests.post(url, json=payload, headers=headers)
    
    print("Response Status Code:", response.status_code)
    print("Response Text:", response.text)

    response_data = response.json()

    # Extract video ID
    video_id = response_data.get("data", {}).get("video_id")

    if video_id:
        print(f"✅ Video successfully created! Video ID: {video_id}")
        print("⏳ Checking video status...")

        # Call the status check function
        video_url = check_video_status(video_id)

        if video_url:
            save_video_data(video_id, video_url, text)  # Save the video for reuse
            return video_url
        else:
            print("❌ Failed to retrieve video URL from API.")
            return manually_provide_video_url(video_id, text)  # Ask user for manual input
    
    return None


def check_video_status(video_id):
    """Check the processing status of a HeyGen video and force-check the URL."""
    status_url = f"https://api.heygen.com/v1/video_status.get?video_id={video_id}"
    headers = {"X-Api-Key": HEYGEN_API_KEY}

    max_checks = 10  # Prevents infinite loop
    checks = 0

    while checks < max_checks:
        response = requests.get(status_url, headers=headers)
        data = response.json()

        print("🔍 Full Response from API:", data)  # Debugging line

        status = data.get("data", {}).get("status")
        video_url = data.get("data", {}).get("video_url")

        # ✅ If the video URL is available, print and return it
        if video_url:
            print(f"🎉 Video is ready! Download it here: {video_url}")
            return video_url  # Exit function

        # ⚠️ If "processing" is taking too long, try fetching the URL anyway
        if status == "processing" and checks > 3:  # After 3 attempts
            print("⚠️ Video is still processing, but checking for URL anyway...")
        
        elif status == "completed":
            print("✅ Video marked as completed, but waiting for URL...")

        elif status == "failed":
            print("❌ Video processing failed!")
            return None

        elif status == "waiting":
            print("⏳ Video is still in queue, waiting to start...")

        # ⏳ Wait before checking again
        time.sleep(30)
        checks += 1

    # If max retries are reached, print a message
    print("🚨 Maximum retries reached! Check your HeyGen account manually.")
    return None


def manually_provide_video_url(video_id, script):
    """Prompt the user to manually enter the video URL if API did not return it."""
    print("❗ The video was created, but no URL was returned by the API.")
    manual_url = input(f"🔗 Please enter the video URL manually for Video ID {video_id}: ").strip()

    if manual_url:
        save_video_data(video_id, manual_url, script)
        print(f"✅ Video URL saved: {manual_url}")
        return manual_url
    else:
        print("❌ No URL provided. The video won't be stored.")
        return None


# Test function
if __name__ == "__main__":
    sample_text = "Welcome to Squidgy! We help you go solar easily. How can I help you today?"
    character_id = "Abigail_expressive_2024112501"  # Replace with actual HeyGen avatar ID
    voice_id = "26b2064088674c80b1e5fc5ab1a068eb"  # Replace with actual voice ID

    result = generate_video(sample_text, character_id, voice_id)
    if result:
        print(f"✅ Final Video URL: {result}")
    else:
        print("❌ Video generation failed.")
