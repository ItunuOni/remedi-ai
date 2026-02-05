from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
import requests # NEW: For API calls
from dotenv import load_dotenv

# 1. Setup
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
brevo_api_key = os.getenv("BREVO_API_KEY")
sender_email = os.getenv("SENDER_EMAIL")

if not api_key:
    api_key = os.getenv("GOOGLE_API_KEY")

genai.configure(api_key=api_key)
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

# 3. Define Data Formats
class ChatRequest(BaseModel):
    message: str

class SummaryRequest(BaseModel):
    history: str

class EmergencyRequest(BaseModel):
    patient_email: str
    hospital_email: str
    contact_name: str
    contact_phone: str
    home_address: str
    medical_conditions: str

# 4. The Brain
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        system_instruction = (
            "You are REMEDI, a helpful home health assistant. "
            "RULES: Speak simply. Be direct. Suggest OTC meds. "
            "SAFETY: If symptoms are life-threatening (chest pain, blood, dying), "
            "start response with: '🚨 EMERGENCY_TRIGGER 🚨'."
        )
        full_prompt = f"{system_instruction}\n\nPatient: {request.message}\nRemedi:"
        response = model.generate_content(full_prompt)
        return {"response": response.text}
    except Exception as e:
        print(f"CHAT ERROR: {str(e)}") 
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize_endpoint(request: SummaryRequest):
    try:
        full_prompt = f"Summarize this medical history into a doctor's note (under 50 words):\n\n{request.history}"
        response = model.generate_content(full_prompt)
        return {"response": response.text}
    except Exception as e:
        print(f"SUMMARY ERROR: {str(e)}") 
        raise HTTPException(status_code=500, detail=str(e))

# 5. EMERGENCY ENGINE (BREVO API VERSION)
@app.post("/emergency-email")
async def send_emergency_email(request: EmergencyRequest):
    print(f"Attempting to dispatch alert via Brevo API to: {request.hospital_email}")

    if not brevo_api_key or not sender_email:
        print("ERROR: Brevo API Keys missing.")
        raise HTTPException(status_code=500, detail="Server Configuration Error: API Key Missing")

    # The Brevo API Endpoint
    url = "https://api.brevo.com/v3/smtp/email"

    # The Email Data Packet
    payload = {
        "sender": {"name": "Remedi Emergency System", "email": sender_email},
        "to": [{"email": request.hospital_email}],
        "subject": f"URGENT: MEDICAL ALERT - PATIENT {request.patient_email}",
        "htmlContent": f"""
        <html>
        <body>
            <h2 style="color: red;">🚨 URGENT MEDICAL ALERT</h2>
            <p><strong>Status:</strong> CRITICAL SYMPTOMS REPORTED</p>
            <hr>
            <h3>Patient Details</h3>
            <ul>
                <li><strong>Account:</strong> {request.patient_email}</li>
                <li><strong>Location:</strong> {request.home_address}</li>
                <li><strong>Conditions:</strong> {request.medical_conditions}</li>
            </ul>
            <h3>Emergency Contact</h3>
            <p>{request.contact_name} - <a href="tel:{request.contact_phone}">{request.contact_phone}</a></p>
            <hr>
            <p style="font-size: small; color: gray;">Dispatched automatically by the Remedi AI Health System.</p>
        </body>
        </html>
        """
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": brevo_api_key
    }

    try:
        # Send the Web Request (Port 443 - Not blocked by Render!)
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Brevo Response Code: {response.status_code}")
        
        if response.status_code == 201 or response.status_code == 200:
            print("✅ Alert Dispatched Successfully!")
            return {"status": "success", "message": "Alert Dispatched via Brevo"}
        else:
            print(f"❌ Brevo Error: {response.text}")
            raise HTTPException(status_code=500, detail=f"Provider Error: {response.text}")

    except Exception as e:
        print(f"API CONNECTION FAILED: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Dispatch Failed: {str(e)}")

@app.get("/")
def home():
    return {"status": "Remedi System Online", "email_engine": "Brevo API"}