from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import logging
import uuid
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import uvicorn

from fastapi.staticfiles import StaticFiles
from fastapi import File, UploadFile
import os

# Create directories for storing images if they don't exist
os.makedirs("static/screenshots", exist_ok=True)
os.makedirs("static/favicons", exist_ok=True)



# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
import requests
from apify_client import ApifyClient
from vector_store import VectorStore 
import os
from pydantic import BaseModel
import logging
import uvicorn
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from roles_config import role_descriptions

# Appointment Functions
from GHL.Appointments.create_appointment import create_appointment
from GHL.Appointments.get_appointment import get_appointment
from GHL.Appointments.update_appointment import update_appointment

# Calendar Functions
from GHL.Calendars.create_calendar import create_calendar
from GHL.Calendars.delete_calendar import delete_calendar
from GHL.Calendars.get_all_calendars import get_all_calendars
from GHL.Calendars.get_calendar import get_calendar
from GHL.Calendars.update_calendar import update_calendar

# Contact Functions
from GHL.Contacts.create_contact import create_contact
from GHL.Contacts.delete_contact import delete_contact
from GHL.Contacts.get_all_contacts import get_all_contacts
from GHL.Contacts.get_contact import get_contact
from GHL.Contacts.update_contact import update_contact

# Sub Account Functions
from GHL.Sub_Accounts.create_sub_acc import create_sub_acc
from GHL.Sub_Accounts.delete_sub_acc import delete_sub_acc
from GHL.Sub_Accounts.get_sub_acc import get_sub_acc
from GHL.Sub_Accounts.update_sub_acc import update_sub_acc

# User Functions
from GHL.Users.create_user import create_user
from GHL.Users.delete_user import delete_user
from GHL.Users.get_user_by_location_id import get_user_by_location_id
from GHL.Users.get_user import get_user
from GHL.Users.update_user import update_user

# Website Related
# from Website.web_scrape import capture_website_screenshot, get_website_favicon

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SOLAR_API_KEY = os.getenv('SOLAR_API_KEY')
PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')
APIFY_API_KEY = os.getenv('APIFY_API_KEY')


app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")


class ChatRequest(BaseModel):
    user_id: str
    session_id: str
    user_input: str

class ChatMessage(BaseModel):
    sender: str
    message: str
    timestamp: Optional[str] = None

class ChatHistoryResponse(BaseModel):
    history: List[ChatMessage]
    session_id: str
    websiteData: Optional[Dict[str, str]] = None

class ChatResponse(BaseModel):
    agent: str
    session_id: str

# In-memory chat history store (replace with database in production)
chat_histories: Dict[str, List[ChatMessage]] = {}

def capture_website_screenshot(url: str) -> str:
    """
    Captures a screenshot of the entire website using headless browser.
    
    Args:
        url (str): URL of the website to capture
        
    Returns:
        str: URL path to the saved screenshot
    """
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from bs4 import BeautifulSoup
    import requests
    import os
    import time

    filename = None
    try:
        if not filename:
            # if session_id:
            #     filename = f"static/screenshots/{session_id}_screenshot.png"
            # else:
            filename = f"static/screenshots/screenshot_{int(time.time())}.png"
        
        # Set up Chrome options for headless mode
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Initialize driver with options
        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url)
        driver.save_screenshot(filename)
        driver.quit()
        
        # Return the URL path
        return f"/{filename}"
    except Exception as e:
        print(f"Error capturing screenshot: {e}")
        return None
    
