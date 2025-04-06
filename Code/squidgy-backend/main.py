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
import time

from fastapi.staticfiles import StaticFiles
from fastapi import File, UploadFile
import os

from functools import wraps
import uuid
import time
import asyncio
from contextlib import suppress

# Create directories for storing images if they don't exist
os.makedirs("E:/squidgy_images/screenshots", exist_ok=True)
os.makedirs("E:/squidgy_images/favicons", exist_ok=True)



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
from Website.web_scrape import capture_website_screenshot, get_website_favicon

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
# Add this to your existing app configuration in main.py
app.mount("/static/screenshots", StaticFiles(directory="E:/squidgy_images/screenshots"), name="screenshots")
app.mount("/static/favicons", StaticFiles(directory="E:/squidgy_images/favicons"), name="favicons")


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

# Example of integrating events within an AutoGen agent
class EventStreamingAssistantAgent(AssistantAgent):
    """Extended AssistantAgent that streams events during processing"""
    
    def __init__(self, websocket_handler=None, request_id=None, **kwargs):
        super().__init__(**kwargs)
        self.websocket_handler = websocket_handler
        self.request_id = request_id
    
    async def _process_thinking(self, message):
        """Hook to send thinking events during processing"""
        if self.websocket_handler:
            await self.websocket_handler(
                "agent_thinking", 
                self.name, 
                message, 
                self.request_id
            )
        
        # Continue with normal processing
        return await super()._process_thinking(message)

# In-memory chat history store (replace with database in production)
chat_histories: Dict[str, List[ChatMessage]] = {}

active_connections: Dict[str, WebSocket] = {}


# Event types to implement
# EVENT_TYPES = {
#     "processing_start": "Initial startup of processing pipeline",
#     "agent_thinking": "Agent is actively thinking/processing",
#     "agent_update": "Progress update from an agent",
#     "agent_response": "Final response from an agent",
#     "error": "Error in processing"
# }

EVENT_TYPES = {
    "processing_start": "Initial startup of processing pipeline",
    "agent_thinking": "Agent is actively thinking/processing",
    "agent_update": "Progress update from an agent",
    "agent_response": "Final response from an agent",
    "error": "Error in processing",
    # New event types for tool execution
    "tool_execution": "Tool function execution starting",
    "tool_result": "Tool function execution result",
    "tool_progress": "Tool function execution progress"
}


