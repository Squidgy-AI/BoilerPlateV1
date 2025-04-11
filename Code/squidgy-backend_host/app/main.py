################################################################
## ADD REST ALL FILES SAME AS SIMPLE CHAT UI BACKEND
################################################################

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import logging
import uuid
import time
import os
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import uvicorn
from datetime import datetime
from contextlib import suppress
import requests

# Import AutoGen components
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

# Import environment variable handling
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import role descriptions
from roles_config import role_descriptions

# Import API functions
# Appointment Functions
from GHL.Appointments.create_appointment import create_appointment
from GHL.Appointments.get_appointment import get_appointment
from GHL.Appointments.update_appointment import update_appointment

# Calendar Functions
from GHL.Calendars.create_calendar import create_calendar
from GHL.Calendars.get_all_calendars import get_all_calendars
from GHL.Calendars.get_calendar import get_calendar
from GHL.Calendars.update_calendar import update_calendar

# Contact Functions
from GHL.Contacts.create_contact import create_contact
from GHL.Contacts.get_all_contacts import get_all_contacts
from GHL.Contacts.get_contact import get_contact
from GHL.Contacts.update_contact import update_contact

# Sub Account Functions
from GHL.Sub_Accounts.create_sub_acc import create_sub_acc
from GHL.Sub_Accounts.get_sub_acc import get_sub_acc
from GHL.Sub_Accounts.update_sub_acc import update_sub_acc

# User Functions
from GHL.Users.create_user import create_user
from GHL.Users.get_user_by_location_id import get_user_by_location_id
from GHL.Users.get_user import get_user
from GHL.Users.update_user import update_user

# Website Related
from Website.web_scrape import capture_website_screenshot, get_website_favicon

# Import vector store
from vector_store import VectorStore

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration from environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SOLAR_API_KEY = os.getenv('SOLAR_API_KEY')
PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')
APIFY_API_KEY = os.getenv('APIFY_API_KEY')

# Create FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for storing images if they don't exist
os.makedirs("static/screenshots", exist_ok=True)
os.makedirs("static/favicons", exist_ok=True)

# Mount static directories
app.mount("/static", StaticFiles(directory="static"), name="static")

# Define data models
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

# In-memory data stores
chat_histories: Dict[str, List[Dict[str, Any]]] = {}
active_connections: Dict[str, WebSocket] = {}
ongoing_chats: Dict[str, Dict[str, Any]] = {}

# Store for agent message history
message_history = {
    "ProductManager": [],
    "PreSalesConsultant": [],
    "SocialMediaManager": [],
    "LeadGenSpecialist": [],
    "user_agent": []
}

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
        logger.info("Vector store initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing vector store: {str(e)}")

# Initialize the vector store when the module loads
initialize_vector_store()

# LLM Configuration
llm_config = {
    "model": "gpt-4o",
    "api_key": OPENAI_API_KEY
}

def vector_setup_sys_mesage(role_descriptions, role):
    """Generate system message for an agent by combining role description and vector store templates"""
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
    """Save agent message history"""
    global message_history
    message_history = history
    
def get_history():
    """Get agent message history"""
    global message_history
    return message_history

def save_message_to_history(session_id: str, sender: str, message: str):
    """Save a message to the chat history for a specific session"""
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    
    timestamp = datetime.now().isoformat()
    
    chat_histories[session_id].append({
        "sender": sender, 
        "message": message, 
        "timestamp": timestamp
    })
    logger.debug(f"Message saved to history for session {session_id}: {sender}: {message[:50]}...")

