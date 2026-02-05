from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# 1. Setup
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
email_user = os.getenv("EMAIL_USER")
email_pass = os.getenv("EMAIL_PASS")

# Fallback for API Key
if not api_key:
    api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("CRITICAL WARNING: GEMINI_API_KEY is missing!")

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

# 5. EMERGENCY EMAIL ENGINE (UPDATED: SSL PORT 465)
@app.post("/emergency-email")
async def send_emergency_email(request: EmergencyRequest):
    print(f"Attempting to send email via SSL (Port 465) from: {email_user} to {request.hospital_email}")

    if not email_user or not email_pass:
        print("ERROR: Email Credentials missing on Server.")
        raise HTTPException(status_code=500, detail="Server Configuration Error: Missing Email Credentials")

    try:
        msg = MIMEMultipart()
        msg['From'] = email_user
        msg['To'] = request.hospital_email
        msg['Subject'] = f"URGENT: MEDICAL ALERT - PATIENT {request.patient_email}"

        body = f"""
        URGENT MEDICAL ALERT - REMEDI SYSTEM
        ====================================
        
        PATIENT: {request.patient_email}
        LOCATION: {request.home_address}
        CONDITIONS: {request.medical_conditions}
        
        CONTACT: {request.contact_name} ({request.contact_phone})
        
        STATUS: CRITICAL SYMPTOMS REPORTED via Remedi App.
        Immediate attention required.
        """
        msg.attach(MIMEText(body, 'plain'))

        # FIREWALL BYPASS: Use SMTP_SSL on Port 465
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(email_user, email_pass)
        server.sendmail(email_user, request.hospital_email, msg.as_string())
        server.quit()

        print("Email sent successfully via SSL!")
        return {"status": "success", "message": "Alert Dispatched"}

    except Exception as e:
        print(f"EMAIL FAILED (SSL): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Email Failure: {str(e)}")

@app.get("/")
def home():
    return {"status": "Remedi System Online", "email_service": "configured" if email_user else "missing"}