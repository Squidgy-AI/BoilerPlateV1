import requests
import os
import json
from datetime import datetime
import sys

# Set your HeyGen API key here or via environment variable
# Squidgy YzQ0MWM0OWQzMzU5NDQ4NzlhN2MxZGUxZjc5ZDMxOWQtMTc0MzUyNTQwMQ==
# Farzin ZTUzNTAwZmMwYmZhNGRkZDlhYjE2OTZjMTFiODAwZjItMTc1MDE3ODM0Nw==
API_KEY = os.getenv("HEYGEN_API_KEY", "YzQ0MWM0OWQzMzU5NDQ4NzlhN2MxZGUxZjc5ZDMxOWQtMTc0MzUyNTQwMQ==")
BASE_URL = "https://api.heygen.com/v1"

# Headers for v1 API
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Headers for v2 API
headers_v2 = {
    "Accept": "application/json",
    "X-Api-Key": API_KEY
}

# Default timeout for API calls (seconds)
API_TIMEOUT = 5

def log_session_id(session_id):
    """Append the session_id and timestamp to heygen_sessions.log"""
    try:
        with open("heygen_sessions.log", "a") as f:
            timestamp = datetime.now().isoformat()
            f.write(f"{timestamp} | {session_id}\n")
        print(f"✅ Logged session ID to heygen_sessions.log: {session_id}")
    except Exception as e:
        print(f"❌ Error logging session ID: {e}")

def test_log_file(session_id="test-session-id"):
    """Test the log file creation by manually logging a session ID"""
    print(f"Testing log file creation with session ID: {session_id}")
    log_session_id(session_id)
    try:
        with open("heygen_sessions.log", "r") as f:
            print("Log file contents:")
            print(f.read())
    except FileNotFoundError:
        print("❌ Log file not found after logging attempt!")
        print(f"Current working directory: {os.getcwd()}")
        print("Files in directory:")
        print(os.listdir("."))
    return True

def test_new_session(avatar_name=None, voice_name="English US Female"):
    """Test creating a new streaming session with an avatar specified by name
    
    Args:
        avatar_name: Name of the avatar to use (e.g., "Olivia"). If None, uses a default ID.
        voice_name: Voice name to use (e.g., "English US Female") - this works better than voice_id
        
    Returns:
        Response from the API call
    """
    # Get avatar ID by name if provided
    if avatar_name:
        avatar_id = find_avatar_id_by_name(avatar_name)
        if not avatar_id:
            print(f"Could not find avatar with name: {avatar_name}. Using default.")
            avatar_id = "413a244b053949f39e8ab50099a895ea"  # Default fallback
    else:
        avatar_id = "413a244b053949f39e8ab50099a895ea"  # Default avatar ID
    
    print(f"Using voice name: {voice_name}")
    
    # Create the payload with voice_name instead of voice_id
    # This is confirmed to work with Heygen API
    payload = {
        "version": "v2",
        "voice": {"voice_name": voice_name}
    }
    
    # Add the correct ID field based on ID format
    if len(avatar_id) > 32 and "_" not in avatar_id:
        payload["avatar_id"] = avatar_id
    else:
        payload["talking_photo_id"] = avatar_id
    
    print(f"Creating session with avatar ID: {avatar_id}")
    print(f"Using voice name: {voice_name}")
    print(f"Payload: {payload}")
    
    # Make the API call with timeout
    try:
        resp = requests.post(f"{BASE_URL}/streaming.new", json=payload, headers=headers, timeout=10)
        print("New session status:", resp.status_code)
        
        # Process the response
        try:
            data = resp.json()
            print(data)
            
            # Log session ID if present
            if resp.ok and "data" in data and "session_id" in data["data"]:
                session_id = data["data"]["session_id"]
                log_session_id(session_id)
        except Exception as e:
            print(f"Error processing response: {e}")
            print(resp.text)
        
        return resp
    except requests.exceptions.Timeout:
        print("Session creation request timed out after 10 seconds")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 408
                self.text = "Request timed out"
                self.ok = False
            def json(self):
                return {"error": "timeout"}
        return MockResponse()
    except Exception as e:
        print(f"Error creating session: {e}")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 500
                self.text = f"Error: {str(e)}"
                self.ok = False
            def json(self):
                return {"error": str(e)}
        return MockResponse()

