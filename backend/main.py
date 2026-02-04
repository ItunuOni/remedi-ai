from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

# 1. Setup
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    api_key = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=api_key)

# Using the stable model found in your scan
model = genai.GenerativeModel('models/gemini-2.0-flash') 

app = FastAPI()

# 2. Security (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Define Data Format
class ChatRequest(BaseModel):
    message: str

class SummaryRequest(BaseModel):
    history: str

# 4. The Brain
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # UPDATED PERSONA: NOW INCLUDES EMERGENCY TRIGGER
        system_instruction = (
            "You are REMEDI, a helpful home health assistant. "
            "IMPORTANT RULES:"
            "1. SPEAK SIMPLY: Use simple English. No complex medical jargon."
            "2. BE DIRECT: Ignore pleasantries like 'Thank you' or 'Hello'."
            "3. RECOMMENDATIONS: Suggest OTC meds (Panadol, Vitamin C) and home remedies."
            "4. 🚨 CRITICAL SAFETY: If the user mentions life-threatening symptoms (chest pain, coughing blood, can't breathe, dying, unconsciousness, severe bleeding), "
            "YOU MUST start your response with exactly: '🚨 EMERGENCY_TRIGGER 🚨'. Then tell them to go to the hospital immediately."
        )
        
        full_prompt = f"{system_instruction}\n\nPatient: {request.message}\nRemedi:"
        
        response = model.generate_content(full_prompt)
        return {"response": response.text}
    
    except Exception as e:
        print(f"ERROR: {str(e)}") 
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize_endpoint(request: SummaryRequest):
    try:
        system_instruction = (
            "You are a Medical Scribe. Summarize the following chat history into a professional note for a doctor."
            "RULES:"
            "1. IGNORE pleasantries."
            "2. EXTRACT ONLY: Symptoms, Duration, Severity, and any Meds taken."
            "3. FORMAT: Keep it under 50 words. Be blunt."
        )
        full_prompt = f"{system_instruction}\n\nHISTORY:\n{request.history}\n\nDoctor Note:"
        response = model.generate_content(full_prompt)
        return {"response": response.text}
    except Exception as e:
        print(f"ERROR: {str(e)}") 
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"status": "Remedi System Online"}