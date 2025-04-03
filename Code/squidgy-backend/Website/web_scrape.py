# Add these imports at the top of the file
def capture_website_screenshot(
    url: str   
):
    """
    Captures a screenshot of the entire website using headless browser.
    
    Args:
        url (str): URL of the website to capture
        
    Returns:
        str: URL path to the saved screenshot
    """
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    import time

    filename = None
    try:
        if not filename:
            # if session_id:
            #     filename = f"static/screenshots/{session_id}_screenshot.png"
            # else:
            filename = f"static/screenshots/screenshot_{int(time.time())}.png"
        
        # Set up Chrome options for headless mode
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # Initialize driver with options
        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url)
        driver.save_screenshot(filename)
        driver.quit()
        
        # Return the URL path
        return f"/{filename}"
    except Exception as e:
        print(f"Error capturing screenshot: {e}")
        return None

def get_website_favicon(
    url: str
    
):
    """
    Gets the favicon from a website and saves it.
    
    Args:
        url (str): URL of the website to scrape
        
    Returns:
        str: URL path to the saved favicon
    """
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    import time

    favicon_filename = None,
    logo_filename = None

    try:
        if not favicon_filename:
            # if session_id:
            #     favicon_filename = f"static/favicons/{session_id}_favicon.ico"
            # else:
            favicon_filename = f"static/favicons/favicon_{int(time.time())}.ico"
        
        if not logo_filename:
            # if session_id:
            #     logo_filename = f"static/favicons/{session_id}_logo.png"
            # else:
            logo_filename = f"static/favicons/logo_{int(time.time())}.png"
        
        # [Rest of function remains the same]
        
        # Return the URL path
        return f"/{logo_filename}"  # Return the PNG version
    except Exception as e:
        print(f"Error fetching favicon: {e}")
        return None