def test_stop_session(session_id):
    """Test stopping a session by session_id"""
    if not session_id:
        print("No session ID provided, cannot stop session")
        return None
        
    print(f"Stopping session {session_id}")
    payload = {"session_id": session_id}
    
    try:
        resp = requests.post(f"{BASE_URL}/streaming.stop", json=payload, headers=headers, timeout=API_TIMEOUT)
        print("Stop session status:", resp.status_code)
        
        try:
            data = resp.json()
            print(json.dumps(data, indent=2))
            return resp
        except Exception as e:
            print(f"Error parsing response: {e}")
            print(resp.text)
            return resp
    except requests.exceptions.Timeout:
        print(f"Request timed out after {API_TIMEOUT} seconds")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 408
                self.text = "Request timed out"
                self.ok = False
            def json(self):
                return {"error": "timeout"}
        return MockResponse()
    except Exception as e:
        print(f"Error stopping session: {e}")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 500
                self.text = f"Error: {str(e)}"
                self.ok = False
            def json(self):
                return {"error": str(e)}
        return MockResponse()

def get_avatars():
    """Get all avatars from the API"""
    print("--- Testing get_avatars() ---")
    url = "https://api.heygen.com/v2/avatars"
    headers = {
        "Accept": "application/json",
        "X-Api-Key": API_KEY
    }
    try:
        # Add a 10-second timeout to prevent long waits
        resp = requests.get(url, headers=headers, timeout=10)
        return resp
    except requests.exceptions.Timeout:
        print("Avatar API request timed out after 10 seconds")
        # Return a mock response object with status_code attribute
        class MockResponse:
            def __init__(self):
                self.status_code = 408
                self.text = "Request timed out"
            def json(self):
                return {"error": "timeout"}
        return MockResponse()

