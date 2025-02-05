import openai
import os
import requests
import time
import json
import pandas as pd
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Load API Keys
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
VIDEO_DATA_FILE = "video_data.json"
QUESTIONS_FILE = "questions.xlsx"

# Load predefined questions from Excel
questions_df = pd.read_excel(QUESTIONS_FILE, engine="openpyxl")
questions_df.columns = questions_df.columns.str.strip()  # Remove extra spaces

# Initialize FastAPI
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# User session tracking
user_sessions = {}

class ChatRequest(BaseModel):
    user_id: str
    user_input: str

def load_video_data():
    """Load stored video URLs."""
    if os.path.exists(VIDEO_DATA_FILE):
        with open(VIDEO_DATA_FILE, "r") as file:
            return json.load(file)
    return {}

def save_video_data(script, video_url):
    """Save generated video URL to avoid regenerating the same content."""
    data = load_video_data()
    data[script] = {"video_url": video_url}

    with open(VIDEO_DATA_FILE, "w") as file:
        json.dump(data, file, indent=4)

def generate_ai_response(prompt):
    """Generates AI response using OpenAI GPT-4."""
    client = openai.OpenAI(api_key=OPENAI_API_KEY)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant for a solar energy company."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

def generate_video(text: str, character_id: str, voice_id: str):
    """Generate a video using HeyGen API or return a stored video."""
    existing_videos = load_video_data()
    if text in existing_videos:
        return existing_videos[text]["video_url"]

    url = "https://api.heygen.com/v2/video/generate"
    headers = {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "video_inputs": [
            {
                "character": {"type": "avatar", "avatar_id": character_id, "avatar_style": "normal"},
                "voice": {"type": "text", "input_text": text, "voice_id": voice_id},
                "background": {"type": "color", "value": "#008000"}
            }
        ],
        "dimension": {"width": 1280, "height": 720}
    }

    response = requests.post(url, json=payload, headers=headers)
    response_data = response.json()
    video_id = response_data.get("data", {}).get("video_id")

    if video_id:
        time.sleep(30)  # Wait for HeyGen processing
        video_url = f"https://heygen.com/video/{video_id}"
        save_video_data(text, video_url)  # Store for future use
        return video_url

    return None

@app.post("/conversation")
def chat_with_ai(request: ChatRequest, background_tasks: BackgroundTasks):
    """Handles structured conversation and AI responses, using stored videos when possible."""
    user_id = request.user_id
    user_input = request.user_input.strip()

    # ✅ If the user is new, only send the first question once
    if user_id not in user_sessions:
        user_sessions[user_id] = {"current_question": 0}
        first_question = questions_df.iloc[0]["Squidgy (The Ai Consultant)"]
        return {"agent": first_question, "video_url": None}

    session = user_sessions[user_id]
    current_q_index = session["current_question"]

    # ✅ If all questions are completed
    if current_q_index >= len(questions_df):
        return {"agent": "We have completed all questions. Thank you!", "video_url": None}

    # Get the current question
    current_question = questions_df.iloc[current_q_index]["Squidgy (The Ai Consultant)"]

    # ✅ Detect if user is asking a follow-up question
    if user_input.endswith("?"):
        ai_response = generate_ai_response(user_input) + " Is there anything else I can help you with? Can we go to the next question?"
    else:
        ai_response = "Thank you for your answer! Are you done with this question, or do you need more details?"

    # ✅ Move to the next question if user confirms
    if "done" in user_input.lower():
        session["current_question"] += 1
        if session["current_question"] < len(questions_df):
            next_question = questions_df.iloc[session["current_question"]]["Squidgy (The Ai Consultant)"]
            ai_response = f"Great! Moving to the next question: {next_question}"
        else:
            ai_response = "We have completed all questions. Thank you!"

    # ✅ Check `video_data.json` first before generating a new video
    video_data = load_video_data()
    video_url = video_data.get(ai_response, {}).get("video_url")

    if not video_url:
        background_tasks.add_task(generate_video, ai_response, "Abigail_expressive_2024112501", "26b2064088674c80b1e5fc5ab1a068eb")

    return {"agent": ai_response, "video_url": video_url}