def analyze_with_perplexity(url: str) -> dict:
    """Analyze a website using Perplexity API"""
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = f"""
    Please analyze the website {url} and provide a summary in exactly this format:
    --- *Company name*: [Extract company name]
    --- *Website*: {url}
    --- *Contact Information*: [Any available contact details]
    --- *Description*: [2-3 sentence summary of what the company does]
    --- *Tags*: [Main business categories, separated by periods]
    --- *Takeaways*: [Key business value propositions]
    --- *Niche*: [Specific market focus or specialty]
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

# def get_insights(address: str) -> Dict[str, Any]:
#     """Get solar insights for an address"""
#     base_url = "https://api.realwave.com/googleSolar"
#     headers = {
#         "Authorization": f"Bearer {SOLAR_API_KEY}",
#         "Content-Type": "application/json",
#         "Accept": "application/json"
#     }
#     url = f"{base_url}/insights"
#     params = {
#             "address": address,
#             "mode": "full",
#             "demo": "true"
#     }
#     response = requests.post(url, headers=headers, params=params)
#     return response.json()

def get_insights(address: str) -> Dict[str, Any]:
    """Get solar insights for an address with enhanced visualization data"""
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
    
    try:
        response = requests.post(url, headers=headers, params=params)
        result = response.json()
        
        # Process the response for visualization
        processed_result = {}
        
        # Extract location data for map visualization
        if "rwResult" in result and result["rwResult"] and "center" in result["rwResult"]:
            center = result["rwResult"]["center"]
            processed_result["location"] = {
                "latitude": center.get("latitude"),
                "longitude": center.get("longitude"),
                "address": address
            }
        
        # Extract solar potential data
        if "rwResult" in result and result["rwResult"] and "summary" in result["rwResult"]:
            summary = result["rwResult"]["summary"]
            processed_result["solarPotential"] = {
                "maxSunshineHoursPerYear": summary.get("maxSunshineHoursPerYear"),
                "minPanelCount": summary.get("minPanelCount"),
                "maxPanelCount": summary.get("maxPanelCount"),
                "idealPanelCount": summary.get("idealConfigurations", [{}])[0].get("panelCount") if summary.get("idealConfigurations") else None,
                "maxYearlyEnergy": summary.get("maxIdealYearlyEnergyDcKwh"),
                "estimatedSavings": summary.get("idealCashPurchaseSavings", {}).get("financialDetails", {}).get("lifetimeSavings")
            }
            
            # Add financial data if available
            if "financialSavingsAssumptions" in summary:
                processed_result["financials"] = {
                    "installationCost": summary.get("idealCashPurchaseSavings", {}).get("financialDetails", {}).get("initialAcquisitionCost"),
                    "annualSavings": summary.get("idealCashPurchaseSavings", {}).get("financialDetails", {}).get("averageYearlySavings"),
                    "paybackPeriodYears": summary.get("idealCashPurchaseSavings", {}).get("financialDetails", {}).get("paybackPeriodYears")
                }
        
        # Add raw building insights for detailed analysis if available
        if "rwResult" in result and result["rwResult"] and "solarResults" in result["rwResult"] and "solarPotential" in result["rwResult"]["solarResults"]:
            solar_potential = result["rwResult"]["solarResults"]["solarPotential"]
            processed_result["roofData"] = {
                "maxArrayAreaMeters2": solar_potential.get("maxArrayAreaMeters2"),
                "maxSunshineHoursPerYear": solar_potential.get("maxSunshineHoursPerYear"),
                "carbonOffsetFactorKgPerMwh": solar_potential.get("carbonOffsetFactorKgPerMwh"),
                "panelCapacityWatts": solar_potential.get("panelCapacityWatts"),
                "roofSegmentStats": solar_potential.get("roofSegmentStats", [])
            }
        
        return processed_result
        
    except Exception as e:
        logger.exception(f"Error fetching solar insights: {str(e)}")
        return {"error": str(e)}
    


def get_datalayers(address: str) -> Dict[str, Any]:
    """Get solar data layers for an address and process images for display"""
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
    
    try:
        response = requests.post(url, headers=headers, params=params)
        result = response.json()
        
        # Process the response for visualization
        processed_result = {}
        
        # Process image URLs if they exist
        if "rwResult" in result:
            rwResult = result["rwResult"]
            layers = []
            
            # Define the layers to extract and their display names
            layer_mappings = {
                "satelliteImageURL": {
                    "name": "Satellite View",
                    "description": "Satellite image of the property"
                },
                "compositedMarkedRGBURL": {
                    "name": "Property Marker",
                    "description": "Satellite image with property marked"
                },
                "compositedAnnualFluxURL": {
                    "name": "Solar Potential",
                    "description": "Annual solar energy potential overlay"
                },
                "compositedMarkedPanelsURL": {
                    "name": "Solar Panel Layout",
                    "description": "Recommended solar panel configuration"
                }
            }
            
            # Extract layers that exist in the response
            for key, info in layer_mappings.items():
                if key in rwResult and rwResult[key]:
                    layers.append({
                        "name": info["name"],
                        "description": info["description"],
                        "imageUrl": rwResult[key],
                        "type": key.replace("URL", "").lower()
                    })
            
            processed_result["layers"] = layers
            
            # Add expiration info if available
            if "imagesExpireOn" in rwResult:
                processed_result["expiresOn"] = rwResult["imagesExpireOn"]
        
        return processed_result
        
    except Exception as e:
        logger.exception(f"Error fetching solar data layers: {str(e)}")
        return {"error": str(e)}

# def get_datalayers(address: str) -> Dict[str, Any]:
#     """Get solar data layers for an address"""
#     base_url = "https://api.realwave.com/googleSolar"
#     headers = {
#         "Authorization": f"Bearer {SOLAR_API_KEY}",
#         "Content-Type": "application/json",
#         "Accept": "application/json"
#     }
#     url = f"{base_url}/dataLayers"
#     params = {
#             "address": address,
#             "renderPanels": "true",
#             "fileFormat": "jpeg",
#             "demo": "true"
#     }
#     response = requests.post(url, headers=headers, params=params)
#     return response.json()


def get_report(address: str) -> Dict[str, Any]:
    """Get solar report for an address and extract PDF download link"""
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
    
    try:
        response = requests.post(url, headers=headers, params=params)
        result = response.json()
        
        # Process the response for visualization
        processed_result = {}
        
        # Extract the PDF report URL
        if "rwResult" in result and result["rwResult"] and "reportURL" in result["rwResult"]:
            processed_result["reportUrl"] = result["rwResult"]["reportURL"]
        
        # Extract expiration date
        if "rwResult" in result and result["rwResult"] and "reportExpiresOn" in result["rwResult"]:
            processed_result["expiresOn"] = result["rwResult"]["reportExpiresOn"]
        
        # Extract structured data if available
        if "rwResult" in result and result["rwResult"] and "structuredDataForAgents" in result["rwResult"]:
            try:
                structured_data = json.loads(result["rwResult"]["structuredDataForAgents"])
                
                # Create a summary from the structured data
                summary_parts = []
                
                if "systemSize" in structured_data and "capacityKw" in structured_data["systemSize"]:
                    summary_parts.append(f"System size: {structured_data['systemSize']['capacityKw']:.1f} kW")
                
                if "panelCount" in structured_data:
                    summary_parts.append(f"Panel count: {structured_data['panelCount']}")
                
                if "financialSummary" in structured_data:
                    financial = structured_data["financialSummary"]
                    if "lifetimeSavings" in financial:
                        summary_parts.append(f"Lifetime savings: ${financial['lifetimeSavings']:,.2f}")
                    if "paybackPeriodYears" in financial:
                        summary_parts.append(f"Payback period: {financial['paybackPeriodYears']:.1f} years")
                
                processed_result["summary"] = ". ".join(summary_parts)
                processed_result["reportData"] = structured_data
            except json.JSONDecodeError:
                # If parsing fails, provide a basic summary
                processed_result["summary"] = f"Solar report generated for {address}."
        
        return processed_result
        
    except Exception as e:
        logger.exception(f"Error generating solar report: {str(e)}")
        return {"error": str(e)}

# def get_report(address: str) -> Dict[str, Any]:
#     """Get solar report for an address"""
#     base_url = "https://api.realwave.com/googleSolar"
#     headers = {
#         "Authorization": f"Bearer {SOLAR_API_KEY}",
#         "Content-Type": "application/json",
#         "Accept": "application/json"
#     }
#     url = f"{base_url}/report"
#     params = {
#             "address": address,
#             "organizationName": "Squidgy Solar",
#             "leadName": "Potential Client",
#             "demo": "true"
#     }
#     response = requests.post(url, headers=headers, params=params)
#     return response.json()

async def wrapped_capture_screenshot(url, request_id, websocket):
    """Wrapper around capture_website_screenshot to send results via WebSocket"""
    execution_id = f"screenshot-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    
    # First, send a tool execution start message
    try:
        await websocket.send_json({
            "type": "tool_execution",
            "tool": "capture_website_screenshot",
            "executionId": execution_id,
            "params": {"url": url},
            "requestId": request_id,
            "timestamp": int(time.time() * 1000)
        })
    except Exception as e:
        logger.exception(f"Error sending tool execution start: {str(e)}")
    
    # Call the original function
    try:
        result = await asyncio.to_thread(capture_website_screenshot, url, session_id=request_id.split('-')[0])
        
        # Send the result
        await send_tool_result(
            websocket,
            "capture_website_screenshot",
            execution_id,
            {"status": "success", "path": result},
            request_id
        )
        
        return result
    except Exception as e:
        logger.exception(f"Error in screenshot capture: {str(e)}")
        await send_tool_result(
            websocket,
            "capture_website_screenshot",
            execution_id,
            {"status": "error", "message": str(e)},
            request_id
        )
        return None

# Create Agents function
def create_agents(user_id, session_id):
    """Create AutoGen agents with appropriate configurations"""
    # Create ProductManager agent
    ProductManager = AssistantAgent(
        name="ProductManager",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "ProductManager"),
        description="A product manager AI assistant capable of starting conversation and delegation to others",
        human_input_mode="NEVER"
    )

    # Create PreSalesConsultant agent
    PreSalesConsultant = AssistantAgent(
        name="PreSalesConsultant",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "PreSalesConsultant"),
        description="A pre-sales consultant AI assistant capable of understanding customer more, handling sales, pricing, and technical analysis",
        human_input_mode="NEVER"
    )

    # Register tools for PreSalesConsultant
    PreSalesConsultant.register_for_llm(name="analyze_with_perplexity")(analyze_with_perplexity)
    PreSalesConsultant.register_for_llm(name="capture_website_screenshot")(capture_website_screenshot)
    PreSalesConsultant.register_for_llm(name="get_website_favicon")(get_website_favicon)
    PreSalesConsultant.register_for_llm(name="get_insights")(get_insights)
    PreSalesConsultant.register_for_llm(name="get_datalayers")(get_datalayers)
    PreSalesConsultant.register_for_llm(name="get_report")(get_report)

    # Create SocialMediaManager agent
    SocialMediaManager = AssistantAgent(
        name="SocialMediaManager",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "SocialMediaManager"),
        description="A social media manager AI assistant handling digital presence and strategy",
        human_input_mode="NEVER"
    )

    # Create LeadGenSpecialist agent
    LeadGenSpecialist = AssistantAgent(
        name="LeadGenSpecialist",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "LeadGenSpecialist"),
        description="A Lead generation specialist assistant capable of handling and managing follow-ups and setups",
        human_input_mode="NEVER"
    )

    # Register tools for LeadGenSpecialist
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

    # Create UserProxyAgent
    user_agent = UserProxyAgent(
        name="UserAgent",
        llm_config=llm_config,
        description="A human user capable of interacting with AI agents.",
        code_execution_config=False,
        human_input_mode="NEVER",
        is_termination_msg=should_terminate_user
    )
    
    # Register all tools for user_agent as well
    user_agent.register_for_execution(name="analyze_with_perplexity")(analyze_with_perplexity)
    user_agent.register_for_execution(name="capture_website_screenshot")(capture_website_screenshot)
    user_agent.register_for_execution(name="get_website_favicon")(get_website_favicon)
    user_agent.register_for_execution(name="get_insights")(get_insights)
    user_agent.register_for_execution(name="get_datalayers")(get_datalayers)
    user_agent.register_for_execution(name="get_report")(get_report)
    
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

    return ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent

# Enhanced WebSocket endpoint with proper event streaming
@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, session_id: str):
    """WebSocket endpoint for real-time chat with event streaming"""
    connection_id = f"{user_id}_{session_id}"
    print("DUSK :", connection_id)
    
    # Accept the connection
    await websocket.accept()
    
    # Store connection
    active_connections[connection_id] = websocket
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection_status",
            "status": "connected",
            "message": "WebSocket connection established",
            "timestamp": int(time.time() * 1000)
        })
        
        # Send initial greeting ONLY if this is a new session with no history
        if session_id not in chat_histories or len(chat_histories[session_id]) == 0:
            logger.info(f"New session detected: {session_id}, sending initial greeting")
            
            # The greeting message
            greeting = "Hi! I'm Squidgy and I'm here to help you win back time and make more money. To get started, could you tell me your website?"
            
            # Create a unique request ID for the greeting
            greeting_id = f"init-{int(time.time())}"
            
            # Save greeting to history
            save_message_to_history(session_id, "AI", greeting)
            
            # Send the greeting
            await websocket.send_json({
                "type": "agent_response",
                "agent": "Squidgy",
                "message": greeting,
                "requestId": greeting_id,
                "final": True,
                "timestamp": int(time.time() * 1000)
            })
        
        # Handle incoming messages
        while True:
            # Wait for a message from the client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Generate a unique request ID if not provided
            request_id = message_data.get("requestId", str(uuid.uuid4()))
            
            # Extract the message content
            user_input = message_data.get("message", "").strip()
            
            # Send acknowledgment
            await websocket.send_json({
                "type": "ack",
                "requestId": request_id,
                "message": "Message received, processing...",
                "timestamp": int(time.time() * 1000)
            })
            
            # Process the message in a background task to avoid blocking
            asyncio.create_task(
                process_chat(
                    user_id, 
                    session_id, 
                    user_input, 
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
        # Handle unexpected errors
        logger.exception(f"WebSocket error: {str(e)}")
        
        # Try to send error message before closing
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"WebSocket error: {str(e)}",
                "timestamp": int(time.time() * 1000)
            })
        except:
            pass
            
        # Clean up connection
        if connection_id in active_connections:
            del active_connections[connection_id]


async def send_tool_result(websocket, tool_name, execution_id, result, request_id):
    """Send tool execution result via WebSocket"""
    if websocket.client_state == websocket.client_state.DISCONNECTED:
        return

    try:
        # Process the result for image paths to ensure they're properly formatted
        processed_result = result
        if isinstance(result, dict) and 'path' in result and tool_name in ['capture_website_screenshot', 'get_website_favicon']:
            # Create a copy to avoid modifying the original
            processed_result = dict(result)
            
            # Get just the filename component
            if isinstance(processed_result['path'], str):
                filename = processed_result['path']
                if '/' in filename:
                    filename = filename.split('/')[-1]
                
                # Set the path to the static URL format
                if tool_name == 'capture_website_screenshot':
                    processed_result['path'] = f"/static/screenshots/{filename}"
                elif tool_name == 'get_website_favicon':
                    processed_result['path'] = f"/static/favicons/{filename}"
                
                # Debug log
                print(f"Processed image path for {tool_name}: {processed_result['path']}")
        
        await websocket.send_json({
            "type": "tool_result",
            "tool": tool_name,
            "executionId": execution_id,
            "result": processed_result,
            "requestId": request_id,
            "timestamp": int(time.time() * 1000)
        })
    except Exception as e:
        logger.exception(f"Error sending tool result: {str(e)}")


async def process_chat(user_id: str, session_id: str, user_input: str, request_id: str, connection_id: str):
    """Process a chat message with enhanced event streaming"""
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

        # Handle empty message (this should rarely happen as initial greeting is now handled in websocket_endpoint)
        if not user_input:
            logger.info(f"Empty message received for {connection_id}")
            ongoing_chats[request_id]["status"] = "completed"
            return
        
        # Save user message to chat history
        save_message_to_history(session_id, "User", user_input)
        
        # Notify client that processing has started
        await websocket.send_json({
            "type": "processing_start", 
            "message": "Starting analysis pipeline...", 
            "requestId": request_id,
            "timestamp": int(time.time() * 1000)
        })
        
        # Create the agents
        ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent = create_agents(
            user_id, 
            session_id
        )
        
        # Send thinking events for each agent to provide feedback during processing
        agents = [
            {"name": "ProductManager", "message": "Planning approach and coordinating team..."}, 
            {"name": "PreSalesConsultant", "message": "Analyzing requirements and researching solutions..."},
            {"name": "SocialMediaManager", "message": "Developing digital strategy recommendations..."},
            {"name": "LeadGenSpecialist", "message": "Preparing follow-up actions and resources..."}
        ]
        
        # Send thinking events for each agent with small delays
        for agent in agents:
            # Check connection before sending each message
            if websocket.client_state == websocket.client_state.DISCONNECTED:
                logger.info(f"Client disconnected during processing: {connection_id}")
                ongoing_chats[request_id]["status"] = "disconnected"
                return
                
            await websocket.send_json({
                "type": "agent_thinking", 
                "agent": agent["name"], 
                "message": agent["message"], 
                "requestId": request_id,
                "timestamp": int(time.time() * 1000)
            })
            await asyncio.sleep(0.3)  # Small delay between agent updates
        
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
        
        # Check connection before running the model
        if websocket.client_state == websocket.client_state.DISCONNECTED:
            logger.info(f"Client disconnected before chat processing: {connection_id}")
            ongoing_chats[request_id]["status"] = "disconnected"
            return
        
        # Run the agent chat in a separate thread to avoid blocking the event loop
        final_response = await asyncio.to_thread(run_agent_chat, 
            user_agent, 
            group_manager, 
            user_input,
            request_id,
            websocket
        )
        
        # Check connection before saving and sending final response
        if websocket.client_state == websocket.client_state.DISCONNECTED:
            logger.info(f"Client disconnected after chat processing: {connection_id}")
            ongoing_chats[request_id]["status"] = "disconnected"
            return
        
        # Save AI response to chat history
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
        await websocket.send_json({
            "type": "agent_response", 
            "agent": "Squidgy", 
            "message": final_response, 
            "requestId": request_id, 
            "final": True,
            "timestamp": int(time.time() * 1000)
        })
        
        ongoing_chats[request_id]["status"] = "completed"
        
    except Exception as e:
        logger.exception(f"Error processing chat: {str(e)}")
        try:
            if connection_id in active_connections:
                websocket = active_connections[connection_id]
                # Check connection before sending error
                if websocket.client_state != websocket.client_state.DISCONNECTED:
                    await websocket.send_json({
                        "type": "error", 
                        "message": f"An error occurred: {str(e)}", 
                        "requestId": request_id, 
                        "final": True,
                        "timestamp": int(time.time() * 1000)
                    })
        except Exception as send_error:
            logger.exception(f"Error sending error message: {str(send_error)}")
        
        ongoing_chats[request_id]["status"] = "error"

def run_agent_chat(user_agent, group_manager, user_input, request_id, websocket):
    """Run the agent chat synchronously and return the final response"""
    # Store original execute function
    original_execute = user_agent.execute_function
    
    # Create a wrapper that can call the async function synchronously
    def sync_execute_with_tracking(function_call, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def handle_tool_execution():
            # Extract function name and arguments
            function_name = function_call.get('name')
            arguments_str = function_call.get('arguments', '{}')
            
            # Parse the arguments JSON string
            try:
                arguments = json.loads(arguments_str)
            except:
                arguments = {}
                
            logger.info(f"Tool execution detected: {function_call}")
            
            if function_name == "analyze_with_perplexity" and "url" in arguments:
                url = arguments["url"]
                execution_id = f"perplexity-{int(time.time())}-{uuid.uuid4().hex[:8]}"
                
                # Send tool execution start message
                try:
                    await websocket.send_json({
                        "type": "tool_execution",
                        "tool": "analyze_with_perplexity",
                        "executionId": execution_id,
                        "params": {"url": url},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                except Exception as e:
                    logger.exception(f"Error sending tool execution start: {str(e)}")
                
                # Call the original function
                try:
                    result = analyze_with_perplexity(url)
                    
                    # Send the result
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "analyze_with_perplexity",
                        "executionId": execution_id,
                        "result": result,
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    
                    return False,{"content": str(result)}
                except Exception as e:
                    logger.exception(f"Error in perplexity analysis: {str(e)}")
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "analyze_with_perplexity",
                        "executionId": execution_id,
                        "result": {"status": "error", "message": str(e)},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    return False,{"content": f"Error analyzing website Perplex: {str(e)}"}
                    
            elif function_name == "capture_website_screenshot" and "url" in arguments:
                url = arguments["url"]
                execution_id = f"screenshot-{int(time.time())}-{uuid.uuid4().hex[:8]}"
                
                # Send tool execution start message
                try:
                    await websocket.send_json({
                        "type": "tool_execution",
                        "tool": "capture_website_screenshot",
                        "executionId": execution_id,
                        "params": {"url": url},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                except Exception as e:
                    logger.exception(f"Error sending tool execution start: {str(e)}")
                
                # Call the original function
                try:
                    result = capture_website_screenshot(url, session_id=request_id.split('-')[0])
                    
                    # Send the result
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "capture_website_screenshot",
                        "executionId": execution_id,
                        "result": {"status": "success", "path": result},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    
                    return False,{"content": str(result)}
                except Exception as e:
                    logger.exception(f"Error in screenshot capture: {str(e)}")
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "capture_website_screenshot",
                        "executionId": execution_id,
                        "result": {"status": "error", "message": str(e)},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    return False,{"content": f"Error analyzing website Sceenr: {str(e)}"}
                    
            elif function_name == "get_website_favicon" and "url" in arguments:
                url = arguments["url"]
                execution_id = f"favicon-{int(time.time())}-{uuid.uuid4().hex[:8]}"
                
                # Send tool execution start message
                try:
                    await websocket.send_json({
                        "type": "tool_execution",
                        "tool": "get_website_favicon",
                        "executionId": execution_id,
                        "params": {"url": url},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                except Exception as e:
                    logger.exception(f"Error sending tool execution start: {str(e)}")
                
                # Call the original function
                try:
                    result = get_website_favicon(url, session_id=request_id.split('-')[0])
                    
                    # Send the result
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_website_favicon",
                        "executionId": execution_id,
                        "result": {"status": "success", "path": result},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    
                    return False,{"content": str(result)}
                except Exception as e:
                    logger.exception(f"Error in favicon capture: {str(e)}")
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_website_favicon",
                        "executionId": execution_id,
                        "result": {"status": "error", "message": str(e)},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    return False,{"content": f"Error analyzing website favicon: {str(e)}"}
                
            # Add this to the sync_execute_with_tracking function in run_agent_chat

            elif function_name == "get_insights" and "address" in arguments:
                address = arguments["address"]
                execution_id = f"insights-{int(time.time())}-{uuid.uuid4().hex[:8]}"
                
                # Send tool execution start message
                try:
                    await websocket.send_json({
                        "type": "tool_execution",
                        "tool": "get_insights",
                        "executionId": execution_id,
                        "params": {"address": address},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                except Exception as e:
                    logger.exception(f"Error sending tool execution start: {str(e)}")
                
                # Call the function
                try:
                    result = get_insights(address)
                    
                    # Send the result
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_insights",
                        "executionId": execution_id,
                        "result": result,
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    
                    # Create a summary of the results for the agent response
                    summary = "Solar analysis completed for the property."
                    if "solarPotential" in result:
                        potential = result["solarPotential"]
                        if "maxSunshineHoursPerYear" in potential and potential["maxSunshineHoursPerYear"]:
                            summary += f" The property receives approximately {potential['maxSunshineHoursPerYear']:.0f} sunshine hours per year."
                        if "idealPanelCount" in potential and potential["idealPanelCount"]:
                            summary += f" Recommended system: {potential['idealPanelCount']} panels."
                        if "estimatedSavings" in potential and potential["estimatedSavings"]:
                            summary += f" Estimated lifetime savings: ${potential['estimatedSavings']:,.2f}."
                    
                    return False, {"content": summary}
                except Exception as e:
                    logger.exception(f"Error in solar insights analysis: {str(e)}")
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_insights",
                        "executionId": execution_id,
                        "result": {"status": "error", "message": str(e)},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    return False, {"content": f"Error analyzing solar insights: {str(e)}"}

            elif function_name == "get_datalayers" and "address" in arguments:
                address = arguments["address"]
                execution_id = f"datalayers-{int(time.time())}-{uuid.uuid4().hex[:8]}"
                
                # Send tool execution start message
                try:
                    await websocket.send_json({
                        "type": "tool_execution",
                        "tool": "get_datalayers",
                        "executionId": execution_id,
                        "params": {"address": address},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                except Exception as e:
                    logger.exception(f"Error sending tool execution start: {str(e)}")
                
                # Call the function
                try:
                    result = get_datalayers(address)
                    
                    # Send the result
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_datalayers",
                        "executionId": execution_id,
                        "result": result,
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    
                    # Create a summary message
                    layer_count = len(result.get("layers", []))
                    summary = f"Generated {layer_count} solar visualization images for {address}."
                    if layer_count > 0:
                        layer_names = [layer["name"] for layer in result.get("layers", [])]
                        summary += f" Visualization types include: {', '.join(layer_names)}."
                    
                    return False, {"content": summary}
                except Exception as e:
                    logger.exception(f"Error in solar data layer analysis: {str(e)}")
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_datalayers",
                        "executionId": execution_id,
                        "result": {"status": "error", "message": str(e)},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    return False, {"content": f"Error analyzing solar data layers: {str(e)}"}

            elif function_name == "get_report" and "address" in arguments:
                address = arguments["address"]
                execution_id = f"report-{int(time.time())}-{uuid.uuid4().hex[:8]}"
                
                # Send tool execution start message
                try:
                    await websocket.send_json({
                        "type": "tool_execution",
                        "tool": "get_report",
                        "executionId": execution_id,
                        "params": {"address": address},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                except Exception as e:
                    logger.exception(f"Error sending tool execution start: {str(e)}")
                
                # Call the function
                try:
                    result = get_report(address)
                    
                    # Send the result
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_report",
                        "executionId": execution_id,
                        "result": result,
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    
                    # Create a response message
                    summary = f"Solar report generated for {address}."
                    if "summary" in result:
                        summary += f" {result['summary']}"
                    if "reportUrl" in result:
                        summary += " A detailed PDF report is available for download."
                    
                    return False, {"content": summary}
                except Exception as e:
                    logger.exception(f"Error generating solar report: {str(e)}")
                    await websocket.send_json({
                        "type": "tool_result",
                        "tool": "get_report",
                        "executionId": execution_id,
                        "result": {"status": "error", "message": str(e)},
                        "requestId": request_id,
                        "timestamp": int(time.time() * 1000)
                    })
                    return False, {"content": f"Error generating solar report: {str(e)}"}
            else:
                # Call original method for other functions
                try:
                    return original_execute(function_call, **kwargs)
                except Exception as e:
                    logger.exception(f"Error executing function {function_name}: {str(e)}")
                    return {"status": "error", "message": str(e)}
                
            
                
        try:
            return loop.run_until_complete(handle_tool_execution())
        finally:
            loop.close()
    
    # Replace the method temporarily
    user_agent.execute_function = sync_execute_with_tracking
    
    try:
        # Run the agent chat
        user_agent.initiate_chat(group_manager, message=user_input, clear_history=False)
        return group_manager.groupchat.messages[-1]['content']
    finally:
        # Restore original method
        user_agent.execute_function = original_execute


# Health check endpoint
@app.get("/")
async def health_check():
    return {"status": "healthy", "message": "Squidgy AI WebSocket Server is running"}

# Get chat history endpoint
@app.get("/chat-history", response_model=ChatHistoryResponse)
async def get_chat_history(session_id: str):
    """Retrieve chat history for a specific session with associated website data"""
    if session_id not in chat_histories:
        # Return empty history if no messages for this session
        return ChatHistoryResponse(history=[], session_id=session_id)
    
    # Convert dictionary history to ChatMessage objects
    history = [
        ChatMessage(**msg) for msg in chat_histories[session_id]
    ]
    
    # Check if we have website data for this session
    website_data = {}
    
    screenshot_path = f"static/screenshots/{session_id}_screenshot.jpg"
    if os.path.exists(screenshot_path):
        website_data["screenshot"] = f"/static/screenshots/{session_id}_screenshot.jpg"

    # Check if favicon exists
    favicon_path = f"static/favicons/{session_id}_logo.jpg"
    if os.path.exists(favicon_path):
        website_data["favicon"] = f"/static/favicons/{session_id}_logo.jpg"
    
    # Extract website URL from chat history if available
    for msg in chat_histories[session_id]:
        if msg["sender"] == "User" and ("http://" in msg["message"] or "https://" in msg["message"]):
            url_start = msg["message"].find("http")
            url_end = msg["message"].find(" ", url_start) if " " in msg["message"][url_start:] else len(msg["message"])
            website_data["url"] = msg["message"][url_start:url_end]
            break
    
    return ChatHistoryResponse(
        history=history,
        session_id=session_id,
        websiteData=website_data if website_data else None
    )

# Traditional REST endpoint for chat (for compatibility)
@app.post("/chat", response_model=ChatResponse)
async def chat_rest(request: ChatRequest):
    """Traditional REST endpoint for chat (less efficient than WebSocket)"""
    user_id = request.user_id
    session_id = request.session_id
    user_input = request.user_input.strip()
    
    # Generate a unique request_id for this request
    request_id = f"{session_id}_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    
    # Log the incoming request
    logger.info(f"REST chat request received from {user_id} in session {session_id}")
    
    if not user_input:
        initial_greeting = """Hi! I'm Squidgy and I'm here to help you win back time and make more money. To get started, could you tell me your website?"""
        
        # Save the initial greeting to chat history
        save_message_to_history(session_id, "AI", initial_greeting)
        
        return ChatResponse(agent=initial_greeting, session_id=session_id)
    
    # Save user input to chat history
    save_message_to_history(session_id, "User", user_input)
    
    try:
        # Create agents and group chat
        ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent = create_agents(
            user_id, 
            session_id
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

# Status check endpoints
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

# Cancel chat endpoint
@app.post("/cancel-chat/{request_id}")
async def cancel_chat(request_id: str):
    """Cancel an ongoing chat request"""
    if request_id not in ongoing_chats:
        raise HTTPException(status_code=404, detail="Chat request not found")
    
    ongoing_chats[request_id]["status"] = "cancelled"
    # You would need additional logic to actually stop the processing
    
    return {"status": "cancelled", "request_id": request_id}

# Run the server
if __name__ == '__main__':
    # Import here to avoid circular imports
    import uvicorn
    import requests
    
    # Start the server
    uvicorn.run("main:app", host="127.0.0.1", port=8080, reload=True, log_level="debug")


# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
# import requests
# from apify_client import ApifyClient
# from vector_store import VectorStore 
# import os
# from pydantic import BaseModel
# import logging
# import uvicorn
# from typing import Dict, Any
# from dotenv import load_dotenv

# # Load environment variables from .env file
# load_dotenv()

# from roles_config import role_descriptions

# # Appointment Functions
# from GHL.Appointments.create_appointment import create_appointment
# from GHL.Appointments.get_appointment import get_appointment
# from GHL.Appointments.update_appointment import update_appointment

# # Calendar Functions
# from GHL.Calendars.create_calendar import create_calendar
# from GHL.Calendars.delete_calendar import delete_calendar
# from GHL.Calendars.get_all_calendars import get_all_calendars
# from GHL.Calendars.get_calendar import get_calendar
# from GHL.Calendars.update_calendar import update_calendar

# # Contact Functions
# from GHL.Contacts.create_contact import create_contact
# from GHL.Contacts.delete_contact import delete_contact
# from GHL.Contacts.get_all_contacts import get_all_contacts
# from GHL.Contacts.get_contact import get_contact
# from GHL.Contacts.update_contact import update_contact

# # Sub Account Functions
# from GHL.Sub_Accounts.create_sub_acc import create_sub_acc
# from GHL.Sub_Accounts.delete_sub_acc import delete_sub_acc
# from GHL.Sub_Accounts.get_sub_acc import get_sub_acc
# from GHL.Sub_Accounts.update_sub_acc import update_sub_acc

# # User Functions
# from GHL.Users.create_user import create_user
# from GHL.Users.delete_user import delete_user
# from GHL.Users.get_user_by_location_id import get_user_by_location_id
# from GHL.Users.get_user import get_user
# from GHL.Users.update_user import update_user

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)


# # Configuration
# OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
# SOLAR_API_KEY = os.getenv('SOLAR_API_KEY')
# PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')
# APIFY_API_KEY = os.getenv('APIFY_API_KEY')


# app = FastAPI()

# # Configure CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# def get_insights(address: str) -> Dict[str, Any]:
#     base_url = "https://api.realwave.com/googleSolar"
#     headers = {
#         "Authorization": f"Bearer {SOLAR_API_KEY}",
#         "Content-Type": "application/json",
#         "Accept": "application/json"
#     }
#     url = f"{base_url}/insights"
#     params = {
#             "address": address,
#             "mode": "full",
#             "demo": "true"
#     }
#     response = requests.post(url, headers=headers, params=params)
#     return response.json()

# def get_datalayers(address: str) -> Dict[str, Any]:
#     base_url = "https://api.realwave.com/googleSolar"
#     headers = {
#         "Authorization": f"Bearer {SOLAR_API_KEY}",
#         "Content-Type": "application/json",
#         "Accept": "application/json"
#     }
#     url = f"{base_url}/dataLayers"
#     params = {
#             "address": address,
#             "renderPanels": "true",
#             "fileFormat": "jpeg",
#             "demo": "true"
#     }
#     response = requests.post(url, headers=headers, params=params)
#     return response.json()

# def get_report(address: str) -> Dict[str, Any]:
#     base_url = "https://api.realwave.com/googleSolar"
#     headers = {
#         "Authorization": f"Bearer {SOLAR_API_KEY}",
#         "Content-Type": "application/json",
#         "Accept": "application/json"
#     }
#     url = f"{base_url}/report"
#     params = {
#             "address": address,
#             "organizationName": "Squidgy Solar",
#             "leadName": "Potential Client",
#             "demo": "true"
#     }
#     response = requests.post(url, headers=headers, params=params)
#     return response.json()


# # Initialize vector store at server start
# vector_store = None

# def initialize_vector_store():
#     """Initialize the vector store with templates from Excel file"""
#     global vector_store
#     try:
#         vector_store = VectorStore()
#         with open('conversation_templates.xlsx', 'rb') as f:
#             excel_content = f.read()
#         if not vector_store.load_excel_templates(excel_content):
#             raise Exception("Failed to load templates from Excel")
#     except Exception as e:
#         print(f"Error initializing vector store: {str(e)}")
#         # You might want to handle this error appropriately

# # Initialize the vector store when the module loads
# initialize_vector_store()

# # LLM Configuration
# llm_config = {
#     "model": "gpt-4o",
#     "api_key": OPENAI_API_KEY
# }

# # Role descriptions
# # Session or User ID Based change !!!!
# # TODO: UserID multiple session ID

# # Global variable to store message history
# message_history = {
#     "ProductManager": [],
#     "PreSalesConsultant": [],
#     "SocialMediaManager": [],
#     "LeadGenSpecialist": [],
#     "user_agent": []
# }

# def vector_setup_sys_mesage(role_descriptions, role):
#     """
#     Generate system message for an agent by combining role description and vector store templates
    