def get_voices():
    """Fetch the list of voices using Heygen v2 API."""
    print("--- Testing get_voices() ---")
    url = "https://api.heygen.com/v2/voices"
    headers_v2 = {
        "Accept": "application/json",
        "X-Api-Key": API_KEY
    }
    try:
        # Add a 10-second timeout to prevent long waits
        resp = requests.get(url, headers=headers_v2, timeout=10)
        print("Get voices status:", resp.status_code)
        
        try:
            data = resp.json()
            print("Raw response structure:")
            print(f"Keys in response: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            
            # Print available voice IDs in a more readable format
            if "data" in data and isinstance(data["data"], list):
                voices = data["data"]
                print(f"\nFound {len(voices)} voices:")
                for i, voice in enumerate(voices[:10]):  # Show first 10 voices
                    name = voice.get("name", "Unknown")
                    voice_id = voice.get("voice_id", "Unknown")
                    print(f"  {i+1}. {name}: {voice_id}")
            else:
                print("No voices found in data")
        except Exception as e:
            print(f"Error parsing voices response: {e}")
            print(resp.text[:200])  # Print first 200 chars of response
        return resp
    except requests.exceptions.Timeout:
        print("Voice API request timed out after 10 seconds")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 408
                self.text = "Request timed out"
            def json(self):
                return {"error": "timeout"}
        return MockResponse()
    except Exception as e:
        print(f"Error fetching voices: {e}")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 500
                self.text = f"Error: {str(e)}"
            def json(self):
                return {"error": str(e)}
        return MockResponse()
    return resp

def find_voice_id_by_name(name):
    """Find a voice ID by name"""
    resp = get_voices()
    data = resp.json()
    if "data" in data and isinstance(data["data"], list):
        voices = data["data"]
        for voice in voices:
            voice_name = voice.get("name", "")
            if name.lower() in voice_name.lower():
                voice_id = voice.get("voice_id")
                print(f"Found voice: {voice_name} (ID: {voice_id})")
                return voice_id
    print(f"Could not find voice with name: {name}")
    return None

def find_avatar_id_by_name(name):
    """Find and print the avatar_id for a given avatar name or talking_photo_name. Only prints the first match, with preview image if available."""
    resp = get_avatars()
    try:
        print(f"Avatar search response status: {resp.status_code}")
        data = resp.json()
        
        # Print the structure of the response
        print("Response structure:")
        if isinstance(data, dict):
            print(f"Top-level keys: {list(data.keys())}")
            if "data" in data:
                if isinstance(data["data"], dict):
                    print(f"Data keys: {list(data['data'].keys())}")
                elif isinstance(data["data"], list):
                    print(f"Data is a list with {len(data['data'])} items")
        
        avatars = []
        
        # Handle different response structures
        if "data" in data and isinstance(data["data"], list):
            print("Found avatars in data list format")
            avatars = data["data"]
        elif "data" in data and isinstance(data["data"], dict):
            if "talking_photos" in data["data"]:
                print("Found avatars in talking_photos format")
                avatars = data["data"]["talking_photos"]
            elif "avatars" in data["data"]:
                print("Found avatars in avatars format")
                avatars = data["data"]["avatars"]
        
        print(f"Searching for avatar with name: {name} in {len(avatars)} avatars")
        
        # Print the first few avatars to see their structure
        if avatars:
            print("First avatar structure:")
            first_avatar = avatars[0]
            print(f"Keys: {list(first_avatar.keys())}")
            print(f"Name: {first_avatar.get('name') or first_avatar.get('avatar_name') or first_avatar.get('talking_photo_name')}")
        
        for avatar in avatars:
            avatar_name = avatar.get("name") or avatar.get("avatar_name")
            talking_photo_name = avatar.get("talking_photo_name")
            avatar_id = avatar.get("avatar_id") or avatar.get("talking_photo_id")
            
            # Print each avatar we're checking
            print(f"Checking avatar: {avatar_name or talking_photo_name or 'Unnamed'} (ID: {avatar_id})")
            
            # Check if this avatar matches the search name
            if ((avatar_name and name.lower() in avatar_name.lower()) or 
                (talking_photo_name and name.lower() in talking_photo_name.lower())):
                
                # Get preview image if available
                preview = avatar.get("preview_url") or avatar.get("preview_image_url") or "No preview available"
                
                print(f"✅ Found matching avatar: {avatar_name or talking_photo_name}")
                print(f"Avatar ID: {avatar_id}")
                print(f"Preview: {preview}")
                return avatar_id
        
        print(f"❌ No avatar found with name: {name}")
        return None
    except Exception as e:
        print(f"Error in find_avatar_id_by_name: {e}")
        print(getattr(e, 'response', None))
        return None

def test_send_task(session_id, text="Hello from test!"):
    """Send a task to an active session."""
    if not session_id:
        print("No session ID provided, cannot send task")
        return None
        
    print(f"Sending task to session {session_id}")
    url = f"{BASE_URL}/streaming.task"
    payload = {
        "session_id": session_id,
        "task_type": "talk",
        "text": text
    }
    
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=API_TIMEOUT)
        print("Send task status:", resp.status_code)
        
        try:
            data = resp.json()
            print(json.dumps(data, indent=2))
            return resp
        except Exception as e:
            print(f"Error parsing response: {e}")
            print(resp.text)
            return resp
    except requests.exceptions.Timeout:
        print(f"Request timed out after {API_TIMEOUT} seconds")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 408
                self.text = "Request timed out"
                self.ok = False
            def json(self):
                return {"error": "timeout"}
        return MockResponse()
    except Exception as e:
        print(f"Error sending task: {e}")
        # Return a mock response object
        class MockResponse:
            def __init__(self):
                self.status_code = 500
                self.text = f"Error: {str(e)}"
                self.ok = False
            def json(self):
                return {"error": str(e)}
        return MockResponse()

def run_all_tests(avatar_name="Olivia", voice_name="English US Female"):
    """Run all tests in sequence"""
    print(f"====== Heygen API Test Suite with avatar: {avatar_name},\n voice: {voice_name} ======")
    print("--- Testing session creation and stop ---")
    
    # Test creating a new session
    resp = test_new_session(avatar_name, voice_name)
    if resp and resp.status_code == 200:
        data = resp.json()
        if "data" in data and "session_id" in data["data"]:
            session_id = data["data"]["session_id"]
            print(f"Session created with ID: {session_id}")
            
            # Test sending a task to the session
            print("\n--- Testing sending a task ---")
            test_send_task(session_id, "Hello! This is a test message from the Python script.")
            
            # Test stopping the session
            print("\n--- Testing stopping the session ---")
            test_stop_session(session_id)
        else:
            print("Could not get session_id from response")
    else:
        print("Could not create a session, skipping stop test.")
    
    print("====== End of Test Suite ======")

def read_session_ids_from_log(log_file="heygen_sessions.log"):
    """Read all session IDs from the log file"""
    session_ids = []
    try:
        with open(log_file, "r") as f:
            for line in f:
                parts = line.strip().split(" | ")
                if len(parts) >= 2:
                    session_ids.append(parts[1])
        print(f"Found {len(session_ids)} session IDs in log file")
    except FileNotFoundError:
        print(f"Log file {log_file} not found")
    return session_ids

