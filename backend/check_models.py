import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load the key
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Error: API Key not found. Check your .env file.")
else:
    genai.configure(api_key=api_key)
    print("🔍 Scanning for available models...")
    
    try:
        found_any = False
        for m in genai.list_models():
            # We only want models that can generate text
            if 'generateContent' in m.supported_generation_methods:
                print(f"✅ FOUND: {m.name}")
                found_any = True
        
        if not found_any:
            print("⚠️ No text generation models found. Check your API key permissions.")
            
    except Exception as e:
        print(f"❌ Error talking to Google: {e}")