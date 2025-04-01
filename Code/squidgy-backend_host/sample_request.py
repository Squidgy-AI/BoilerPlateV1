import requests
import json

# # The URL of your FastAPI endpoint
# url = "http://localhost:80/chat"

# # The data to send in the request
# payload = {
#     "user_id": "test-user",
#     "user_input": "Hey I am Soma!"
# }

# # Set the headers to specify JSON content
# headers = {
#     "Content-Type": "application/json"
# }

# # Make the POST request
# response = requests.post(url, data=json.dumps(payload), headers=headers)

# # Print the status code and response content
# print(f"Status Code: {response.status_code}")
# print(f"Response: {response.json()}")

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
    
PERPLEXITY_API_KEY=""

print(analyze_with_perplexity("https://cfsolar.org/"))