#     Args:
#         role_descriptions (dict): Dictionary containing base role descriptions
#         role (str): The role name of the agent
        
#     Returns:
#         str: Combined system message with role description and conversation templates
#     """
#     global vector_store
#     if vector_store is None:
#         return role_descriptions.get(role, f'You are a member of Squidgy\'s team working as {role}.')
        
#     templates = vector_store.get_all_templates_for_role(role)
    
#     message = f"{role_descriptions.get(role, f'You are a member of Squidgy\'s team working as {role}.')}\n\n"
#     message += "Use these conversation patterns:\n\n"
    
#     for template in templates:
#         if template["client_response"]:
#             message += f"When client says something like:\n'{template['client_response']}'\n"
#         if template["template"]:
#             message += f"Respond with something like:\n'{template['template']}'\n\n"
    
#     message += "\nAdapt these templates to the conversation while maintaining Squidgy's tone and style. Remove '*' from response"
#     return message

# def save_history(history):
#     global message_history
#     message_history = history
    
# def get_history():
#     global message_history
#     return message_history

# def analyze_with_perplexity(url: str) -> dict:
#     """
#     Analyze a website using Perplexity API direct call
#     """
#     headers = {
#         "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
#         "Content-Type": "application/json"
#     }

#     prompt = f"""
#     Please analyze the website {url} and provide a summary in exactly this format:
#     --- *Company name*: [Extract company name]
#     --- *Website*: {url}
#     --- *Description*: [2-3 sentence summary of what the company does]
#     --- *Tags*: [Main business categories, separated by periods]
#     --- *Takeaways*: [Key business value propositions]
#     --- *Niche*: [Specific market focus or specialty]
#     --- *Contact Information*: [Any available contact details]
#     """