def with_tool_visualization(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract connection_id and request_id from the context
        connection_id = kwargs.pop('connection_id', None)
        request_id = kwargs.pop('request_id', None)
        
        # If no connection info, just call the original function
        if not connection_id or not request_id:
            return await func(*args, **kwargs)
        
        # Get function name
        tool_name = func.__name__
        if tool_name.endswith('_visualized'):
            tool_name = tool_name[:-11]
        
        # Get websocket connection
        websocket = active_connections.get(connection_id)
        if not websocket:
            return await func(*args, **kwargs)
        
        try:
            # Call the original function
            result = await func(*args, **kwargs)
            
            # For screenshot and favicon, ensure paths are properly formatted
            if tool_name in ['capture_website_screenshot', 'get_website_favicon']:
                # If result is a string (path), wrap it in a dict
                if isinstance(result, str):
                    result = {"path": result}
                    
                # Make sure paths start with / for frontend use
                if isinstance(result, dict) and 'path' in result and not result['path'].startswith('/'):
                    result['path'] = '/' + result['path']
                
                # Log the processed result
                print(f"Tool {tool_name} result: {result}")
            
            # Send tool result event with minimal information
            if websocket.client_state != websocket.client_state.DISCONNECTED:
                with suppress(RuntimeError, ConnectionError):
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": tool_name,
                        "result": result,
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
            
            return result
        except Exception as e:
            # Log the error
            print(f"Error in {tool_name}: {str(e)}")
            
            # Send error event with minimal information
            if websocket.client_state != websocket.client_state.DISCONNECTED:
                with suppress(RuntimeError, ConnectionError):
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": tool_name,
                        "error": str(e),
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
            
            # Re-raise the exception
            raise
    
    return wrapper

# def with_tool_visualization(func):
#     @wraps(func)
#     async def wrapper(*args, **kwargs):
#         # Extract connection_id and request_id from the context
#         connection_id = kwargs.pop('connection_id', None)
#         request_id = kwargs.pop('request_id', None)
        
#         # If no connection info, just call the original function
#         if not connection_id or not request_id:
#             return await func(*args, **kwargs)
        
#         # Get function name
#         tool_name = func.__name__
#         if tool_name.endswith('_visualized'):
#             tool_name = tool_name[:-11]
        
#         # Get websocket connection
#         websocket = active_connections.get(connection_id)
#         if not websocket:
#             return await func(*args, **kwargs)
        
#         try:
#             # Call the original function
#             result = await func(*args, **kwargs)
            
#             # For screenshot and favicon, ensure paths are properly formatted
#             if tool_name in ['capture_website_screenshot', 'get_website_favicon']:
#                 # If result is a string (path), wrap it in a dict
#                 if isinstance(result, str):
#                     result = {"path": result}
                    
#                 # Make sure paths start with / for frontend use
#                 if isinstance(result, dict) and 'path' in result and not result['path'].startswith('/'):
#                     result['path'] = '/' + result['path']
            
#             # Send tool result event with minimal information
#             if websocket.client_state != websocket.client_state.DISCONNECTED:
#                 with suppress(RuntimeError, ConnectionError):
#                     await websocket.send_json({
#                         "type": "tool_result",
#                         "tool": tool_name,
#                         "result": result,
#                         "requestId": request_id,
#                         "timestamp": int(time.time() * 1000)
#                     })
            
#             return result
#         except Exception as e:
#             # Send error event with minimal information
#             if websocket.client_state != websocket.client_state.DISCONNECTED:
#                 with suppress(RuntimeError, ConnectionError):
#                     await websocket.send_json({
#                         "type": "tool_result",
#                         "tool": tool_name,
#                         "error": str(e),
#                         "requestId": request_id,
#                         "timestamp": int(time.time() * 1000)
#                     })
            
#             # Re-raise the exception
#             raise
    
#     return wrapper

# def capture_website_screenshot(url: str) -> str:
#     """
#     Captures a screenshot of the entire website using headless browser.
    
#     Args:
#         url (str): URL of the website to capture
        
#     Returns:
#         str: URL path to the saved screenshot
#     """
#     from selenium import webdriver
#     from selenium.webdriver.chrome.options import Options
#     from bs4 import BeautifulSoup
#     import requests
#     import os
#     import time

#     filename = None
#     try:
#         if not filename:
#             # if session_id:
#             #     filename = f"static/screenshots/{session_id}_screenshot.png"
#             # else:
#             filename = f"static/screenshots/screenshot_{int(time.time())}.png"
        
#         # Set up Chrome options for headless mode
#         chrome_options = Options()
#         chrome_options.add_argument("--headless")
#         chrome_options.add_argument("--window-size=1920,1080")
        
#         # Initialize driver with options
#         driver = webdriver.Chrome(options=chrome_options)
#         driver.get(url)
#         driver.save_screenshot(filename)
#         driver.quit()
        
#         # Return the URL path
#         return f"/{filename}"
#     except Exception as e:
#         print(f"Error capturing screenshot: {e}")
#         return None
    
# def get_website_favicon(url: str) -> str:
#     """
#     Gets the favicon from a website and saves it.
    
#     Args:
#         url (str): URL of the website to scrape
        
#     Returns:
#         str: URL path to the saved favicon
#     """
#     from bs4 import BeautifulSoup
#     import requests
#     import time
#     import os
    
#     try:
#         # Create filename with timestamp
#         filename = f"static/favicons/favicon_{int(time.time())}.ico"
        
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
        
#         # Download the favicon and save it
#         if favicon_url:
#             favicon_response = requests.get(favicon_url, stream=True)
#             if favicon_response.status_code == 200:
#                 # Make sure the directory exists
#                 os.makedirs(os.path.dirname(filename), exist_ok=True)
                
#                 # Save favicon
#                 with open(filename, 'wb') as f:
#                     f.write(favicon_response.content)
                
#                 # Return the URL path
#                 return f"/{filename}"
        
#         return None
    
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

# def scrape_page(url: str) -> str:
#     client = ApifyClient(token=APIFY_API_KEY)

#     # Prepare the Actor input
#     run_input = {
#         "startUrls": [{"url": url}],
#         "useSitemaps": False,
#         "crawlerType": "playwright:firefox",
#         "includeUrlGlobs": [],
#         "excludeUrlGlobs": [],
#         "ignoreCanonicalUrl": False,
#         "maxCrawlDepth": 0,
#         "maxCrawlPages": 1,
#         "initialConcurrency": 0,
#         "maxConcurrency": 200,
#         "initialCookies": [],
#         "proxyConfiguration": {"useApifyProxy": True},
#         "maxSessionRotations": 10,
#         "maxRequestRetries": 5,
#         "requestTimeoutSecs": 60,
#         "dynamicContentWaitSecs": 10,
#         "maxScrollHeightPixels": 5000,
#         "removeElementsCssSelector": """nav, footer, script, style, noscript, svg,
#     [role=\"alert\"],
#     [role=\"banner\"],
#     [role=\"dialog\"],
#     [role=\"alertdialog\"],
#     [role=\"region\"][aria-label*=\"skip\" i],
#     [aria-modal=\"true\"]""",
#         "removeCookieWarnings": True,
#         "clickElementsCssSelector": '[aria-expanded="false"]',
#         "htmlTransformer": "readableText",
#         "readableTextCharThreshold": 100,
#         "aggressivePrune": False,
#         "debugMode": True,
#         "debugLog": True,
#         "saveHtml": True,
#         "saveMarkdown": True,
#         "saveFiles": False,
#         "saveScreenshots": False,
#         "maxResults": 9999999,
#         "clientSideMinChangePercentage": 15,
#         "renderingTypeDetectionPercentage": 10,
#     }

#     # Run the Actor and wait for it to finish
#     run = client.actor("aYG0l9s7dbB7j3gbS").call(run_input=run_input)

#     # Fetch and print Actor results from the run's dataset (if there are any)
#     text_data = ""
#     for item in client.dataset(run["defaultDatasetId"]).iterate_items():
#         text_data += item.get("text", "") + "\n"

#     average_token = 0.75
#     max_tokens = 20000  # slightly less than max to be safe 32k
#     text_data = text_data[: int(average_token * max_tokens)]
#     return text_data


@with_tool_visualization
async def analyze_with_perplexity_visualized(url: str, connection_id=None, request_id=None):
    """Analyze a website using Perplexity API with visualization"""
    print(f"Analyzing website with Perplexity: {url}")
    
    websocket = connection_id and active_connections.get(connection_id)
    
    if websocket and websocket.client_state != websocket.client_state.DISCONNECTED:
        try:
            # Send tool execution start event
            await websocket.send_json({
                "type": "tool_execution",
                "tool": "analyze_with_perplexity",
                "executionId": f"perplexity-{int(time.time())}",
                "params": {"url": url},
                "requestId": request_id,
                "timestamp": int(time.time() * 1000)
            })
        except Exception as e:
            print(f"Error sending tool execution event: {e}")
    
    # Perform the analysis
    result = analyze_with_perplexity(url)
    
    # Log the result
    if result and "analysis" in result:
        print(f"Analysis completed successfully for {url}")
    else:
        print(f"Analysis failed or returned no data for {url}")
        
    return result

@with_tool_visualization
async def capture_website_screenshot_visualized(url: str, connection_id=None, request_id=None):
    """Capture a website screenshot with visualization"""
    print(f"Capturing website screenshot (visualized): {url}")
    
    websocket = connection_id and active_connections.get(connection_id)
    
    if websocket and websocket.client_state != websocket.client_state.DISCONNECTED:
        try:
            # Send tool execution start event
            await websocket.send_json({
                "type": "tool_execution",
                "tool": "capture_website_screenshot",
                "executionId": f"screenshot-{int(time.time())}",
                "params": {"url": url},
                "requestId": request_id,
                "timestamp": int(time.time() * 1000)
            })
        except Exception as e:
            print(f"Error sending tool execution event: {e}")
    
    # Capture the screenshot
    screenshot_path = capture_website_screenshot(url)
    
    # Log the result
    if screenshot_path:
        print(f"Screenshot captured successfully: {screenshot_path}")
    else:
        print(f"Screenshot capture failed for {url}")
    
    return {"path": screenshot_path} if screenshot_path else None

@with_tool_visualization
async def get_website_favicon_visualized(url: str, connection_id=None, request_id=None):
    """Get a website favicon with visualization"""
    print(f"Getting website favicon (visualized): {url}")
    
    websocket = connection_id and active_connections.get(connection_id)
    
    if websocket and websocket.client_state != websocket.client_state.DISCONNECTED:
        try:
            # Send tool execution start event
            await websocket.send_json({
                "type": "tool_execution",
                "tool": "get_website_favicon",
                "executionId": f"favicon-{int(time.time())}",
                "params": {"url": url},
                "requestId": request_id,
                "timestamp": int(time.time() * 1000)
            })
        except Exception as e:
            print(f"Error sending tool execution event: {e}")
    
    # Get the favicon
    favicon_path = get_website_favicon(url)
    
    # Log the result
    if favicon_path:
        print(f"Favicon retrieved successfully: {favicon_path}")
    else:
        print(f"Favicon retrieval failed for {url}")
    
    return {"path": favicon_path} if favicon_path else None

@with_tool_visualization
async def get_insights_visualized(address: str, connection_id=None, request_id=None):
    return get_insights(address)

@with_tool_visualization
async def get_datalayers_visualized(address: str, connection_id=None, request_id=None):
    return get_datalayers(address)

# @with_tool_visualization
# async def get_report_visualized(address: str, connection_id=None, request_id=None):
#     return get_report(address)

@with_tool_visualization
async def get_report_visualized(address: str, connection_id=None, request_id=None):
    """Generate a solar report with progress updates"""
    # Get websocket connection
    websocket = active_connections.get(connection_id)
    
    # Start the report generation
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
    
    # For long-running operations, send progress updates
    if websocket and request_id and websocket.client_state != websocket.client_state.DISCONNECTED:
        with suppress(RuntimeError, ConnectionError):
            await websocket.send_json({
                "type": "tool_progress",
                "tool": "get_report",
                "progress": 0.2,
                "message": "Initializing report generation...",
                "requestId": request_id,
                "timestamp": int(time.time() * 1000)
            })
    
    # Simulate processing time for demo purposes
    await asyncio.sleep(1)
    
    # Send another progress update
    if websocket and request_id and websocket.client_state != websocket.client_state.DISCONNECTED:
        with suppress(RuntimeError, ConnectionError):
            await websocket.send_json({
                "type": "tool_progress",
                "tool": "get_report",
                "progress": 0.5,
                "message": "Processing satellite imagery...",
                "requestId": request_id,
                "timestamp": int(time.time() * 1000)
            })
    
    # Make the actual API call
    response = requests.post(url, headers=headers, params=params)
    
    # Send final progress update
    if websocket and request_id and websocket.client_state != websocket.client_state.DISCONNECTED:
        with suppress(RuntimeError, ConnectionError):
            await websocket.send_json({
                "type": "tool_progress",
                "tool": "get_report",
                "progress": 0.9,
                "message": "Finalizing report...",
                "requestId": request_id,
                "timestamp": int(time.time() * 1000)
            })
    
    # Return the result
    return response.json()

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
# In your agent setup:
def create_agents(user_id, session_id, request_id, connection_id):
    """Create AutoGen agents with event streaming capabilities"""
    
        # Create the websocket handler
    async def ws_handler(event_type, agent_name, message, req_id):
        await agent_callback(agent_name, event_type, message, req_id, connection_id)
    
    # Create ProductManager agent with event streaming
    ProductManager = EventStreamingAssistantAgent(
        name="ProductManager",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "ProductManager"),
        websocket_handler=ws_handler,
        request_id=request_id
    )
    
    # Create PreSalesConsultant agent with event streaming
    PreSalesConsultant = EventStreamingAssistantAgent(
        name="PreSalesConsultant",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "PreSalesConsultant"),
        description="A pre-sales consultant AI assistant capable of understanding customer more, handling sales, pricing, and technical analysis",
        websocket_handler=ws_handler,
        request_id=request_id
    )
    
    # Create wrapper functions that properly pass the parameters to tool functions
    async def analyze_perplexity_tool(url: str) -> dict:
        """Analyze website with perplexity with proper tool visualization"""
        print(f"Calling perplexity analysis for URL: {url}")
        return await analyze_with_perplexity_visualized(url, connection_id=connection_id, request_id=request_id)
    
    async def capture_screenshot_tool(url: str) -> str:
        """Capture website screenshot with proper tool visualization"""
        print(f"Capturing screenshot for URL: {url}")
        return await capture_website_screenshot_visualized(url, connection_id=connection_id, request_id=request_id)
    
    async def get_favicon_tool(url: str) -> str:
        """Get website favicon with proper tool visualization"""
        print(f"Getting favicon for URL: {url}")
        return await get_website_favicon_visualized(url, connection_id=connection_id, request_id=request_id)
    
    async def get_insights_tool(address: str) -> dict:
        """Get solar insights with proper tool visualization"""
        print(f"Getting solar insights for address: {address}")
        return await get_insights_visualized(address, connection_id=connection_id, request_id=request_id)
    
    async def get_datalayers_tool(address: str) -> dict:
        """Get solar data layers with proper tool visualization"""
        print(f"Getting data layers for address: {address}")
        return await get_datalayers_visualized(address, connection_id=connection_id, request_id=request_id)
    
    async def get_report_tool(address: str) -> dict:
        """Get solar report with proper tool visualization"""
        print(f"Getting solar report for address: {address}")
        return await get_report_visualized(address, connection_id=connection_id, request_id=request_id)

    # Register the wrapper functions for PreSalesConsultant
    PreSalesConsultant.register_for_llm(name="analyze_with_perplexity")(analyze_perplexity_tool)
    PreSalesConsultant.register_for_llm(name="capture_website_screenshot")(capture_screenshot_tool)
    PreSalesConsultant.register_for_llm(name="get_website_favicon")(get_favicon_tool)
    PreSalesConsultant.register_for_llm(name="get_insights")(get_insights_tool)
    PreSalesConsultant.register_for_llm(name="get_datalayers")(get_datalayers_tool)
    PreSalesConsultant.register_for_llm(name="get_report")(get_report_tool)


    # PreSalesConsultant.register_for_llm(name="analyze_with_perplexity")(
    #     lambda url: analyze_with_perplexity_visualized(url, connection_id=connection_id, request_id=request_id)
    # )
    # PreSalesConsultant.register_for_llm(name="capture_website_screenshot")(
    #     lambda url: capture_website_screenshot_visualized(url, connection_id=connection_id, request_id=request_id)
    # )
    # PreSalesConsultant.register_for_llm(name="get_website_favicon")(
    #     lambda url: get_website_favicon_visualized(url, connection_id=connection_id, request_id=request_id)
    # )
    # PreSalesConsultant.register_for_llm(name="get_insights")(
    #     lambda address: get_insights_visualized(address, connection_id=connection_id, request_id=request_id)
    # )
    # PreSalesConsultant.register_for_llm(name="get_datalayers")(
    #     lambda address: get_datalayers_visualized(address, connection_id=connection_id, request_id=request_id)
    # )
    # PreSalesConsultant.register_for_llm(name="get_report")(
    #     lambda address: get_report_visualized(address, connection_id=connection_id, request_id=request_id)
    # )
    
    # Create SocialMediaManager agent with event streaming
    SocialMediaManager = EventStreamingAssistantAgent(
        name="SocialMediaManager",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "SocialMediaManager"),
        description="A social media manager AI assistant handling digital presence and strategy",
        websocket_handler=ws_handler,
        request_id=request_id
    )
    
    # Create LeadGenSpecialist agent with event streaming
    LeadGenSpecialist = EventStreamingAssistantAgent(
        name="LeadGenSpecialist",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "LeadGenSpecialist"),
        description="A Lead generation specialist assistant capable of handling and managing follow-ups and setups",
        websocket_handler=ws_handler,
        request_id=request_id
    )
    
    # Register the tool functions for LeadGenSpecialist
    LeadGenSpecialist.register_for_llm(name="create_appointment")(create_appointment)
    LeadGenSpecialist.register_for_llm(name="get_appointment")(get_appointment)
    LeadGenSpecialist.register_for_llm(name="update_appointment")(update_appointment)
    
    LeadGenSpecialist.register_for_llm(name="create_calendar")(create_calendar)
    LeadGenSpecialist.register_for_llm(name="get_all_calendars")(get_all_calendars)
    LeadGenSpecialist.register_for_llm(name="get_calendar")(get_calendar)
    LeadGenSpecialist.register_for_llm(name="update_calendar")(update_calendar)
    
    LeadGenSpecialist.register_for_llm(name="create_contact")(create_contact)
    LeadGenSpecialist.register_for_llm(name="get_all_contacts")(get_all_contacts)
    LeadGenSpecialist.register_for_llm(name="get_contact")(get_contact)
    LeadGenSpecialist.register_for_llm(name="update_contact")(update_contact)
    
    LeadGenSpecialist.register_for_llm(name="create_sub_acc")(create_sub_acc)
    LeadGenSpecialist.register_for_llm(name="get_sub_acc")(get_sub_acc)
    LeadGenSpecialist.register_for_llm(name="update_sub_acc")(update_sub_acc)
    
    LeadGenSpecialist.register_for_llm(name="create_user")(create_user)
    LeadGenSpecialist.register_for_llm(name="get_user_by_location_id")(get_user_by_location_id)
    LeadGenSpecialist.register_for_llm(name="get_user")(get_user)
    LeadGenSpecialist.register_for_llm(name="update_user")(update_user)
    
    # Termination function for user agent
    def should_terminate_user(message):
        return "tool_calls" not in message and message["role"] != "tool"
    
    # User Agent (not needing the event streaming since it represents the human)
    user_agent = UserProxyAgent(
        name="UserAgent",
        llm_config=llm_config,
        description="A human user capable of interacting with AI agents.",
        code_execution_config=False,
        human_input_mode="NEVER",
        is_termination_msg=should_terminate_user
    )
    
    # Register all the tool functions for user_agent as well
    # PreSalesConsultant tools
    user_agent.register_for_execution(name="analyze_with_perplexity")(analyze_with_perplexity)
    user_agent.register_for_execution(name="capture_website_screenshot")(capture_website_screenshot)
    user_agent.register_for_execution(name="get_website_favicon")(get_website_favicon)
    user_agent.register_for_execution(name="get_insights")(get_insights)
    user_agent.register_for_execution(name="get_datalayers")(get_datalayers)
    user_agent.register_for_execution(name="get_report")(get_report)
    
    # LeadGenSpecialist tools
    user_agent.register_for_execution(name="create_appointment")(create_appointment)
    user_agent.register_for_execution(name="get_appointment")(get_appointment)
    user_agent.register_for_execution(name="update_appointment")(update_appointment)
    
    user_agent.register_for_execution(name="create_calendar")(create_calendar)
    user_agent.register_for_execution(name="get_all_calendars")(get_all_calendars)
    user_agent.register_for_execution(name="get_calendar")(get_calendar)
    user_agent.register_for_execution(name="update_calendar")(update_calendar)
    
    user_agent.register_for_execution(name="create_contact")(create_contact)
    user_agent.register_for_execution(name="get_all_contacts")(get_all_contacts)
    user_agent.register_for_execution(name="get_contact")(get_contact)
    user_agent.register_for_execution(name="update_contact")(update_contact)
    
    user_agent.register_for_execution(name="create_sub_acc")(create_sub_acc)
    user_agent.register_for_execution(name="get_sub_acc")(get_sub_acc)
    user_agent.register_for_execution(name="update_sub_acc")(update_sub_acc)
    
    user_agent.register_for_execution(name="create_user")(create_user)
    user_agent.register_for_execution(name="get_user_by_location_id")(get_user_by_location_id)
    user_agent.register_for_execution(name="get_user")(get_user)
    user_agent.register_for_execution(name="update_user")(update_user)
    
    # Add a direct event method to each agent for manual event triggering
    for agent in [ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist]:
        agent.send_event = lambda event_type, message, agent=agent: ws_handler(
            event_type, agent.name, message, request_id
        )
    
    return ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

