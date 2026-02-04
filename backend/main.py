from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

# 1. Setup
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

# Fallback if specific key is missing, check standard GOOGLE_API_KEY
if not api_key:
    api_key = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=api_key)

# Use the model
model = genai.GenerativeModel('models/gemini-2.0-flash-exp') # Updated to latest stable fast model

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
        # UPDATED PERSONA: Smarter, Safe, and Prescriptive for OTC
        system_instruction = (
            "You are REMEDI, an advanced medical AI. "
            "1. FOR MINOR ISSUES: Suggest specific Over-The-Counter (OTC) medications (names like Paracetamol, Ibuprofen, Antihistamines, etc.) and home remedies. "
            "2. FOR SERIOUS ISSUES: urgent warning to visit a hospital. "
            "3. STYLE: Professional, concise, and empathetic. Use bullet points for clarity."
        )
        
        full_prompt = f"{system_instruction}\n\nPatient: {request.message}\nRemedi:"
        
        response = model.generate_content(full_prompt)
        return {"response": response.text}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize_endpoint(request: SummaryRequest):
    try:
        system_instruction = (
            "You are a Medical Scribe. Summarize the following patient-AI chat history into a professional 'Doctor Handover Note'. "
            "Include: Chief Complaint, Duration, Severity, and any medications mentioned. Keep it under 100 words."
        )
        full_prompt = f"{system_instruction}\n\nHISTORY:\n{request.history}\n\nDoctor Note:"
        response = model.generate_content(full_prompt)
        return {"response": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"status": "Remedi System Online"}