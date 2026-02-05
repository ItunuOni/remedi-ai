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
email_user = os.getenv("EMAIL_USER") # Your Gmail Address
email_pass = os.getenv("EMAIL_PASS") # Your Gmail App Password

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

# 4. The Brain (Chat & Summary)
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
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

# 5. NEW: The Emergency Email Dispatcher
@app.post("/emergency-email")
async def send_emergency_email(request: EmergencyRequest):
    if not email_user or not email_pass:
        raise HTTPException(status_code=500, detail="Server Email Credentials Missing")

    try:
        # Create the email
        msg = MIMEMultipart()
        msg['From'] = email_user
        msg['To'] = request.hospital_email
        msg['Subject'] = f"URGENT: MEDICAL ALERT - PATIENT {request.patient_email}"

        body = f"""
        URGENT MEDICAL ALERT - REMEDI SYSTEM
        ====================================
        
        PATIENT DETAILS:
        ----------------
        Account ID: {request.patient_email}
        Home Address: {request.home_address}
        Medical History: {request.medical_conditions}
        
        EMERGENCY CONTACT:
        ------------------
        Name: {request.contact_name}
        Phone: {request.contact_phone}
        
        STATUS:
        -------
        The patient has triggered a CRITICAL HEALTH ALERT via the Remedi App.
        Immediate medical attention is requested at the location above.
        
        ------------------------------------
        Sent automatically by Remedi AI
        """
        
        msg.attach(MIMEText(body, 'plain'))

        # Send via Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(email_user, email_pass)
        text = msg.as_string()
        server.sendmail(email_user, request.hospital_email, text)
        server.quit()

        return {"status": "success", "message": "Emergency Alert Dispatched"}

    except Exception as e:
        print(f"EMAIL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@app.get("/")
def home():
    return {"status": "Remedi System Online"}