# Store ongoing chat processes and their status
ongoing_chats: Dict[str, Dict[str, Any]] = {}


async def send_event(websocket, event_type, agent=None, message=None, request_id=None, final=False):
    """Send a standardized event through the WebSocket with connection checking"""
    if not websocket:
        return
        
    # Check if the connection is still open before sending
    if websocket.client_state.DISCONNECTED:
        return
        
    # Use suppress to safely handle connection errors
    with suppress(RuntimeError, ConnectionError):
        await websocket.send_json({
            "type": event_type,
            "agent": agent,
            "message": message,
            "requestId": request_id,
            "final": final,  # Make sure this is included!
            "timestamp": int(time.time() * 1000)  # Current timestamp in milliseconds
        })

@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str):
    connection_id = f"{user_id}_{session_id}"

    print("PRINTING :", connection_id,user_id, session_id)
    
    # Accept the connection
    await websocket.accept()
    
    # Store connection
    active_connections[connection_id] = websocket
    
    try:
        # Add debugging output
        print(f"WebSocket connection established: {connection_id}")
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection_status",
            "status": "connected",
            "message": "WebSocket connection established"
        })
        
        # For debugging, automatically send an initial greeting if this is a new session
        if session_id not in chat_histories:
            print(f"New session detected: {session_id}, sending initial greeting")
            await websocket.send_json({
                "type": "agent_response",
                "agent": "Squidgy",
                "message": "Hi! I'm Squidgy and I'm here to help you win back time and make more money.",
                "requestId": f"auto-{int(time.time())}",
                "final": True,
                "timestamp": int(time.time() * 1000)
            })
        
        # Handle incoming messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Generate a unique request ID if not provided
            request_id = message_data.get("requestId", str(uuid.uuid4()))
            
            # Debug output
            print(f"Received message from {connection_id}: {message_data}")
            
            # Send acknowledgment
            await websocket.send_json({
                "type": "ack",
                "requestId": request_id,
                "message": "Message received, processing..."
            })
            
            # Process in background task
            asyncio.create_task(
                process_chat(
                    user_id, 
                    session_id, 
                    message_data.get("message", ""), 
                    request_id, 
                    connection_id
                )
            )
            
    except WebSocketDisconnect:
        # Clean up on disconnect
        if connection_id in active_connections:
            del active_connections[connection_id]
        logger.info(f"Client disconnected: {connection_id}")
    except Exception as e:
        logger.exception(f"WebSocket error: {str(e)}")
        # Attempt to send error message before closing
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"WebSocket error: {str(e)}"
            })
        except:
            pass