#     try:
#         response = requests.post(
#             "https://api.perplexity.ai/chat/completions",
#             headers=headers,
#             json={
#                 "model": "sonar-reasoning-pro",
#                 "messages": [{"role": "user", "content": prompt}],
#                 "max_tokens": 1000
#             }
#         )
        
#         if response.status_code == 200:
#             analysis = response.json()["choices"][0]["message"]["content"]
#             return {"status": "success", "analysis": analysis}
#         else:
#             return {
#                 "status": "error", 
#                 "message": f"API request failed with status code: {response.status_code}"
#             }
            
#     except Exception as e:
#         return {"status": "error", "message": str(e)}

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

# class EnforcedFlowGroupChat(GroupChat):
#    def __init__(self, agents, messages, max_round=100):
#        super().__init__(agents, messages, max_round)
#        self.website_provided = False
#        self.presales_analyzed = False
       
#    def select_speaker(self, last_speaker, selector_prompt):
#        """Override the select_speaker method to enforce conversation flow"""
       
#        last_message = self.messages[-1]["content"].lower() if self.messages else ""
       
#        if len(self.messages) <= 1:
#            return next(agent for agent in self.agents if agent.name == "ProductManager")
       
#        if (not self.website_provided and 
#            ("http" in last_message or ".com" in last_message or ".org" in last_message)):
#            self.website_provided = True
#            return next(agent for agent in self.agents if agent.name == "PreSalesConsultant")
           
