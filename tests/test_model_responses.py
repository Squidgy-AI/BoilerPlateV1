import pytest
import pandas as pd
import sys, os
import math 
from autogen import AssistantAgent

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))  # Add root to path

from main import CheckModelPerformance  # Import your model's function

# Load the Excel file
import pandas as pd

# Configuration
import tomli

threshold=75  #similarity must be above this value to pass the test

try:  
    with open("../config.toml", "rb") as f:
        toml_dict = tomli.load(f)
    os.environ["OPENAI_API_KEY"] = toml_dict["tokens"]["OPENAI_API_KEY"]
except:
    pass

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') or "<<OpenAI Key>>"


llm_config = {
    "model": "gpt-4o",
    "api_key": OPENAI_API_KEY,
    "temperature": 0.1  # Set temperature low for deterministic responses
}


agent = AssistantAgent(
    name="Judge",
    llm_config=llm_config,
    system_message="Assess the similarity rate of two text and provide percentages of similarity don't provide any explanation and use this template: similarity:%percent return %0 if there no similarity",
    description="Judge the similarity of two text",
    max_consecutive_auto_reply=200
)

def load_conversation_templates(file_path):
    # Load the Excel file with all columns as strings
    df = pd.read_excel(file_path, dtype=str)

    # Fill NaN values with empty strings to prevent errors
    df.fillna('', inplace=True)

    merged_data = []
    current_response = []

    for _, row in df.iterrows():
        squidgy_text = row['As Squidgy'].strip()
        client_text = row['Clients probable response'].strip()

        if squidgy_text:  # If there's a response from Squidgy
            current_response.append(squidgy_text)

        if client_text:  # If the client provides a response, save the previous conversation block
            if current_response:
                merged_data.append((' '.join(current_response).strip(), client_text))
            current_response = []  # Reset Squidgy's response for the next interaction

    # Convert to separate lists
    Model_response, expected_input = zip(*merged_data) if merged_data else ([], [])

    return list(Model_response), list(expected_input)

# Fixture to load conversation templates
@pytest.fixture
def conversation_data():
    return load_conversation_templates("conversation_templates.xlsx")

# Test the model's response to each client's probable response
def test_model_responses(conversation_data):
    Model_response, expected_input = conversation_data
    # Model_response, expected_input = load_conversation_templates("conversation_templates.xlsx")
    assert len(Model_response) == len(expected_input)
    for i in range(len(Model_response)):
        if i==0:
            reponse=CheckModelPerformance('Hi')
        else:
            reponse=CheckModelPerformance(expected_input[i-1])
        print("Model_response:",reponse)
        print("Model_expected_response:",Model_response[i])
        request = {
                "content": "Compare: "+Model_response[i]+" with: "+reponse,
                "role": "user"
            }
        text = agent.generate_reply([request])
        number = int(text.split(':')[1].split('%')[0])
        print("Similarity:",number,"Valid:",number>threshold)
        try:
            assert number >= threshold, f"Value {number} is below the threshold of {threshold}"
        except ValueError:
            pytest.fail(f"Model response {i} is not a as expected with similarity %{number}")

Model_response, expected_input = load_conversation_templates("conversation_templates.xlsx")

for i in range(len(Model_response)):
    if i==0:
        reponse=CheckModelPerformance('Hi')
    else:
        reponse=CheckModelPerformance(expected_input[i-1])
    print("Model_response:",reponse)
    print("Model_expected_response:",Model_response[i])

    request = {
            "content": "Compare: "+Model_response[i]+" with: "+reponse,
            "role": "user"
        }
    
    text = agent.generate_reply([request])
    number = int(text.split(':')[1].split('%')[0])
    print("Similarity:",number,"Valid:",number>threshold)