async def agent_callback(agent_name, event_type, message, request_id, connection_id):
    """Callback to stream events from AutoGen agents with connection checking"""
    websocket = active_connections.get(connection_id)
    if websocket and websocket.client_state != websocket.client_state.DISCONNECTED:
        await send_event(
            websocket,
            event_type,
            agent=agent_name,
            message=message,
            request_id=request_id
        )

async def process_chat(user_id: str, session_id: str, user_input: str, request_id: str, connection_id: str):
    """Process a chat message with enhanced event streaming and connection checking"""
    ongoing_chats[request_id] = {"status": "processing", "connection_id": connection_id}
    
    try:
        websocket = active_connections.get(connection_id)
        if not websocket:
            logger.error(f"WebSocket connection not found for {connection_id}")
            return
        
        # Check connection state
        if websocket.client_state == websocket.client_state.DISCONNECTED:
            logger.info(f"Client already disconnected: {connection_id}")
            ongoing_chats[request_id]["status"] = "disconnected"
            return

        if not user_input:
            logger.info(f"Empty initial message received for {connection_id}")
            # Send a direct greeting response without going through agents
            await send_event(
                websocket, 
                "agent_response", 
                agent="Squidgy", 
                message="Hi! I'm Squidgy and I'm here to help you win back time and make more money. To get started, could you tell me your website?", 
                request_id=request_id, 
                final=True
            )
            
            # Save to chat history
            save_message_to_history(session_id, "AI", "Hi! I'm Squidgy and I'm here to help you win back time and make more money. To get started, could you tell me your website?")
            
            ongoing_chats[request_id]["status"] = "completed"
            return
        
        # Initial processing start event
        await send_event(
            websocket, 
            "processing_start", 
            message="Starting analysis pipeline...", 
            request_id=request_id
        )
        
        # Create agents - FIX: Pass request_id and connection_id parameters
        ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent = create_agents(
            user_id, 
            session_id, 
            request_id, 
            connection_id
        )
        
        # Stream thinking events from each agent before actual processing
        # This provides immediate feedback while the actual processing happens
        agents = [
            {"name": "ProductManager", "message": "Planning approach and coordinating team..."}, 
            {"name": "PreSalesConsultant", "message": "Analyzing requirements and researching solutions..."},
            {"name": "SocialMediaManager", "message": "Developing digital strategy recommendations..."},
            {"name": "LeadGenSpecialist", "message": "Preparing follow-up actions and resources..."}
        ]
        
        # Send thinking events in sequence with small delays
        for agent in agents:
            # Check connection before sending each message
            if websocket.client_state == websocket.client_state.DISCONNECTED:
                logger.info(f"Client disconnected during processing: {connection_id}")
                ongoing_chats[request_id]["status"] = "disconnected"
                return
                
            await send_event(
                websocket, 
                "agent_thinking", 
                agent=agent["name"], 
                message=agent["message"], 
                request_id=request_id
            )
            await asyncio.sleep(0.5)  # Small delay between agent updates
            
            # Optional: Send more detailed updates for each agent
            if agent["name"] == "PreSalesConsultant":
                # PreSalesConsultant shows more detailed steps
                steps = [
                    "Parsing input query...",
                    "Analyzing website structure...",
                    "Identifying key business attributes...",
                    "Evaluating market position..."
                ]
                
                for step in steps:
                    # Check connection before each message
                    if websocket.client_state == websocket.client_state.DISCONNECTED:
                        logger.info(f"Client disconnected during processing: {connection_id}")
                        ongoing_chats[request_id]["status"] = "disconnected"
                        return
                        
                    await asyncio.sleep(0.4)
                    await send_event(
                        websocket, 
                        "agent_update", 
                        agent=agent["name"], 
                        message=step, 
                        request_id=request_id
                    )
        
        # Actual processing happens here
        await asyncio.sleep(1)
        
        # Check connection before proceeding
        if websocket.client_state == websocket.client_state.DISCONNECTED:
            logger.info(f"Client disconnected before chat processing: {connection_id}")
            ongoing_chats[request_id]["status"] = "disconnected"
            return
        
        # Configure group chat
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
        
        # Only restore history if there's history to restore
        if history["ProductManager"]:
            ProductManager._oai_messages = {group_manager: history["ProductManager"]}
        if history["PreSalesConsultant"]:
            PreSalesConsultant._oai_messages = {group_manager: history["PreSalesConsultant"]}
        if history["SocialMediaManager"]:
            SocialMediaManager._oai_messages = {group_manager: history["SocialMediaManager"]}
        if history["LeadGenSpecialist"]:
            LeadGenSpecialist._oai_messages = {group_manager: history["LeadGenSpecialist"]}
        if history["user_agent"]:
            user_agent._oai_messages = {group_manager: history["user_agent"]}
        
        # Run the real agent chat process
        final_response = await asyncio.to_thread(
            run_agent_chat, user_agent, group_manager, user_input
        )
        
        # Check connection before saving and sending final response
        if websocket.client_state == websocket.client_state.DISCONNECTED:
            logger.info(f"Client disconnected after chat processing: {connection_id}")
            ongoing_chats[request_id]["status"] = "disconnected"
            return
        
        # Save message to chat history
        save_message_to_history(session_id, "User", user_input)
        save_message_to_history(session_id, "AI", final_response)
        
        # Save updated conversation history
        save_history({
            "ProductManager": ProductManager.chat_messages.get(group_manager, []),
            "PreSalesConsultant": PreSalesConsultant.chat_messages.get(group_manager, []),
            "SocialMediaManager": SocialMediaManager.chat_messages.get(group_manager, []),
            "LeadGenSpecialist": LeadGenSpecialist.chat_messages.get(group_manager, []),
            "user_agent": user_agent.chat_messages.get(group_manager, [])
        })
        
        # Send final response with connection checking
        await send_event(
            websocket, 
            "agent_response", 
            agent="Squidgy", 
            message=final_response, 
            request_id=request_id, 
            final=True
        )
        
        ongoing_chats[request_id]["status"] = "completed"
        
    except Exception as e:
        logger.exception(f"Error processing chat: {str(e)}")
        try:
            if connection_id in active_connections:
                websocket = active_connections[connection_id]
                # Check connection before sending error
                if websocket.client_state != websocket.client_state.DISCONNECTED:
                    await send_event(
                        websocket, 
                        "error", 
                        message=f"An error occurred: {str(e)}", 
                        request_id=request_id, 
                        final=True
                    )
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
    #session_id = 'dd'
    if session_id not in chat_histories:
        # Return empty history if no messages for this session
        return ChatHistoryResponse(history=[], session_id=session_id)

        # return ChatHistoryResponse(
        # history=[
        #     ChatMessage(
        #         sender="AI",
        #         message="Hi! I'm Squidgy and I'm here to help you win back time and make more money. Think of me as like a consultant who can instantly build you a solution to a bunch of your problems. To get started, could you tell me your website?"
        #     )
        # ], 
        # session_id=session_id
        # )
    
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
    
    # Generate a unique request_id for this request
    request_id = f"{session_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    # Create a connection_id for consistency with WebSocket approach
    connection_id = f"{user_id}_{session_id}"
    
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
        # Create agents and group chat - FIX: Pass request_id and connection_id
        ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent = create_agents(
            user_id, 
            session_id,
            request_id,
            connection_id
        )
        
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
        
        # Only restore history if there's history to restore
        if history["ProductManager"]:
            ProductManager._oai_messages = {group_manager: history["ProductManager"]}
        if history["PreSalesConsultant"]:
            PreSalesConsultant._oai_messages = {group_manager: history["PreSalesConsultant"]}
        if history["SocialMediaManager"]:
            SocialMediaManager._oai_messages = {group_manager: history["SocialMediaManager"]}
        if history["LeadGenSpecialist"]:
            LeadGenSpecialist._oai_messages = {group_manager: history["LeadGenSpecialist"]}
        if history["user_agent"]:
            user_agent._oai_messages = {group_manager: history["user_agent"]}
        
        # Initiate chat
        user_agent.initiate_chat(group_manager, message=user_input, clear_history=False)
        
        # Get the response
        agent_response = group_chat.messages[-1]['content']
        
        # Save agent response to chat history
        save_message_to_history(session_id, "AI", agent_response)
        
        # Save conversation history
        save_history({
            "ProductManager": ProductManager.chat_messages.get(group_manager, []),
            "PreSalesConsultant": PreSalesConsultant.chat_messages.get(group_manager, []),
            "SocialMediaManager": SocialMediaManager.chat_messages.get(group_manager, []),
            "LeadGenSpecialist": LeadGenSpecialist.chat_messages.get(group_manager, []),
            "user_agent": user_agent.chat_messages.get(group_manager, [])
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

@app.get("/ws-health")
async def websocket_health():
    """Health check for WebSocket connections"""
    return {
        "status": "healthy",
        "active_connections": len(active_connections),
        "ongoing_chats": len(ongoing_chats)
    }

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