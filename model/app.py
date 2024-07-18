from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)

# Load the pre-trained NER model
model = pipeline('ner', model='dslim/bert-base-NER')

import requests
from bs4 import BeautifulSoup

def fetch_text_from_url(url):
    try:
        # Send a GET request to the URL
        response = requests.get(url)
        response.raise_for_status()  # Check if the request was successful
        
        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract all text from the parsed HTML
        text = soup.get_text(separator=' ', strip=True)
        
        return text
    except requests.RequestException as e:
        print(f"Error fetching the URL: {e}")
        return None

@app.route('/get-url-text', methods=['POST'])
def extract():
    data = request.json
    url = data['url']
    text = fetch_text_from_url(url)
    
    return jsonify(text)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3200)