def get_website_favicon(url: str) -> str:
    """
    Gets the favicon from a website and saves it.
    
    Args:
        url (str): URL of the website to scrape
        
    Returns:
        str: URL path to the saved favicon
    """
    from bs4 import BeautifulSoup
    import requests
    import time
    import os
    
    try:
        # Create filename with timestamp
        filename = f"static/favicons/favicon_{int(time.time())}.ico"
        
        # Get the website's HTML
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for favicon in link tags
        favicon_url = None
        
        # Check for standard favicon link tags
        for link in soup.find_all('link'):
            rel = link.get('rel', [])
            # Handle both string and list formats for rel attribute
            if isinstance(rel, list):
                rel = ' '.join(rel).lower()
            else:
                rel = rel.lower()
                
            if 'icon' in rel or 'shortcut icon' in rel:
                favicon_url = link.get('href')
                break
        
        # If no favicon found, try default location
        if not favicon_url:
            favicon_url = f"{url}/favicon.ico"
        
        # Fix relative URLs
        if favicon_url and not favicon_url.startswith('http'):
            if favicon_url.startswith('//'):
                favicon_url = 'https:' + favicon_url
            elif favicon_url.startswith('/'):
                favicon_url = url.rstrip('/') + favicon_url
            else:
                favicon_url = f"{url.rstrip('/')}/{favicon_url}"
        
        # Download the favicon and save it
        if favicon_url:
            favicon_response = requests.get(favicon_url, stream=True)
            if favicon_response.status_code == 200:
                # Make sure the directory exists
                os.makedirs(os.path.dirname(filename), exist_ok=True)
                
                # Save favicon
                with open(filename, 'wb') as f:
                    f.write(favicon_response.content)
                
                # Return the URL path
                return f"/{filename}"
        
        return None
    
    except Exception as e:
        print(f"Error fetching favicon: {e}")
        return None

# def get_website_favicon(
#     url: str
    
# ):
#     """
#     Gets the favicon from a website and saves it.
    
#     Args:
#         url (str): URL of the website to scrape
        
#     Returns:
#         str: URL path to the saved favicon
#     """
#     from selenium import webdriver
#     from selenium.webdriver.chrome.options import Options
#     from bs4 import BeautifulSoup
#     import requests
#     import os
#     import time

#     try:
#         # Get the website's HTML
#         response = requests.get(url)
#         soup = BeautifulSoup(response.text, 'html.parser')
        
#         # Look for favicon in link tags
#         favicon_url = None
        
#         # Check for standard favicon link tags
#         for link in soup.find_all('link'):
#             rel = link.get('rel', [])
#             # Handle both string and list formats for rel attribute
#             if isinstance(rel, list):
#                 rel = ' '.join(rel).lower()
#             else:
#                 rel = rel.lower()
                
#             if 'icon' in rel or 'shortcut icon' in rel:
#                 favicon_url = link.get('href')
#                 break
        
#         # If no favicon found, try default location
#         if not favicon_url:
#             favicon_url = f"{url}/favicon.ico"
        
#         # Fix relative URLs
#         if favicon_url and not favicon_url.startswith('http'):
#             if favicon_url.startswith('//'):
#                 favicon_url = 'https:' + favicon_url
#             elif favicon_url.startswith('/'):
#                 favicon_url = url.rstrip('/') + favicon_url
#             else:
#                 favicon_url = f"{url.rstrip('/')}/{favicon_url}"
        
#         # # Download the favicon and save it twice (once as favicon.ico and once as logo.png)
#         # if favicon_url:
#         #     favicon_response = requests.get(favicon_url, stream=True)
#         #     if favicon_response.status_code == 200:
#         #         # Save as favicon.ico
#         #         with open(favicon_filename, 'wb') as f:
#         #             f.write(favicon_response.content)
#         #         print(f"Favicon downloaded as {favicon_filename}")
                
#         #         # Also save as logo.png
#         #         with open(logo_filename, 'wb') as f:
#         #             f.write(favicon_response.content)
#         #         print(f"Favicon also saved as {logo_filename}")
                
#         #         return favicon_url
        
#         print("Favicon not found or couldn't be downloaded")
#         return favicon_url
#     except Exception as e:
#         print(f"Error fetching favicon: {e}")
#         return None

def save_message_to_history(session_id: str, sender: str, message: str):
    """Save a message to the chat history for a specific session"""
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    
    from datetime import datetime
    timestamp = datetime.now().isoformat()
    
    chat_histories[session_id].append(
        ChatMessage(sender=sender, message=message, timestamp=timestamp)
    )