#        social_triggers = [
#            "facebook", "twitter", "linkedin", "social media", "instagram",
#            "posts", "content", "marketing", "followers", "engagement",
#            "social strategy", "social presence"
#        ]
#        if any(term in last_message for term in social_triggers):
#            return next(agent for agent in self.agents if agent.name == "SocialMediaManager")
         
#        lead_triggers = [
#            "appointment", "schedule", "demo", "contact", "email", "phone",
#            "meet", "booking", "calendar", "availability", "call",
#            "follow up", "consultation"
#        ]
#        if any(term in last_message for term in lead_triggers):
#            return next(agent for agent in self.agents if agent.name == "LeadGenSpecialist")
       
#        return next(agent for agent in self.agents if agent.name == "PreSalesConsultant")


# # Create Agents
# def create_agents():
#     # Create agents using vector_store for system messages
#     llm_config = {
#     "model": "gpt-4o",
#     "api_key": OPENAI_API_KEY
#     }

#     ProductManager = AssistantAgent(
#         name="ProductManager",
#         llm_config=llm_config,
#         system_message=vector_setup_sys_mesage(role_descriptions, "ProductManager"),
#         description="A product manager AI assistant capable of starting conversation and delegation to others",
#         human_input_mode="NEVER"
#     )

#     PreSalesConsultant = AssistantAgent(
#         name="PreSalesConsultant",
#         llm_config=llm_config,
#         system_message=vector_setup_sys_mesage(role_descriptions, "PreSalesConsultant"),
#         description="A pre-sales consultant AI assistant capable of understanding customer more ,handling sales, pricing, and technical analysis",
#         human_input_mode="NEVER"
#     )

