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


def test_chat_ghl_get_appointment_endpoint(client):
    """Test if the chat endpoint correctly handles appointment retrieval."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_appointment",
        "user_input": (
            "Can you check the details of my appointment with event ID appt_7890xyz?"
        )
    }

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

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")
    
    assert "agent" in json_data
    assert "session_id" in json_data



def test_chat_ghl_appointment_update_endpoint(client):
    """Test if the chat endpoint handles appointment update correctly."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_appointment_update",
        "user_input": "Can you update the appointment with event ID test_event_12345 on 15th April 2025 from 11AM PST to 1PM PST?"
    }
    
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
        logger.info(f"Found 'agent' in response: {json_data['agent'][:100]}...")
    else:
        logger.warning("'agent' key missing from response")
        
    if "session_id" in json_data:
        logger.info(f"Found 'session_id' in response: {json_data['session_id']}")
    else:
        logger.warning("'session_id' key missing from response")
    
    # Check for appropriate keys in the response based on your ChatResponse model
    assert "agent" in json_data
    assert "session_id" in json_data



def test_chat_ghl_calendar_create_endpoint(client):
    """Test if the chat endpoint handles calendar creation correctly."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_calendar_create",
        "user_input": (
            "I want to create a new calendar for my location ID loc_12345 with team members Alice and Bob. "
            "Make it a round robin type with 30-minute slots, available Monday to Friday from 9am to 5pm."
        )
    }

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
    
    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")
    
    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")
    
    assert "agent" in json_data
    assert "session_id" in json_data



def test_chat_ghl_get_all_calendars_endpoint(client):
    """Test if the chat endpoint can retrieve all calendar configurations."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_all_calendars",
        "user_input": (
            "Can you show me all the calendars that have been configured?"
        )
    }

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

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")
    
    assert "agent" in json_data
    assert "session_id" in json_data



def test_chat_ghl_get_calendar_endpoint(client):
    """Test if the chat endpoint can retrieve a specific calendar configuration."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_calendar",
        "user_input": (
            "Can you fetch the details of the calendar with ID cal_123456789?"
        )
    }

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

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")
    
    assert "agent" in json_data
    assert "session_id" in json_data



def test_chat_ghl_update_calendar_endpoint(client):
    """Test the chat endpoint to update a calendar configuration."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_update_calendar",
        "user_input": (
            "Update the calendar with ID cal_123456789 using team members team_001 and team_002 for location loc_abc123. "
            "Set it as a round-robin availability with a 30-minute slot duration and full week availability."
        )
    }

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

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")

    assert "agent" in json_data
    assert "session_id" in json_data