def get_insights(address: str) -> Dict[str, Any]:
    base_url = "https://api.realwave.com/googleSolar"
    headers = {
        "Authorization": f"Bearer {SOLAR_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    url = f"{base_url}/insights"
    params = {
            "address": address,
            "mode": "full",
            "demo": "true"
    }
    response = requests.post(url, headers=headers, params=params)
    return response.json()

def get_datalayers(address: str) -> Dict[str, Any]:
    base_url = "https://api.realwave.com/googleSolar"
    headers = {
        "Authorization": f"Bearer {SOLAR_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    url = f"{base_url}/dataLayers"
    params = {
            "address": address,
            "renderPanels": "true",
            "fileFormat": "jpeg",
            "demo": "true"
    }
    response = requests.post(url, headers=headers, params=params)
    return response.json()

def get_report(address: str) -> Dict[str, Any]:
    base_url = "https://api.realwave.com/googleSolar"
    headers = {
        "Authorization": f"Bearer {SOLAR_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    url = f"{base_url}/report"
    params = {
            "address": address,
            "organizationName": "Squidgy Solar",
            "leadName": "Potential Client",
            "demo": "true"
    }
    response = requests.post(url, headers=headers, params=params)
    return response.json()


# Initialize vector store at server start
vector_store = None

def initialize_vector_store():
    """Initialize the vector store with templates from Excel file"""
    global vector_store
    try:
        vector_store = VectorStore()
        with open('conversation_templates.xlsx', 'rb') as f:
            excel_content = f.read()
        if not vector_store.load_excel_templates(excel_content):
            raise Exception("Failed to load templates from Excel")
    except Exception as e:
        print(f"Error initializing vector store: {str(e)}")
        # You might want to handle this error appropriately

# Initialize the vector store when the module loads
initialize_vector_store()

# LLM Configuration
llm_config = {
    "model": "gpt-4o",
    "api_key": OPENAI_API_KEY
}

# Role descriptions

# Global variable to store message history
message_history = {
    "ProductManager": [],
    "PreSalesConsultant": [],
    "SocialMediaManager": [],
    "LeadGenSpecialist": [],
    "user_agent": []
}

def vector_setup_sys_mesage(role_descriptions, role):
    """
    Generate system message for an agent by combining role description and vector store templates
    
    Args:
        role_descriptions (dict): Dictionary containing base role descriptions
        role (str): The role name of the agent
        
    Returns:
        str: Combined system message with role description and conversation templates
    """
    global vector_store
    if vector_store is None:
        return role_descriptions.get(role, f'You are a member of Squidgy\'s team working as {role}.')
        
    templates = vector_store.get_all_templates_for_role(role)
    
    message = f"{role_descriptions.get(role, f'You are a member of Squidgy\'s team working as {role}.')}\n\n"
    message += "Use these conversation patterns:\n\n"
    
    for template in templates:
        if template["client_response"]:
            message += f"When client says something like:\n'{template['client_response']}'\n"
        if template["template"]:
            message += f"Respond with something like:\n'{template['template']}'\n\n"
    
    message += "\nAdapt these templates to the conversation while maintaining Squidgy's tone and style."
    return message

def save_history(history):
    global message_history
    message_history = history
    
def get_history():
    global message_history
    return message_history

def analyze_with_perplexity(url: str) -> dict:
    """
    Analyze a website using Perplexity API direct call
    """
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = f"""
    Please analyze the website {url} and provide a summary in exactly this format:
    --- *Company name*: [Extract company name]
    --- *Website*: {url}
    --- *Description*: [2-3 sentence summary of what the company does]
    --- *Tags*: [Main business categories, separated by periods]
    --- *Takeaways*: [Key business value propositions]
    --- *Niche*: [Specific market focus or specialty]
    --- *Contact Information*: [Any available contact details]
    """

    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json={
                "model": "sonar-reasoning-pro",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1000
            }
        )
        
        if response.status_code == 200:
            analysis = response.json()["choices"][0]["message"]["content"]
            return {"status": "success", "analysis": analysis}
        else:
            return {
                "status": "error", 
                "message": f"API request failed with status code: {response.status_code}"
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

def scrape_page(url: str) -> str:
    client = ApifyClient(token=APIFY_API_KEY)

    # Prepare the Actor input
    run_input = {
        "startUrls": [{"url": url}],
        "useSitemaps": False,
        "crawlerType": "playwright:firefox",
        "includeUrlGlobs": [],
        "excludeUrlGlobs": [],
        "ignoreCanonicalUrl": False,
        "maxCrawlDepth": 0,
        "maxCrawlPages": 1,
        "initialConcurrency": 0,
        "maxConcurrency": 200,
        "initialCookies": [],
        "proxyConfiguration": {"useApifyProxy": True},
        "maxSessionRotations": 10,
        "maxRequestRetries": 5,
        "requestTimeoutSecs": 60,
        "dynamicContentWaitSecs": 10,
        "maxScrollHeightPixels": 5000,
        "removeElementsCssSelector": """nav, footer, script, style, noscript, svg,
    [role=\"alert\"],
    [role=\"banner\"],
    [role=\"dialog\"],
    [role=\"alertdialog\"],
    [role=\"region\"][aria-label*=\"skip\" i],
    [aria-modal=\"true\"]""",
        "removeCookieWarnings": True,
        "clickElementsCssSelector": '[aria-expanded="false"]',
        "htmlTransformer": "readableText",
        "readableTextCharThreshold": 100,
        "aggressivePrune": False,
        "debugMode": True,
        "debugLog": True,
        "saveHtml": True,
        "saveMarkdown": True,
        "saveFiles": False,
        "saveScreenshots": False,
        "maxResults": 9999999,
        "clientSideMinChangePercentage": 15,
        "renderingTypeDetectionPercentage": 10,
    }

    # Run the Actor and wait for it to finish
    run = client.actor("aYG0l9s7dbB7j3gbS").call(run_input=run_input)

    # Fetch and print Actor results from the run's dataset (if there are any)
    text_data = ""
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        text_data += item.get("text", "") + "\n"

    average_token = 0.75
    max_tokens = 20000  # slightly less than max to be safe 32k
    text_data = text_data[: int(average_token * max_tokens)]
    return text_data

class EnforcedFlowGroupChat(GroupChat):
   def __init__(self, agents, messages, max_round=100):
       super().__init__(agents, messages, max_round)
       self.website_provided = False
       self.presales_analyzed = False
       
   def select_speaker(self, last_speaker, selector_prompt):
       """Override the select_speaker method to enforce conversation flow"""
       
       last_message = self.messages[-1]["content"].lower() if self.messages else ""
       
       if len(self.messages) <= 1:
           return next(agent for agent in self.agents if agent.name == "ProductManager")
       
       if (not self.website_provided and 
           ("http" in last_message or ".com" in last_message or ".org" in last_message)):
           self.website_provided = True
           return next(agent for agent in self.agents if agent.name == "PreSalesConsultant")
           
       social_triggers = [
           "facebook", "twitter", "linkedin", "social media", "instagram",
           "posts", "content", "marketing", "followers", "engagement",
           "social strategy", "social presence"
       ]
       if any(term in last_message for term in social_triggers):
           return next(agent for agent in self.agents if agent.name == "SocialMediaManager")
         
       lead_triggers = [
           "appointment", "schedule", "demo", "contact", "email", "phone",
           "meet", "booking", "calendar", "availability", "call",
           "follow up", "consultation"
       ]
       if any(term in last_message for term in lead_triggers):
           return next(agent for agent in self.agents if agent.name == "LeadGenSpecialist")
       
       return next(agent for agent in self.agents if agent.name == "PreSalesConsultant")


# Create Agents
def create_agents(user_id, session_id):
    # Create agents using vector_store for system messages
    ProductManager = AssistantAgent(
        name="ProductManager",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "ProductManager"),
        description="A product manager AI assistant capable of starting conversation and delegation to others",
        human_input_mode="NEVER"
    )

    PreSalesConsultant = AssistantAgent(
        name="PreSalesConsultant",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "PreSalesConsultant"),
        description="A pre-sales consultant AI assistant capable of understanding customer more ,handling sales, pricing, and technical analysis",
        human_input_mode="NEVER"
    )

    #PreSalesConsultant.register_for_llm(name="scrape_page")(scrape_page)
    PreSalesConsultant.register_for_llm(name="analyze_with_perplexity")(analyze_with_perplexity)
    PreSalesConsultant.register_for_llm(name="capture_website_screenshot")(capture_website_screenshot)
    PreSalesConsultant.register_for_llm(name="get_website_favicon")(get_website_favicon)
    PreSalesConsultant.register_for_llm(name="get_insights")(get_insights)
    PreSalesConsultant.register_for_llm(name="get_datalayers")(get_datalayers)
    PreSalesConsultant.register_for_llm(name="get_report")(get_report)

    SocialMediaManager = AssistantAgent(
        name="SocialMediaManager",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "SocialMediaManager"),
        description="A social media manager AI assistant handling digital presence and strategy",
        human_input_mode="NEVER"
    )

    LeadGenSpecialist = AssistantAgent(
        name="LeadGenSpecialist",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "LeadGenSpecialist"),
        description="A Lead generation specialist assistant capable of handling and managing follow-ups and setups",
        human_input_mode="NEVER"
    )

    LeadGenSpecialist.register_for_llm(name="create_appointment")(create_appointment)
    LeadGenSpecialist.register_for_llm(name="get_appointment")(get_appointment)
    LeadGenSpecialist.register_for_llm(name="update_appointment")(update_appointment)
    # Delete Appointment???

    LeadGenSpecialist.register_for_llm(name="create_calendar")(create_calendar)
    # LeadGenSpecialist.register_for_llm(name="delete_calendar")(delete_calendar)
    LeadGenSpecialist.register_for_llm(name="get_all_calendars")(get_all_calendars)
    LeadGenSpecialist.register_for_llm(name="get_calendar")(get_calendar)
    LeadGenSpecialist.register_for_llm(name="update_calendar")(update_calendar)

    LeadGenSpecialist.register_for_llm(name="create_contact")(create_contact)
    # LeadGenSpecialist.register_for_llm(name="delete_contact")(delete_contact)
    LeadGenSpecialist.register_for_llm(name="get_all_contacts")(get_all_contacts)
    LeadGenSpecialist.register_for_llm(name="get_contact")(get_contact)
    LeadGenSpecialist.register_for_llm(name="update_contact")(update_contact)

    LeadGenSpecialist.register_for_llm(name="create_sub_acc")(create_sub_acc)
    # LeadGenSpecialist.register_for_llm(name="delete_sub_acc")(delete_sub_acc)
    LeadGenSpecialist.register_for_llm(name="get_sub_acc")(get_sub_acc)
    LeadGenSpecialist.register_for_llm(name="update_sub_acc")(update_sub_acc)

    LeadGenSpecialist.register_for_llm(name="create_user")(create_user)
    # LeadGenSpecialist.register_for_llm(name="delete_user")(delete_user)
    LeadGenSpecialist.register_for_llm(name="get_user_by_location_id")(get_user_by_location_id)
    LeadGenSpecialist.register_for_llm(name="get_user")(get_user)
    LeadGenSpecialist.register_for_llm(name="update_user")(update_user)

    # Termination function for user agent
    def should_terminate_user(message):
        return "tool_calls" not in message and message["role"] != "tool"

    # User Agent
    user_agent = UserProxyAgent(
        name="UserAgent",
        llm_config=llm_config,
        description="A human user capable of interacting with AI agents.",
        code_execution_config=False,
        human_input_mode="NEVER",
        is_termination_msg=should_terminate_user
    )
    # user_agent.register_for_execution(name="scrape_page")(scrape_page)
    user_agent.register_for_execution(name="analyze_with_perplexity")(analyze_with_perplexity)
    user_agent.register_for_execution(name="capture_website_screenshot")(capture_website_screenshot)
    user_agent.register_for_execution(name="get_website_favicon")(get_website_favicon)
    user_agent.register_for_execution(name="get_insights")(get_insights)
    user_agent.register_for_execution(name="get_datalayers")(get_datalayers)
    user_agent.register_for_execution(name="get_report")(get_report)

    user_agent.register_for_execution(name="create_appointment")(create_appointment)
    user_agent.register_for_execution(name="get_appointment")(get_appointment)
    user_agent.register_for_execution(name="update_appointment")(update_appointment)
    # Delete Appointment???

    user_agent.register_for_execution(name="create_calendar")(create_calendar)
    # LeadGenSpecialist.register_for_llm(name="delete_calendar")(delete_calendar)
    user_agent.register_for_execution(name="get_all_calendars")(get_all_calendars)
    user_agent.register_for_execution(name="get_calendar")(get_calendar)
    user_agent.register_for_execution(name="update_calendar")(update_calendar)

    user_agent.register_for_execution(name="create_contact")(create_contact)
    # LeadGenSpecialist.register_for_llm(name="delete_contact")(delete_contact)
    user_agent.register_for_execution(name="get_all_contacts")(get_all_contacts)
    user_agent.register_for_execution(name="get_contact")(get_contact)
    user_agent.register_for_execution(name="update_contact")(update_contact)

    user_agent.register_for_execution(name="create_sub_acc")(create_sub_acc)
    # LeadGenSpecialist.register_for_llm(name="delete_sub_acc")(delete_sub_acc)
    user_agent.register_for_execution(name="get_sub_acc")(get_sub_acc)
    user_agent.register_for_execution(name="update_sub_acc")(update_sub_acc)

    user_agent.register_for_execution(name="create_user")(create_user)
    # LeadGenSpecialist.register_for_llm(name="delete_user")(delete_user)
    user_agent.register_for_execution(name="get_user_by_location_id")(get_user_by_location_id)
    user_agent.register_for_execution(name="get_user")(get_user)
    user_agent.register_for_execution(name="update_user")(update_user)

    return ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