#     #PreSalesConsultant.register_for_llm(name="scrape_page")(scrape_page)
#     PreSalesConsultant.register_for_llm(name="analyze_with_perplexity")(analyze_with_perplexity)
#     PreSalesConsultant.register_for_llm(name="get_insights")(get_insights)
#     PreSalesConsultant.register_for_llm(name="get_datalayers")(get_datalayers)
#     PreSalesConsultant.register_for_llm(name="get_report")(get_report)

#     # PreSalesConsultant.register_for_llm(
#     # name="analyze_with_perplexity", 
#     # description="Analyzes a website URL using Perplexity API and returns structured information about the company."
#     # )(analyze_with_perplexity)

#     # PreSalesConsultant.register_for_llm(
#     #     name="get_insights", 
#     #     description="Gets solar insights for a given address."
#     # )(get_insights)

#     # PreSalesConsultant.register_for_llm(
#     #     name="get_datalayers", 
#     #     description="Gets data layers for solar analysis at a given address."
#     # )(get_datalayers)

#     # PreSalesConsultant.register_for_llm(
#     #     name="get_report", 
#     #     description="Generates a solar report for a given address."
#     # )(get_report)

#     SocialMediaManager = AssistantAgent(
#         name="SocialMediaManager",
#         llm_config=llm_config,
#         system_message=vector_setup_sys_mesage(role_descriptions, "SocialMediaManager"),
#         description="A social media manager AI assistant handling digital presence and strategy",
#         human_input_mode="NEVER"
#     )