def test_chat_ghl_create_contact_endpoint(client):
    """Test the chat endpoint to create a contact via conversational input."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_create_contact",
        "user_input": (
            "Please add a new contact named Mohnish Kumar with the email mohnish.kumar@email.com and phone number +15551234567. "
            "He is based in Chicago, United States, works at MK Industries, and his website is www.mk.com. Assign him to my team."
        )
    }

    logger.info(f"Sending request to chat endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"Response status code: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")

    assert "agent" in json_data
    assert "session_id" in json_data


def test_chat_ghl_get_all_contacts_endpoint(client):
    """Test the chat endpoint for retrieving all contacts for a location."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_contacts",
        "user_input": "Can you show me all the contacts in our CRM?"
    }

    logger.info(f"Sending request to chat endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"Response status code: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")

    assert "agent" in json_data
    assert "session_id" in json_data


def test_chat_ghl_get_contact_endpoint(client):
    """Test the chat endpoint for retrieving a specific contact by ID."""
    contact_id = "kpYoxc5GbJSAYVRrzRra"
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_contact",
        "user_input": f"Can you show me details for contact {contact_id}?"
    }

    logger.info(f"Sending request to chat endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"Response status code: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")

    assert "agent" in json_data
    assert "session_id" in json_data



def test_chat_ghl_update_contact_endpoint(client):
    """Test the chat endpoint to create a contact via conversational input."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_create_contact",
        "user_input": (
            "Please can you update a existing contact named Mohnish Kumar with the email mohnish.kumar123@email.com and phone number +15551232267. "
        )
    }

    logger.info(f"Sending request to chat endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"Response status code: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    if "agent" in json_data:
        logger.info(f"'agent' response: {json_data['agent'][:100]}...")
    else:
        logger.warning("Missing 'agent' key in response")

    if "session_id" in json_data:
        logger.info(f"Session ID: {json_data['session_id']}")
    else:
        logger.warning("Missing 'session_id' key in response")

    assert "agent" in json_data
    assert "session_id" in json_data


def test_create_sub_acc_endpoint(client):
    """Test if the create_sub_acc endpoint works correctly."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_create_sub_account",
        "user_input": "Can you create a sub account for Nestle LLC - MKR TEST with phone +1234567, located at 4th fleet street, New York, Illinois, 567654, US? The website is https://yourwebsite.com, timezone is US/Central. Prospect is John Doe, email john.doe@mail.com."
    }

    logger.info(f"Sending request to create_sub_acc endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"create_sub_acc endpoint response status: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    # Log before assertions to help with debugging
    if "agent" in json_data:
        logger.info(f"Found 'agent' in response: {json_data['agent'][:100]}...")
    else:
        logger.warning("'agent' key missing from response")

    if "session_id" in json_data:
        logger.info(f"Found 'session_id' in response: {json_data['session_id']}")
    else:
        logger.warning("'session_id' key missing from response")

    # Assertions based on expected response structure
    assert "agent" in json_data
    assert "session_id" in json_data


def test_get_sub_acc_endpoint(client):
    """Test if the get_sub_acc endpoint works correctly via natural language input."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_sub_acc",
        "user_input": "Can you fetch the sub-account details for the location ID abc123?"
    }

    logger.info(f"Sending request to get_sub_acc via chat endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"get_sub_acc endpoint response status: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    if "agent" in json_data:
        logger.info(f"Found 'agent' in response: {json_data['agent'][:100]}...")
    else:
        logger.warning("'agent' key missing from response")

    if "session_id" in json_data:
        logger.info(f"Found 'session_id' in response: {json_data['session_id']}")
    else:
        logger.warning("'session_id' key missing from response")

    assert "agent" in json_data
    assert "session_id" in json_data


def test_update_sub_acc_endpoint(client):
    """Test if the update_sub_acc endpoint works correctly via natural language input."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_update_sub_acc",
        "user_input": "Update the sub-account with location ID abc123. Change the company name to Nestle Updated LLC, phone number to +1234567890, and address to 123 New Street, Chicago, Illinois, 60601, US. Prospect is Jane Doe, email jane.doe@mail.com. Timezone is US/Central and website is https://updatedsite.com."
    }

    logger.info(f"Sending request to update_sub_acc via chat endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"update_sub_acc endpoint response status: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    if "agent" in json_data:
        logger.info(f"Found 'agent' in response: {json_data['agent'][:100]}...")
    else:
        logger.warning("'agent' key missing from response")

    if "session_id" in json_data:
        logger.info(f"Found 'session_id' in response: {json_data['session_id']}")
    else:
        logger.warning("'session_id' key missing from response")

    assert "agent" in json_data
    assert "session_id" in json_data


def test_create_user_endpoint(client):
    """Test if the create_user endpoint works correctly via natural language input."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_create_user",
        "user_input": "Please create a user with name Mohnishkumar Rajkumar, email mkr@gmail.com, password Mohnishkumar$123, and phone number +44123456789."
    }

    logger.info(f"Sending request to create_user via chat endpoint: {request_payload}")

    response = client.post(
        "/chat",
        json=request_payload
    )

    logger.info(f"create_user endpoint response status: {response.status_code}")

    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200

    if "agent" in json_data:
        logger.info(f"Found 'agent' in response: {json_data['agent'][:100]}...")
    else:
        logger.warning("'agent' key missing from response")

    if "session_id" in json_data:
        logger.info(f"Found 'session_id' in response: {json_data['session_id']}")
    else:
        logger.warning("'session_id' key missing from response")

    assert "agent" in json_data
    assert "session_id" in json_data


def test_get_users_by_location_id(client):
    """Test retrieving users by location ID using a natural language request."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_users_by_location",
        "user_input": "Please get me all users for the location ID abc123."
    }

    logger.info(f"Sending request to get_user_by_location_id via chat endpoint: {request_payload}")

    response = client.post("/chat", json=request_payload)

    logger.info(f"get_user_by_location_id response status: {response.status_code}")
    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200
    assert "agent" in json_data
    assert "session_id" in json_data


def test_get_user_by_id(client):
    """Test retrieving a user by user ID using a natural language request."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_get_user_by_id",
        "user_input": "Can you fetch the user details for user ID usr_456xyz?"
    }

    logger.info(f"Sending request to get_user via chat endpoint: {request_payload}")

    response = client.post("/chat", json=request_payload)

    logger.info(f"get_user response status: {response.status_code}")
    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200
    assert "agent" in json_data
    assert "session_id" in json_data


def test_update_user(client):
    """Test updating a user's details via natural language input."""
    request_payload = {
        "user_id": "test_user",
        "session_id": "test_session_update_user",
        "user_input": "Update the user with ID usr_456xyz. Change the name to Mohnishkumar Rajkumar, email to mkr@gmail.com, password to Mohnishkumar$123, and phone number to +44823456789."
    }

    logger.info(f"Sending request to update_user via chat endpoint: {request_payload}")

    response = client.post("/chat", json=request_payload)

    logger.info(f"update_user response status: {response.status_code}")
    try:
        json_data = response.json()
        logger.info(f"Response JSON: {json.dumps(json_data, indent=2)}")
    except Exception as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response content: {response.content}")

    assert response.status_code == 200
    assert "agent" in json_data
    assert "session_id" in json_data
