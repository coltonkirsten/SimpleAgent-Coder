import requests
from bs4 import BeautifulSoup
import concurrent.futures
import json

def log(log, type="system"):
    print(f"\n\033[34m< {type} > {log}\033[0m")

def fetch_page(url):
    """
    Fetches a single webpage and returns basic information.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
    }
    try:
        response = requests.get(url, timeout=10, headers=headers)
        response.raise_for_status()
        page_content = response.text
        soup = BeautifulSoup(page_content, 'html.parser')
        title_tag = soup.find('title')
        title = title_tag.get_text(strip=True) if title_tag else "No Title Found"
        # Get all text content
        text_content = soup.get_text(separator=' ', strip=True)
        # Append content to file
        with open('search_results.txt', 'a', encoding='utf-8') as f:
            f.write(f"\nURL: {url}\nTitle: {title}\nContent:\n{text_content}\n{'='*80}\n")
        # Return just title and URL
        return {"url": url, "title": title}
    except Exception as e:
        return {"url": url, "error": str(e)}

def do_web_search(query):
    """
    Perform a web search for the given query and scrape the top 10 results concurrently.
    """
    # Clear previous search results before starting new search
    with open('search_results.txt', 'w', encoding='utf-8') as f:
        f.write(f"Search Query: {query}\n{'='*80}\n")
        
    search_url = "https://html.duckduckgo.com/html"
    params = {"q": query}
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
    }
    try:
        search_response = requests.get(search_url, params=params, timeout=10, headers=headers)
        search_response.raise_for_status()
    except Exception as e:
        return json.dumps({"query": query, "error": f"Error fetching search results: {e}"})
    
    soup = BeautifulSoup(search_response.text, "html.parser")
    # Try finding links using the expected class name
    result_links = soup.find_all("a", class_="result__a")
    
    # Fallback to any <a> tag with an href (you may want to refine this further)
    if not result_links:
        result_links = soup.find_all("a", href=True)
    
    top_links = []
    # Extract the href from each link if it starts with "http" (to filter out relative URLs)
    for link in result_links:
        href = link.get("href")
        if href and href.startswith("http"):
            top_links.append(href)
        if len(top_links) >= 10:
            break

    if not top_links:
        # Debug: Uncomment the line below to see the returned HTML structure if needed.
        # print(search_response.text)
        return json.dumps({"query": query, "error": "No search results found."})
    
    results = []
    # Use a ThreadPoolExecutor to fetch pages concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(fetch_page, url): url for url in top_links}
        for future in concurrent.futures.as_completed(future_to_url):
            result = future.result()
            results.append(result)
    
    return json.dumps({"query": query, "results": results})

def web_search(query):
    log(do_web_search(query), type="Function")
    try:
        with open('search_results.txt', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "No search results found. Please perform a search first."

tool_interface = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Perform a web search for a given query and scrape the top 10 results concurrently.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query string."
                }
            },
            "required": ["query"]
        }
    }
}

available_functions = {
    "web_search": web_search
} 

if __name__ == "__main__":
    # Example usage
    search_query = "Python web scraping tutorial"
    results = web_search(search_query)
    print(f"\nSearch results for: {search_query}")
    print(results)
