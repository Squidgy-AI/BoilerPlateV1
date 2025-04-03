import os
import warnings
warnings.simplefilter(action='ignore', category=FutureWarning)
warnings.simplefilter("ignore", DeprecationWarning)
os.environ["PYTHONWARNINGS"]= "ignore::DeprecationWarning"

from flask import Flask, render_template, request, jsonify
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
import requests
from apify_client import ApifyClient
from vector_store import VectorStore 

# Configuration
import tomli

try:  
    with open("config.toml", "rb") as f:
        toml_dict = tomli.load(f)
    os.environ["OPENAI_API_KEY"] = toml_dict["tokens"]["OPENAI_API_KEY"]
    os.environ["APIFY_API_TOKEN"] = toml_dict["tokens"]["APIFY_API_KEY"]
except:
    pass

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') or "<<OpenAI Key>>"
WEATHER_API_KEY = os.getenv('WEATHER_API_KEY') or None

app = Flask(__name__)

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
def load_llm_config(test=False):
    """Load LLM configuration from environment variables or use default values"""
    # LLM Configuration
    if test:
        print("Loading test mode...")
        llm_config = {
            "model": "gpt-4o",
            "api_key": OPENAI_API_KEY,
            "temperature": 0.1  # Set temperature low for deterministic responses
        }
    else:
        llm_config = {
            "model": "gpt-4o",
            "api_key": OPENAI_API_KEY
        }
    return llm_config


# Role descriptions
role_descriptions = {
    "ProductManager": """You are Squidgy's Product Manager. Your role is to:
        1. Start with: 'Hi! I'm Squidgy and I'm here to help you win back time and make more money.'
        2. Ask for the website
        3. Delegate to Pre-Sales Consultant for initial analysis
        4. Coordinate the team throughout the conversation
        5. Ensure smooth handoffs between team members""",
    
    "PreSalesConsultant": """You are a friendly Pre-Sales Consultant named Alex.
        - Start by asking about the client's website and business
        - Ask follow-up questions about their specific needs
        - Offer to show demos when appropriate""",
    
    "BusinessManager": """You are a Business Manager named Michael who discusses pricing and marketing.
        Your role is to:
        1. Present clear pricing options for the Bot
        2. Suggest marketing strategies based on their business
        3. Discuss ROI and benefits
        4. Provide implementation timelines""",
    
    "DomainExpert": """You are a Domain Expert named Dr. Emily who specializes in solar solutions.
        Your role is to:
        1. Ask detailed questions about their business operations
        2. Explain technical benefits of SOL Bot
        3. Gather information needed for Solar API integration
        4. Provide technical specifications and requirements""",
    
    "LeadGenSpecialist": """You are a Lead Generation Specialist named James who handles follow-ups.
        Your role is to:
        1. Collect contact information naturally in conversation
        2. Discuss availability for demos/meetings
        3. Schedule follow-ups using calendar
        4. Ensure all contact details are gathered
        5. Make appointments if necessary"""
}

# Global variable to store message history
message_history = {
    "ProductManager": [],
    "PreSalesConsultant": [],
    "BusinessManager": [],
    "DomainExpert": [],
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
    
    temp= f'You are a member of Squidgy\'s team working as {role}.'
    message = f"{role_descriptions.get(role,temp )}\n\n"
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

def scrape_page(url: str) -> str:
    client = ApifyClient(token=os.getenv('APIFY_API_TOKEN'))

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

def CheckModelPerformance(message):
    # Create agents and group chat
    ProductManager, PreSalesConsultant, BusinessManager, DomainExpert, LeadGenSpecialist, user_agent = create_agents()
    
    group_chat = GroupChat(
        agents=[user_agent, ProductManager, PreSalesConsultant, BusinessManager, DomainExpert, LeadGenSpecialist],
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
    BusinessManager._oai_messages = {group_manager: history["BusinessManager"]}
    DomainExpert._oai_messages = {group_manager: history["DomainExpert"]}
    LeadGenSpecialist._oai_messages = {group_manager: history["LeadGenSpecialist"]}
    user_agent._oai_messages = {group_manager: history["user_agent"]}
    
    # Initiate chat
    user_agent.initiate_chat(group_manager, message=message, clear_history=False)
    
    # Save conversation history
    save_history({
        "ProductManager": ProductManager.chat_messages.get(group_manager),
        "PreSalesConsultant": PreSalesConsultant.chat_messages.get(group_manager),
        "BusinessManager": BusinessManager.chat_messages.get(group_manager),
        "DomainExpert": DomainExpert.chat_messages.get(group_manager),
        "LeadGenSpecialist": LeadGenSpecialist.chat_messages.get(group_manager),
        "user_agent": user_agent.chat_messages.get(group_manager)
    })

    return group_chat.messages[-1]["content"]

# Create Agents
def create_agents():
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
        description="A pre sales consultant AI assistant capable of understanding customer more",
        human_input_mode="NEVER"
    )
    PreSalesConsultant.register_for_llm(
        name="scrape_page",
        description="Scrapes information from the website."
    )(scrape_page)

    BusinessManager = AssistantAgent(
        name="BusinessManager",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "BusinessManager"),
        description="A Business Manager AI assistant capable of understanding pricing and marketing",
        human_input_mode="NEVER"
    )

    DomainExpert = AssistantAgent(
        name="DomainExpert",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "DomainExpert"),
        description="A Domain Expert AI assistant capable of understanding solar solutions",
        human_input_mode="NEVER"
    )

    LeadGenSpecialist = AssistantAgent(
        name="LeadGenSpecialist",
        llm_config=llm_config,
        system_message=vector_setup_sys_mesage(role_descriptions, "LeadGenSpecialist"),
        description="A Lead generation specialist assistant capable of handling follow-ups and setups",
        human_input_mode="NEVER"
    )

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
    user_agent.register_for_execution(name="scrape_page")(scrape_page)

    return ProductManager, PreSalesConsultant, BusinessManager, DomainExpert, LeadGenSpecialist, user_agent

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    message = request.json["message"]
    
    # Create agents and group chat
    ProductManager, PreSalesConsultant, BusinessManager, DomainExpert, LeadGenSpecialist, user_agent = create_agents()
    
    group_chat = GroupChat(
        agents=[user_agent, ProductManager, PreSalesConsultant, BusinessManager, DomainExpert, LeadGenSpecialist],
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
    BusinessManager._oai_messages = {group_manager: history["BusinessManager"]}
    DomainExpert._oai_messages = {group_manager: history["DomainExpert"]}
    LeadGenSpecialist._oai_messages = {group_manager: history["LeadGenSpecialist"]}
    user_agent._oai_messages = {group_manager: history["user_agent"]}
    
    # Initiate chat
    user_agent.initiate_chat(group_manager, message=message, clear_history=False)
    
    # Save conversation history
    save_history({
        "ProductManager": ProductManager.chat_messages.get(group_manager),
        "PreSalesConsultant": PreSalesConsultant.chat_messages.get(group_manager),
        "BusinessManager": BusinessManager.chat_messages.get(group_manager),
        "DomainExpert": DomainExpert.chat_messages.get(group_manager),
        "LeadGenSpecialist": LeadGenSpecialist.chat_messages.get(group_manager),
        "user_agent": user_agent.chat_messages.get(group_manager)
    })
    
    return jsonify(group_chat.messages[-1])

if __name__ == '__main__':
    llm_config=load_llm_config()
    app.run(debug=True)
else:
    llm_config=load_llm_config(True)