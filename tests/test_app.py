import pytest
from fastapi.testclient import TestClient
import sys, os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main_new import app  # Import the FastAPI app

@pytest.fixture
def client():
    """Fixture to create a test client for FastAPI."""
    return TestClient(app)  # Use FastAPI's TestClient instead of Flask's test_client

def test_home_page(client):
    """Test if the home page loads successfully."""
    response = client.get("/")
    logger.info(f"Home page response status: {response.status_code}")
    logger.debug(f"Home page response content: {response.content}")
    assert response.status_code == 200

def test_chat_endpoint(client):
    """Test if the chat endpoint works correctly."""
    request_payload = {"user_id": "test_user", "session_id": "test_session", "user_input": "What percentage of Share do you take?"}
    logger.info(f"Sending request to chat endpoint: {request_payload}")
    
    response = client.post(
        "/chat",
        json=request_payload
    )
    
    logger.info(f"Chat endpoint response status: {response.status_code}")
    
    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")
    
    assert response.status_code == 200
    
    # Log before assertions to help with debugging
    if "agent" in json_data:
        logger.info(f"Found 'agent' in response: {json_data['agent'][:100]}...")  # Log first 100 chars
    else:
        logger.warning("'agent' key missing from response")
        
    if "session_id" in json_data:
        logger.info(f"Found 'session_id' in response: {json_data['session_id']}")
    else:
        logger.warning("'session_id' key missing from response")
    
    # Check for appropriate keys in the response based on your ChatResponse model
    assert "agent" in json_data
    assert "session_id" in json_data

def test_chat_ghl_appointment_create_endpoint(client):
    """Test if the chat endpoint works correctly."""
    request_payload = {"user_id": "test_user", "session_id": "test_session_appointment_create", "user_input": "Can you create an appointment on 15th April 2025 11AM PST to 1PM PST?"}
    logger.info(f"Sending request to chat endpoint: {request_payload}")
    
    response = client.post(
        "/chat",
        json=request_payload
    )
    
    logger.info(f"Chat endpoint response status: {response.status_code}")
    
    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")
    
    assert response.status_code == 200
    
    # Log before assertions to help with debugging
    if "agent" in json_data:
        logger.info(f"Found 'agent' in response: {json_data['agent'][:100]}...")  # Log first 100 chars
    else:
        logger.warning("'agent' key missing from response")
        
    if "session_id" in json_data:
        logger.info(f"Found 'session_id' in response: {json_data['session_id']}")
    else:
        logger.warning("'session_id' key missing from response")
    
    # Check for appropriate keys in the response based on your ChatResponse model
    assert "agent" in json_data
    assert "session_id" in json_data