from flask import Flask, request, jsonify
from dotenv import load_dotenv
import time
from flask_cors import CORS
load_dotenv()

app = Flask(__name__)
CORS(app)

MODEL = "gpt-4o"

@app.route('/')
def home():
    return "Server is running"

@app.route('/get_response', methods=['POST'])
def get_response():
    data = request.get_json()
    messages = data['messages']
    print("Incoming messages", messages)
    time.sleep(2)
    return jsonify({
        "role": "assistant",
        "content": "This is a default message, update the backend to get a response from the OpenAI API instead."
    })

if __name__ == '__main__':
    # Debug mode should be set to False in production
    app.run(debug=True, port=8000)
