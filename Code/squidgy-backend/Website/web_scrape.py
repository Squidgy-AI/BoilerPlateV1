def capture_website_screenshot(url: str, session_id: str = None) -> str:
    """
    Captures a screenshot of the entire website using headless browser.
    
    Args:
        url (str): URL of the website to capture
        session_id (str, optional): Session ID for filename
        
    Returns:
        str: Filename of the saved screenshot (without the full path)
    """
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    import time
    import os

    # Create the images directory if it doesn't exist
    os.makedirs("static/screenshots", exist_ok=True)

    try:
        # Use session_id in filename if provided
        if session_id:
            filename = f"{session_id}_screenshot.jpg"
            full_path = f"static/screenshots/{filename}"
        else:
            filename = f"screenshot_{int(time.time())}.jpg"
            full_path = f"static/screenshots/{filename}"
        
        # Set up Chrome options for headless mode
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Initialize driver with options
        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url)
        time.sleep(3)  # Increased wait time to ensure page loads completely
        driver.save_screenshot(full_path)
        driver.quit()
        
        # Return just the filename (not the full path) for API usage
        print(f"Screenshot saved at: {full_path}, returning: {filename}")
        return filename
    except Exception as e:
        print(f"Error capturing screenshot: {e}")
        return None

def get_website_favicon(url: str, session_id: str = None) -> str:
    """
    Gets the favicon from a website and saves it.
    
    Args:
        url (str): URL of the website to scrape
        session_id (str, optional): Session ID for filename
        
    Returns:
        str: Filename of the saved favicon (without the full path)
    """
    from bs4 import BeautifulSoup
    import requests
    import time
    import os
    from PIL import Image
    from io import BytesIO
    
    print(f"Getting favicon for URL: {url}, session_id: {session_id}")
    
    # Create the images directory if it doesn't exist
    os.makedirs("static/favicons", exist_ok=True)

    try:
        # Create filename with timestamp or session ID
        if session_id:
            filename = f"{session_id}_logo.jpg"
            full_path = f"static/favicons/{filename}"
        else:
            filename = f"logo_{int(time.time())}.jpg"
            full_path = f"static/favicons/{filename}"
        
        # Get the website's HTML
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        print(f"Sending HTTP request to {url}")
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for favicon in link tags
        favicon_url = None
        
        # Check for standard favicon link tags
        for link in soup.find_all('link'):
            rel = link.get('rel', [])
            # Handle both string and list formats for rel attribute
            if isinstance(rel, list):
                rel = ' '.join(rel).lower()
            else:
                rel = rel.lower()
                
            if 'icon' in rel or 'shortcut icon' in rel or 'apple-touch-icon' in rel:
                favicon_url = link.get('href')
                print(f"Found favicon link: {favicon_url}")
                break
        
        # If no favicon found, try default location
        if not favicon_url:
            favicon_url = f"{url}/favicon.ico"
            print(f"No favicon link found, trying default: {favicon_url}")
        
        # Fix relative URLs
        if favicon_url and not favicon_url.startswith('http'):
            if favicon_url.startswith('//'):
                favicon_url = 'https:' + favicon_url
            elif favicon_url.startswith('/'):
                base_url = url
                if '/' in url.split('//')[1]:
                    base_url = '/'.join(url.split('/')[0:3])
                favicon_url = base_url + favicon_url
            else:
                base_url = url
                if '/' in url.split('//')[1]:
                    base_url = '/'.join(url.split('/')[0:3])
                favicon_url = f"{base_url}/{favicon_url}"
            
            print(f"Resolved favicon URL: {favicon_url}")
        
        # Download the favicon and save it
        if favicon_url:
            try:
                print(f"Requesting favicon from {favicon_url}")
                favicon_response = requests.get(favicon_url, headers=headers, timeout=15, stream=True)
                if favicon_response.status_code == 200:
                    # Save favicon as JPG
                    try:
                        img = Image.open(BytesIO(favicon_response.content))
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        img.save(full_path, 'JPEG')
                        print(f"Successfully saved favicon as JPEG: {full_path}")
                        
                        # Return just the filename (not the full path) for API usage
                        return filename
                    except Exception as e:
                        print(f"Error converting favicon to JPG: {e}")
                        # Fallback: save original content
                        with open(full_path, 'wb') as f:
                            f.write(favicon_response.content)
                        print(f"Saved original favicon content: {full_path}")
                        return filename
                else:
                    print(f"Failed to download favicon, status code: {favicon_response.status_code}")
            except Exception as e:
                print(f"Error downloading favicon from {favicon_url}: {e}")
        
        print("No favicon found or could not be downloaded")
        return None
    
    except Exception as e:
        print(f"Error fetching favicon: {e}")
        return None