def clear_session_log():
    """Clear the session log file"""
    try:
        with open("heygen_sessions.log", "w") as f:
            f.write("# Heygen sessions log - cleared at " + datetime.now().isoformat() + "\n")
        print("✅ Session log file cleared")
        return True
    except Exception as e:
        print(f"❌ Error clearing session log: {e}")
        return False

def close_all_sessions():
    """Close all sessions found in the log file"""
    try:
        with open("heygen_sessions.log", "r") as f:
            lines = f.readlines()
        
        session_ids = [line.strip().split(" | ")[1] for line in lines if " | " in line]
        print(f"Found {len(session_ids)} session IDs in log file")
        
        if not session_ids:
            print("No sessions to close")
            return
        
        print(f"Attempting to close {len(session_ids)} sessions...")
        for session_id in session_ids:
            print(f"Closing session: {session_id}")
            stop_session(session_id)
            
        # Ask if user wants to clear the log file
        print("\nAll sessions processed. Would you like to clear the log file? (y/n)")
        response = input().lower()
        if response == 'y' or response == 'yes':
            clear_session_log()
    except FileNotFoundError:
        print("Log file not found")
    except Exception as e:
        print(f"Error closing sessions: {e}")

def quick_test(voice_name="English US Female"):
    """Run a quick test with hardcoded avatar ID and specified voice name"""
    print(f"====== Quick Heygen API Test with voice: {voice_name} ======")
    
    # Use hardcoded avatar ID that is known to work
    avatar_id = "4743944d7cbf40d0b6e5c3baf935ceff"
    
    # Create the payload with voice_name
    payload = {
        "version": "v2",
        "talking_photo_id": avatar_id,
        "voice": {"voice_name": voice_name}
    }
    
    print(f"Creating session with hardcoded avatar ID: {avatar_id}")
    print(f"Using voice name: {voice_name}")
    
    # Make the API call with timeout
    try:
        resp = requests.post(f"{BASE_URL}/streaming.new", json=payload, headers=headers, timeout=API_TIMEOUT)
        print("New session status:", resp.status_code)
        
        # Process the response
        try:
            data = resp.json()
            print(json.dumps(data, indent=2))
            
            # Log session ID if present
            if resp.ok and "data" in data and "session_id" in data["data"]:
                session_id = data["data"]["session_id"]
                log_session_id(session_id)
                
                # Test sending a task to the session
                print("\n--- Testing sending a task ---")
                test_send_task(session_id, "Hello! This is a quick test message.")
                
                # Test stopping the session
                print("\n--- Testing stopping the session ---")
                test_stop_session(session_id)
            else:
                print("Could not get session_id from response")
        except Exception as e:
            print(f"Error processing response: {e}")
            print(resp.text)
    except Exception as e:
        print(f"Error in API call: {e}")
    
    print("====== End of Quick Test ======")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Check for command line arguments
        if sys.argv[1] == "--close-sessions":
            close_all_sessions()
        elif sys.argv[1] == "--clear-log":
            clear_session_log()
        elif sys.argv[1] == "--test-log":
            test_log_file()
        elif sys.argv[1] == "--manual-log" and len(sys.argv) > 2:
            log_session_id(sys.argv[2])
        elif sys.argv[1] == "--test-voices":
            get_voices()
        elif sys.argv[1] == "--test-avatars":
            if len(sys.argv) > 2:
                find_avatar_id_by_name(sys.argv[2])
            else:
                get_avatars()
        elif sys.argv[1] == "--quick":
            # Run quick test with hardcoded values
            if len(sys.argv) > 2:
                quick_test(sys.argv[2])
            else:
                quick_test()
        else:
            print(f"Unknown command: {sys.argv[1]}")
            print("Available commands:")
            print("  --close-sessions: Close all sessions in the log file")
            print("  --clear-log: Clear the session log file")
            print("  --test-log: Test log file creation")
            print("  --manual-log <session_id>: Manually log a session ID")
            print("  --test-voices: Test fetching voices")
            print("  --test-avatars [avatar_name]: Test fetching avatars or find by name")
            print("  --quick [voice_name]: Run quick test with hardcoded avatar ID")
    else:
        run_all_tests()

