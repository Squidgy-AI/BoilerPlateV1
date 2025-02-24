from langchain.tools import Tool, DuckDuckGoSearchRun
from langchain.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.docstore.document import Document
import pandas as pd
import pickle
import uuid  # To generate unique IDs
import os


from langchain.tools.base import BaseTool
from langchain.agents import initialize_agent, AgentType 
from datetime import datetime
import warnings


from langchain_apify import ApifyWrapper
from langchain_core.documents import Document as DOC


from langchain.llms import HuggingFaceEndpoint


import tomli

with open("config.toml", "rb") as f:
    toml_dict = tomli.load(f)
    

warnings.simplefilter(action='ignore', category=FutureWarning)
warnings.simplefilter("ignore", DeprecationWarning)


# loading tokens
os.environ["OPENAI_API_KEY"] = toml_dict["tokens"]["OPENAI_API_KEY"]
os.environ["APIFY_API_TOKEN"] = toml_dict["tokens"]["APIFY_API_KEY"]
Hugging_Face_token = toml_dict["tokens"]["HUGGING_FACE_TOKEN"]

# Initialize embeddings model
embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")

# Start with an empty FAISS index
vector_store = None
FAISS_PATH = "faiss_index"
EXCEL_FILE = "knowledge_base.xlsx"



class Calculator(BaseTool):
    name: str = "calculator"
    description: str = "Use this tool to calculate mathematical expressions."

    def _run(self, query: str):
        try:
            return eval(query)
        except Exception as e:
            return f"Error in calculation: {str(e)}"


class GetCurrentDate(BaseTool):
    name: str = "get_current_date"
    description: str = "Use this tool to fetch the current date and time. No input is required."

    def _run(self, action_input: str = ""):
        """Fetches the current date and time."""
        time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return f"Current date and time is: {time}"

class Get_text_url(BaseTool):
    name: str = "get_text_url"
    description: str = "using this tool to recive text and urls from the user when necessary only."

    def _run(self, query: str):
        print("\nSquidgy:",query)
        user_input = input("\nUser: ")
        return f"Analyzing website: {user_input}"
        
#calculator=Calculator()
#Date=GetCurrentDate()
#Text_URL=Get_text_url()

# Function to save new information
def save_to_memory(text, speaker="AI"):
    """Saves user input or AI findings to FAISS memory and logs it in an Excel file."""
    global vector_store

    # Generate a unique ID
    entry_id = str(uuid.uuid4())  # Unique ID for each saved entry
    
    # Check if FAISS is initialized
    if vector_store is None:
        print("Initializing FAISS and saving first document.")
        vector_store = FAISS.from_documents([Document(page_content=text)], embeddings)
        vector_store.save_local(FAISS_PATH)
    else:
        # Check for duplicates
        results = vector_store.similarity_search(text, k=1)
        if results and results[0].page_content.strip().lower() == text.strip().lower():
            print("Duplicate detected, skipping save.")
            return "This information is already stored."
        
        # Add to FAISS
        vector_store.add_documents([Document(page_content=text)])
        vector_store.save_local(FAISS_PATH)

    # Save to Excel file
    save_to_excel(entry_id, text, speaker)
    
    return f"Saved: {text} with ID: {entry_id}"


def save_to_excel(entry_id, text, speaker):
    """Logs FAISS-stored text along with its unique ID into an Excel file, including user inputs."""
    data = {"ID": [entry_id], "Speaker": [speaker], "Text": [text]}
    df = pd.DataFrame(data)

    # Check if the file exists
    if os.path.exists(EXCEL_FILE):
        existing_df = pd.read_excel(EXCEL_FILE)
        df = pd.concat([existing_df, df], ignore_index=True)

    # Save to Excel
    df.to_excel(EXCEL_FILE, index=False)
    print(f"Logged in Excel: {speaker} - {entry_id} - {text[:30]}...")  # Show first 30 chars

# Function to retrieve stored information
def retrieve_from_memory(query):
    global vector_store

    if vector_store is None:
        return "No information stored yet."

    print(f"Searching FAISS for: {query}")  # Debugging log
    results = vector_store.similarity_search(query, k=3)
    
    if results:
        print("Results found:", results)  # Debugging log
        return "\n".join([doc.page_content for doc in results])

    print("No relevant information found.")  # Debugging log
    return "No relevant information found."

# Create tools for AI agent
def save_tool_initiate():
    save_tool = Tool(
        name="Memory Saver",
        func=save_to_memory,
        description="Saves important user input or discovered information for later retrieval."
    )
    return save_tool

def retrieve_tool_initiate():
    retrieve_tool = Tool(
        name="Memory Retriever",
        func=retrieve_from_memory,
        description="Finds and retrieves stored information based on a given query."
    )
    return retrieve_tool

# Initialize Apify wrapper
apify = ApifyWrapper()

# Define a function to scrape data using Apify
def scrape_website(url):
    run_input = {
        "startUrls": [{"url": url}],
        "maxCrawlPages": 5,
        "crawlerType": "cheerio"
    }

    # Function to convert Apify output to LangChain documents
    def dataset_mapping_function(item):
        return DOC(
            page_content=item.get("text", ""),
            metadata={"source": item.get("url", "")}
        )

    # Run the Apify Actor
    loader = apify.call_actor(
        actor_id="apify/website-content-crawler",
        run_input=run_input,
        dataset_mapping_function=dataset_mapping_function
    )

    documents = loader.load()
    return documents[0].page_content if documents else "No content found."

def apify_tool_initiate():
    # Create an Apify Tool
    apify_tool = Tool(
        name="Apify Web Scraper",
        func=scrape_website,
        description="Scrapes website content and extracts useful text data for analysing."
    )
    return apify_tool


def initate_agent():
    calculator=Calculator()
    Date=GetCurrentDate()
    Text_URL=Get_text_url()
    save_tool=save_tool_initiate()
    retrieve_tool=retrieve_tool_initiate()
    apify_tool=apify_tool_initiate()
    
    tools=[DuckDuckGoSearchRun(),apify_tool,save_tool,retrieve_tool,Date,Text_URL]
    
    # Initialize the HuggingFace model
    llm = HuggingFaceEndpoint(
        #repo_id="meta-llama/Meta-Llama-3-8B-Instruct",
        repo_id="deepseek-ai/DeepSeek-R1",
        temperature=0.4,
        task="text-generation",
        huggingfacehub_api_token=Hugging_Face_token
    )
    
    
    # Initialize Agent
    agent = initialize_agent(
        #agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        agent_type=AgentType.OPENAI_FUNCTIONS,
        #agent_type=AgentType.SELF_ASK_WITH_SEARCH,
        tools=tools,
        llm=llm,
        handle_parsing_errors=True,
        verbose=True
    )
    return agent