# Store ongoing chat processes and their status
ongoing_chats: Dict[str, Dict[str, Any]] = {}

@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str):
    connection_id = f"{user_id}_{session_id}"
    await websocket.accept()
    active_connections[connection_id] = websocket
    
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_input = message_data.get("message", "").strip()
            
            # Generate a unique ID for this chat request
            request_id = str(uuid.uuid4())
            
            # Send acknowledgment back to client
            await websocket.send_json({
                "type": "ack",
                "requestId": request_id,
                "message": "Message received, processing..."
            })
            
            # Start a background task to process the chat
            asyncio.create_task(
                process_chat(user_id, session_id, user_input, request_id, connection_id)
            )
            
    except WebSocketDisconnect:
        if connection_id in active_connections:
            del active_connections[connection_id]
        logger.info(f"Client disconnected: {connection_id}")

async def process_chat(user_id: str, session_id: str, user_input: str, request_id: str, connection_id: str):
    """Process a chat message in the background and send results via WebSocket"""
    ongoing_chats[request_id] = {"status": "processing", "connection_id": connection_id}
    
    try:
        websocket = active_connections.get(connection_id)
        if not websocket:
            logger.error(f"WebSocket connection not found for {connection_id}")
            return
            
        # Initial message if empty input
        if not user_input:
            initial_greeting = """Hi! I'm Squidgy and I'm here to help you win back time and make more money. Think of me as like a consultant who can instantly build you a solution to a bunch of your problems. To get started, could you tell me your website?"""
            await websocket.send_json({
                "type": "agent_response",
                "requestId": request_id,
                "message": initial_greeting,
                "final": True
            })
            ongoing_chats[request_id]["status"] = "completed"
            return
            
        # Create agents and group chat
        ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent = create_agents(user_id,session_id)
        
        # Create a custom callback to send intermediate responses
        async def send_update(agent_name, message):
            if websocket and connection_id in active_connections:
                await websocket.send_json({
                    "type": "agent_thinking",
                    "requestId": request_id,
                    "agent": agent_name,
                    "message": message,
                    "final": False
                })
        
        # Configure group chat with callback for progress updates
        group_chat = GroupChat(
            agents=[user_agent, ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist],
            messages=[{"role": "assistant", "content": "Hi! I'm Squidgy and I'm here to help you win back time and make more money."}],
            max_round=120,
            #on_new_agent_response=send_update  # This would need to be implemented in your GroupChat class
        )

        group_manager = GroupChatManager(
            groupchat=group_chat,
            llm_config=llm_config,
            human_input_mode="NEVER"
        )

        # Get and restore history
        history = get_history()
        ProductManager._oai_messages = {group_manager: history["ProductManager"]}
        PreSalesConsultant._oai_messages = {group_manager: history["PreSalesConsultant"]}
        SocialMediaManager._oai_messages = {group_manager: history["SocialMediaManager"]}
        LeadGenSpecialist._oai_messages = {group_manager: history["LeadGenSpecialist"]}
        user_agent._oai_messages = {group_manager: history["user_agent"]}
        
        # Run the chat with progress updates
        await websocket.send_json({
            "type": "processing_start",
            "requestId": request_id,
            "message": "Agents are now thinking..."
        })
        
        # Initiate chat (this would need to be modified to be non-blocking/async)
        # We'll run this in an executor to not block the event loop
        final_response = await asyncio.to_thread(
            run_agent_chat, user_agent, group_manager, user_input
        )
        
        # Save conversation history
        save_history({
            "ProductManager": ProductManager.chat_messages.get(group_manager),
            "PreSalesConsultant": PreSalesConsultant.chat_messages.get(group_manager),
            "SocialMediaManager": SocialMediaManager.chat_messages.get(group_manager),
            "LeadGenSpecialist": LeadGenSpecialist.chat_messages.get(group_manager),
            "user_agent": user_agent.chat_messages.get(group_manager)
        })
        
        # Send final response
        await websocket.send_json({
            "type": "agent_response",
            "requestId": request_id,
            "message": final_response,
            "final": True
        })
        
        ongoing_chats[request_id]["status"] = "completed"
        
    except Exception as e:
        logger.exception(f"Error processing chat: {str(e)}")
        try:
            if connection_id in active_connections:
                websocket = active_connections[connection_id]
                await websocket.send_json({
                    "type": "error",
                    "requestId": request_id,
                    "message": f"An error occurred: {str(e)}",
                    "final": True
                })
        except Exception as send_error:
            logger.exception(f"Error sending error message: {str(send_error)}")
        
        ongoing_chats[request_id]["status"] = "error"

