import pytest
import pandas as pd
import sys, os
import math 

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))  # Add root to path

from main import CheckModelPerformance  # Import your model's function

# Load the Excel file
import pandas as pd

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


# Test the model's response to each client's probable response
@pytest.mark.parametrize("Model_response, expected_input", load_conversation_templates("conversation_templates.xlsx"))
def test_model_responses(Model_response, expected_input):
    for i in range(len(Model_response)):
        if i==0:
            print("Model_response:",CheckModelPerformance('Hi'))
        else:
            print("Model_response:",CheckModelPerformance(expected_input[i-1]))
        print("Model_expected_response:",Model_response[i])
        if i==2: #limit the test
            break

Model_response, expected_input = load_conversation_templates("conversation_templates.xlsx")

for i in range(len(Model_response)):
    if i==0:
        print("Model_response:",CheckModelPerformance('Hi'))
    else:
        print("Model_response:",CheckModelPerformance(expected_input[i-1]))
    print("Model_expected_response:",Model_response[i])
    if i==2:
        break