#     LeadGenSpecialist = AssistantAgent(
#         name="LeadGenSpecialist",
#         llm_config=llm_config,
#         system_message=vector_setup_sys_mesage(role_descriptions, "LeadGenSpecialist"),
#         description="A Lead generation specialist assistant capable of handling and managing follow-ups and setups",
#         human_input_mode="NEVER"
#     )

#     LeadGenSpecialist.register_for_llm(name="create_appointment")(create_appointment)
#     LeadGenSpecialist.register_for_llm(name="get_appointment")(get_appointment)
#     LeadGenSpecialist.register_for_llm(name="update_appointment")(update_appointment)
#     # Delete Appointment???

#     LeadGenSpecialist.register_for_llm(name="create_calendar")(create_calendar)
#     # LeadGenSpecialist.register_for_llm(name="delete_calendar")(delete_calendar)
#     LeadGenSpecialist.register_for_llm(name="get_all_calendars")(get_all_calendars)
#     LeadGenSpecialist.register_for_llm(name="get_calendar")(get_calendar)
#     LeadGenSpecialist.register_for_llm(name="update_calendar")(update_calendar)

#     LeadGenSpecialist.register_for_llm(name="create_contact")(create_contact)
#     # LeadGenSpecialist.register_for_llm(name="delete_contact")(delete_contact)
#     LeadGenSpecialist.register_for_llm(name="get_all_contacts")(get_all_contacts)
#     LeadGenSpecialist.register_for_llm(name="get_contact")(get_contact)
#     LeadGenSpecialist.register_for_llm(name="update_contact")(update_contact)

#     LeadGenSpecialist.register_for_llm(name="create_sub_acc")(create_sub_acc)
#     # LeadGenSpecialist.register_for_llm(name="delete_sub_acc")(delete_sub_acc)
#     LeadGenSpecialist.register_for_llm(name="get_sub_acc")(get_sub_acc)
#     LeadGenSpecialist.register_for_llm(name="update_sub_acc")(update_sub_acc)

#     LeadGenSpecialist.register_for_llm(name="create_user")(create_user)
#     # LeadGenSpecialist.register_for_llm(name="delete_user")(delete_user)
#     LeadGenSpecialist.register_for_llm(name="get_user_by_location_id")(get_user_by_location_id)
#     LeadGenSpecialist.register_for_llm(name="get_user")(get_user)
#     LeadGenSpecialist.register_for_llm(name="update_user")(update_user)

#     # LeadGenSpecialist.register_for_llm(
#     # name="create_appointment",
#     # description="Creates a new appointment in the system."
#     # )(create_appointment)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_appointment",
#     #     description="Retrieves appointment details by ID."
#     # )(get_appointment)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="update_appointment",
#     #     description="Updates an existing appointment."
#     # )(update_appointment)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="create_calendar",
#     #     description="Creates a new calendar."
#     # )(create_calendar)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_all_calendars",
#     #     description="Retrieves all calendars."
#     # )(get_all_calendars)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_calendar",
#     #     description="Retrieves a specific calendar by ID."
#     # )(get_calendar)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="update_calendar",
#     #     description="Updates an existing calendar."
#     # )(update_calendar)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="create_contact",
#     #     description="Creates a new contact in the system."
#     # )(create_contact)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_all_contacts",
#     #     description="Retrieves all contacts."
#     # )(get_all_contacts)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_contact",
#     #     description="Retrieves a specific contact by ID."
#     # )(get_contact)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="update_contact",
#     #     description="Updates an existing contact."
#     # )(update_contact)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="create_sub_acc",
#     #     description="Creates a new sub-account."
#     # )(create_sub_acc)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_sub_acc",
#     #     description="Retrieves a specific sub-account by ID."
#     # )(get_sub_acc)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="update_sub_acc",
#     #     description="Updates an existing sub-account."
#     # )(update_sub_acc)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="create_user",
#     #     description="Creates a new user in the system."
#     # )(create_user)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_user_by_location_id",
#     #     description="Retrieves a user by their location ID."
#     # )(get_user_by_location_id)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="get_user",
#     #     description="Retrieves a specific user by ID."
#     # )(get_user)

#     # LeadGenSpecialist.register_for_llm(
#     #     name="update_user",
#     #     description="Updates an existing user."
#     # )(update_user)

#     # Termination function for user agent
#     def should_terminate_user(message):
#         return "tool_calls" not in message and message["role"] != "tool"

#     # User Agent
#     user_agent = UserProxyAgent(
#         name="UserAgent",
#         llm_config=llm_config,
#         description="A human user capable of interacting with AI agents.",
#         code_execution_config=False,
#         human_input_mode="NEVER",
#         is_termination_msg=should_terminate_user
#     )

#     # user_agent.register_for_execution(
#     # name="analyze_with_perplexity",
#     # description="Analyzes a website URL using Perplexity API."
#     # )(analyze_with_perplexity)

#     # user_agent.register_for_execution(
#     #     name="get_insights",
#     #     description="Gets solar insights for a given address."
#     # )(get_insights)

#     # user_agent.register_for_execution(
#     #     name="get_datalayers",
#     #     description="Gets data layers for solar analysis at a given address."
#     # )(get_datalayers)

#     # user_agent.register_for_execution(
#     #     name="get_report",
#     #     description="Generates a solar report for a given address."
#     # )(get_report)

#     # user_agent.register_for_execution(
#     #     name="create_appointment",
#     #     description="Creates a new appointment in the system."
#     # )(create_appointment)

#     # user_agent.register_for_execution(
#     #     name="get_appointment",
#     #     description="Retrieves appointment details by ID."
#     # )(get_appointment)