def run_agent_chat(user_agent, group_manager, user_input):
    """Run the agent chat synchronously and return the final response"""
    user_agent.initiate_chat(group_manager, message=user_input, clear_history=False)
    return group_manager.groupchat.messages[-1]['content']

# Add a health check endpoint
@app.get("/")
async def health_check():
    return {"status": "healthy", "message": "Squidgy AI WebSocket Server is running"}

# Add an endpoint to get chat history (keep your existing endpoint)
# @app.get("/chat-history", response_model=ChatHistoryResponse)
# async def get_chat_history(session_id: str):
#     """Retrieve chat history for a specific session"""
#     if session_id not in chat_histories:
#         # Return empty history if no messages for this session
#         return ChatHistoryResponse(history=[], session_id=session_id)
    
#     return ChatHistoryResponse(
#         history=chat_histories[session_id],
#         session_id=session_id
#     )
# Update the get_chat_history endpoint in main.py
@app.get("/chat-history", response_model=ChatHistoryResponse)
async def get_chat_history(session_id: str):
    """Retrieve chat history for a specific session"""
    session_id = 'dd'
    if session_id not in chat_histories:
        # Return empty history if no messages for this session
        return ChatHistoryResponse(history=[], session_id=session_id)
    
    # Check if we have website data for this session
    website_data = {}
    screenshot_path = f"static/screenshots/{session_id}_screenshot.png"
    favicon_path = f"static/favicons/{session_id}_logo.png"
    
    if os.path.exists(screenshot_path):
        website_data["screenshot"] = f"/static/screenshots/{session_id}_screenshot.png"
    
    if os.path.exists(favicon_path):
        website_data["favicon"] = f"/static/favicons/{session_id}_logo.png"
    
    # Extract website URL from chat history if available
    for msg in chat_histories[session_id]:
        if msg.sender == "User" and ("http://" in msg.message or "https://" in msg.message):
            url_start = msg.message.find("http")
            url_end = msg.message.find(" ", url_start) if " " in msg.message[url_start:] else len(msg.message)
            website_data["url"] = msg.message[url_start:url_end]
            break
    
    return ChatHistoryResponse(
        history=chat_histories[session_id],
        session_id=session_id,
        websiteData=website_data if website_data else None
    )

