import pytest
import json
import sys, os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))  # Add root to path
from main import app  # Import the Flask app

@pytest.fixture
def client():
    """Fixture to create a test client for Flask."""
    app.config["TESTING"] = True  # Enable testing mode
    with app.test_client() as client:
        yield client

def test_home_page(client):
    """Test if the home page loads successfully."""
    response = client.get("/")
    assert response.status_code == 200  # Ensure the response is successful

def test_chat_endpoint(client):
    """Test if the chat endpoint works correctly."""
    response = client.post("/chat", 
                           data=json.dumps({"message": "Hello"}), 
                           content_type="application/json")
    
    assert response.status_code == 200  # API should return a success status
    json_data = response.get_json()
    
    assert "content" in json_data  # Ensure response contains AI-generated content