#     # user_agent.register_for_execution(
#     #     name="update_appointment",
#     #     description="Updates an existing appointment."
#     # )(update_appointment)

#     # user_agent.register_for_execution(
#     #     name="create_calendar",
#     #     description="Creates a new calendar."
#     # )(create_calendar)

#     # user_agent.register_for_execution(
#     #     name="get_all_calendars",
#     #     description="Retrieves all calendars."
#     # )(get_all_calendars)

#     # user_agent.register_for_execution(
#     #     name="get_calendar",
#     #     description="Retrieves a specific calendar by ID."
#     # )(get_calendar)

#     # user_agent.register_for_execution(
#     #     name="update_calendar",
#     #     description="Updates an existing calendar."
#     # )(update_calendar)

#     # user_agent.register_for_execution(
#     #     name="create_contact",
#     #     description="Creates a new contact in the system."
#     # )(create_contact)

#     # user_agent.register_for_execution(
#     #     name="get_all_contacts",
#     #     description="Retrieves all contacts."
#     # )(get_all_contacts)

#     # user_agent.register_for_execution(
#     #     name="get_contact",
#     #     description="Retrieves a specific contact by ID."
#     # )(get_contact)

#     # user_agent.register_for_execution(
#     #     name="update_contact",
#     #     description="Updates an existing contact."
#     # )(update_contact)

#     # user_agent.register_for_execution(
#     #     name="create_sub_acc",
#     #     description="Creates a new sub-account."
#     # )(create_sub_acc)

#     # user_agent.register_for_execution(
#     #     name="get_sub_acc",
#     #     description="Retrieves a specific sub-account by ID."
#     # )(get_sub_acc)

#     # user_agent.register_for_execution(
#     #     name="update_sub_acc",
#     #     description="Updates an existing sub-account."
#     # )(update_sub_acc)

#     # user_agent.register_for_execution(
#     #     name="create_user",
#     #     description="Creates a new user in the system."
#     # )(create_user)

#     # user_agent.register_for_execution(
#     #     name="get_user_by_location_id",
#     #     description="Retrieves a user by their location ID."
#     # )(get_user_by_location_id)

#     # user_agent.register_for_execution(
#     #     name="get_user",
#     #     description="Retrieves a specific user by ID."
#     # )(get_user)

#     # user_agent.register_for_execution(
#     #     name="update_user",
#     #     description="Updates an existing user."
#     # )(update_user)
#     # user_agent.register_for_execution(name="scrape_page")(scrape_page)
#     user_agent.register_for_execution(name="analyze_with_perplexity")(analyze_with_perplexity)
#     user_agent.register_for_execution(name="get_insights")(get_insights)
#     user_agent.register_for_execution(name="get_datalayers")(get_datalayers)
#     user_agent.register_for_execution(name="get_report")(get_report)

#     user_agent.register_for_execution(name="create_appointment")(create_appointment)
#     user_agent.register_for_execution(name="get_appointment")(get_appointment)
#     user_agent.register_for_execution(name="update_appointment")(update_appointment)
#     # Delete Appointment???

#     user_agent.register_for_execution(name="create_calendar")(create_calendar)
#     # LeadGenSpecialist.register_for_llm(name="delete_calendar")(delete_calendar)
#     user_agent.register_for_execution(name="get_all_calendars")(get_all_calendars)
#     user_agent.register_for_execution(name="get_calendar")(get_calendar)
#     user_agent.register_for_execution(name="update_calendar")(update_calendar)

#     user_agent.register_for_execution(name="create_contact")(create_contact)
#     # LeadGenSpecialist.register_for_llm(name="delete_contact")(delete_contact)
#     user_agent.register_for_execution(name="get_all_contacts")(get_all_contacts)
#     user_agent.register_for_execution(name="get_contact")(get_contact)
#     user_agent.register_for_execution(name="update_contact")(update_contact)

#     user_agent.register_for_execution(name="create_sub_acc")(create_sub_acc)
#     # LeadGenSpecialist.register_for_llm(name="delete_sub_acc")(delete_sub_acc)
#     user_agent.register_for_execution(name="get_sub_acc")(get_sub_acc)
#     user_agent.register_for_execution(name="update_sub_acc")(update_sub_acc)

#     user_agent.register_for_execution(name="create_user")(create_user)
#     # LeadGenSpecialist.register_for_llm(name="delete_user")(delete_user)
#     user_agent.register_for_execution(name="get_user_by_location_id")(get_user_by_location_id)
#     user_agent.register_for_execution(name="get_user")(get_user)
#     # user_agent.register_for_execution(name="update_user")(update_user)

#     return ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent

# class ChatRequest(BaseModel):
#     user_id: str
#     user_input: str

# class ChatResponse(BaseModel):
#     agent: str

# @app.get("/")
# async def home():
#     return ChatResponse(agent='Welcome to Squidgy AI!')

# @app.post("/chat", response_model=ChatResponse)
# async def chat(request: ChatRequest):
#     user_id = request.user_id
#     user_input = request.user_input.strip()

#     if not user_input:
#         initial_greeting = """Hi! I'm Squidgy and I'm here to help you win back time and make more money. Think of me as like a consultant who can instantly build you a solution to a bunch of your problems
#         To get started, could you tell me your website?"""
#         return ChatResponse(agent=initial_greeting)

#     # message = request.json["message"]
    
#     # Create agents and group chat
#     ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist, user_agent = create_agents()
    
#     # group_chat = EnforcedFlowGroupChat(
#     #     agents=[user_agent, ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist],
#     #     messages=[{"role": "assistant", "content": "Hi! I'm Squidgy and I'm here to help you win back time and make more money."}],
#     #     max_round=120
#     # )

#     group_chat = GroupChat(
#         agents=[user_agent, ProductManager, PreSalesConsultant, SocialMediaManager, LeadGenSpecialist],
#         messages=[{"role": "assistant", "content": "Hi! I'm Squidgy and I'm here to help you win back time and make more money."}],
#         max_round=120,
#         # speaker_selection_method="round_robin"
#     )

#     group_manager = GroupChatManager(
#         groupchat=group_chat,
#         llm_config=llm_config,
#         human_input_mode="NEVER"
#     )

#     # Get and restore history
#     history = get_history()
#     ProductManager._oai_messages = {group_manager: history["ProductManager"]}
#     PreSalesConsultant._oai_messages = {group_manager: history["PreSalesConsultant"]}
#     SocialMediaManager._oai_messages = {group_manager: history["SocialMediaManager"]}
#     LeadGenSpecialist._oai_messages = {group_manager: history["LeadGenSpecialist"]}
#     user_agent._oai_messages = {group_manager: history["user_agent"]}
    
#     # Initiate chat
#     user_agent.initiate_chat(group_manager, message=user_input, clear_history=False)
    
#     # Save conversation history
#     save_history({
#         "ProductManager": ProductManager.chat_messages.get(group_manager),
#         "PreSalesConsultant": PreSalesConsultant.chat_messages.get(group_manager),
#         "SocialMediaManager": SocialMediaManager.chat_messages.get(group_manager),
#         "LeadGenSpecialist": LeadGenSpecialist.chat_messages.get(group_manager),
#         "user_agent": user_agent.chat_messages.get(group_manager)
#     })
    
#     return ChatResponse(agent=group_chat.messages[-1]['content'])

# # if __name__ == '__main__':
# #     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)