# You might want to keep your traditional REST endpoint for compatibility
@app.post("/chat", response_model=ChatResponse)
async def chat_rest(request: ChatRequest):
    """Traditional REST endpoint for chat (less efficient than WebSocket)"""
    user_id = request.user_id
    session_id = request.session_id
    user_input = request.user_input.strip()
    
    # Log the incoming request
    logger.info(f"REST chat request received from {user_id} in session {session_id}")
    
    if not user_input:
        initial_greeting = """Hi! I'm Squidgy and I'm here to help you win back time and make more money. Think of me as like a consultant who can instantly build you a solution to a bunch of your problems. To get started, could you tell me your website?"""
        
        # Save the initial greeting to chat history
        save_message_to_history(session_id, "AI", initial_greeting)
        
        return ChatResponse(agent=initial_greeting, session_id=session_id)
    
    # Save user input to chat history
    save_message_to_history(session_id, "User", user_input)
    
    try:
        # Create agents and group chat
        ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent = create_agents(user_id, session_id)
        
        group_chat = GroupChat(
            agents=[user_agent, ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist],
            messages=[{"role": "assistant", "content": "Hi! I'm Squidgy and I'm here to help you win back time and make more money."}],
            max_round=120
        )

        group_manager = GroupChatManager(
            groupchat=group_chat,
            llm_config=llm_config,
            human_input_mode="NEVER"
        )

        # Get and restore history
        history = get_history()
        ProductManager._oai_messages = {group_manager: history["ProductManager"]}
        PreSalesConsultant._oai_messages = {group_manager: history["PreSalesConsultant"]}
        SocialMediaManager._oai_messages = {group_manager: history["SocialMediaManager"]}
        LeadGenSpecialist._oai_messages = {group_manager: history["LeadGenSpecialist"]}
        user_agent._oai_messages = {group_manager: history["user_agent"]}
        
        # Initiate chat
        user_agent.initiate_chat(group_manager, message=user_input, clear_history=False)
        
        # Get the response
        agent_response = group_chat.messages[-1]['content']
        
        # Save agent response to chat history
        save_message_to_history(session_id, "AI", agent_response)
        
        # Save conversation history
        save_history({
            "ProductManager": ProductManager.chat_messages.get(group_manager),
            "PreSalesConsultant": PreSalesConsultant.chat_messages.get(group_manager),
            "SocialMediaManager": SocialMediaManager.chat_messages.get(group_manager),
            "LeadGenSpecialist": LeadGenSpecialist.chat_messages.get(group_manager),
            "user_agent": user_agent.chat_messages.get(group_manager)
        })
        
        return ChatResponse(agent=agent_response, session_id=session_id)
        
    except Exception as e:
        error_msg = f"Error processing chat: {str(e)}"
        logger.exception(error_msg)
        
        # Save error message to chat history
        save_message_to_history(session_id, "System", error_msg)
        
        return ChatResponse(
            agent="I'm sorry, an error occurred while processing your request. Please try again.",
            session_id=session_id
        )
    
class ProgressUpdate(BaseModel):
    agent_name: str
    status: str
    message: str

@app.post("/agent-progress-webhook")
async def agent_progress_webhook(update: ProgressUpdate):
    """Webhook endpoint to receive progress updates from agents"""
    agent_name = update.agent_name
    status = update.status
    message = update.message
    
    logger.info(f"Agent progress update: {agent_name} - {status}")
    
    # Here you would broadcast this update to any connected WebSockets
    # This is a simplified example
    for connection_id, websocket in active_connections.items():
        try:
            await websocket.send_json({
                "type": "agent_update",
                "agent": agent_name,
                "status": status,
                "message": message
            })
        except Exception as e:
            logger.error(f"Error sending update to {connection_id}: {str(e)}")
    
    return {"status": "received"}

# Add endpoint to check status of ongoing chats
@app.get("/chat-status/{request_id}")
async def get_chat_status(request_id: str):
    """Check the status of an ongoing chat request"""
    if request_id not in ongoing_chats:
        raise HTTPException(status_code=404, detail="Chat request not found")
    
    return ongoing_chats[request_id]

# Add endpoint to cancel an ongoing chat
@app.post("/cancel-chat/{request_id}")
async def cancel_chat(request_id: str):
    """Cancel an ongoing chat request"""
    if request_id not in ongoing_chats:
        raise HTTPException(status_code=404, detail="Chat request not found")
    
    ongoing_chats[request_id]["status"] = "cancelled"
    # You would need additional logic to actually stop the processing
    
    return {"status": "cancelled", "request_id": request_id}


if __name__ == '__main__':
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=True, log_level="debug")