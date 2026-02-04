import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const RAW_URL = "https://remedi-backend-5eu1.onrender.com"; // Your Render Backend

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [doctorNote, setDoctorNote] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const navigate = useNavigate();

  // 1. Fetch patients waiting for a doctor
  useEffect(() => {
    // We query all users -> sessions where status == 'waiting_for_doctor'
    // Note: In a real app, this requires a Collection Group Query, 
    // but for this MVP we will structure it by querying known paths or using a separate 'tickets' collection.
    // STRATEGY: For this Demo, we will just listen to a "tickets" collection we create on the main dashboard.
    const q = query(collection(db, "doctor_requests"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(list);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Chat History when a patient is selected
  const loadPatientChat = async (ticket) => {
    setSelectedPatient(ticket);
    setDoctorNote("");
    setAiSummary("Loading summary...");

    // Get the messages from the user's session
    // Path: users/{uid}/sessions/{sessionId}/messages
    const msgsRef = collection(db, "users", ticket.userId, "sessions", ticket.sessionId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));
    
    const snapshot = await getDocs(q);
    const msgs = snapshot.docs.map(doc => doc.data());
    setChatHistory(msgs);

    // Generate AI Summary
    const fullText = msgs.map(m => `${m.role}: ${m.text}`).join("\n");
    generateSummary(fullText);
  };

  const generateSummary = async (historyText) => {
    try {
      const res = await fetch(`${RAW_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: historyText })
      });
      const data = await res.json();
      setAiSummary(data.response);
    } catch (err) {
      setAiSummary("Could not generate summary.");
    }
  };

  const sendPrescription = async () => {
    if (!doctorNote) return;
    
    // 1. Add doctor message to patient's chat
    await addDoc(collection(db, "users", selectedPatient.userId, "sessions", selectedPatient.sessionId, "messages"), {
        role: "ai", // We use 'ai' role styling but prefix with DOCTOR
        text: `👨‍⚕️ **DOCTOR'S NOTE:** ${doctorNote}`,
        createdAt: serverTimestamp()
    });

    // 2. Close the ticket
    await updateDoc(doc(db, "doctor_requests", selectedPatient.id), {
        status: "completed",
        resolvedBy: auth.currentUser.email
    });

    alert("Prescription sent to patient!");
    setSelectedPatient(null);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans">
      {/* Sidebar: Patient Queue */}
      <div className="w-80 border-r border-white/10 p-4 bg-slate-900/50">
        <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8"><Logo /></div>
            <span className="font-bold text-xl tracking-wider">REMEDI <span className="text-[#00CCFF] text-xs">MD</span></span>
        </div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Waiting Room ({patients.length})</h2>
        
        <div className="space-y-2">
            {patients.map(p => (
                <div key={p.id} onClick={() => loadPatientChat(p)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'bg-[#00CCFF]/20 border-[#00CCFF]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                    <div className="font-bold text-sm text-white">{p.userEmail}</div>
                    <div className="text-xs text-slate-400 truncate">{p.preview}</div>
                    <div className="text-[10px] text-[#00CCFF] mt-1">Wait time: Just now</div>
                </div>
            ))}
            {patients.length === 0 && <p className="text-slate-500 text-sm italic">No patients waiting.</p>}
        </div>

        <button onClick={() => { signOut(auth); navigate("/"); }} className="mt-auto w-full py-3 text-red-400 text-sm hover:text-white">Log Out</button>
      </div>

      {/* Main Area: Workspace */}
      <div className="flex-1 flex flex-col">
        {selectedPatient ? (
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Chat History */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-white/10 custom-scrollbar">
                    <h3 className="text-lg font-bold mb-4 text-[#00CCFF]">Patient History</h3>
                    <div className="space-y-4">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`p-3 rounded-lg text-sm max-w-[90%] ${msg.role === 'user' ? 'bg-[#00CCFF]/10 text-white ml-auto border border-[#00CCFF]/30' : 'bg-white/5 text-slate-300'}`}>
                                <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">{msg.role}</span>
                                {msg.text}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Doctor Actions */}
                <div className="w-96 p-6 bg-slate-800/50 flex flex-col">
                    <div className="mb-6 p-4 bg-[#00CCFF]/10 border border-[#00CCFF]/20 rounded-xl">
                        <h4 className="text-xs font-bold text-[#00CCFF] uppercase mb-2">✨ AI Summary</h4>
                        <p className="text-sm text-slate-200 leading-relaxed">{aiSummary}</p>
                    </div>

                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Prescription / Advice</h4>
                    <textarea 
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-4 text-sm focus:border-[#00CCFF] focus:outline-none resize-none mb-4"
                        placeholder="Type your medical advice here..."
                        value={doctorNote}
                        onChange={(e) => setDoctorNote(e.target.value)}
                    ></textarea>

                    <button onClick={sendPrescription} className="w-full bg-[#00CCFF] text-slate-900 font-bold py-3 rounded-xl hover:scale-105 transition-transform">
                        Send to Patient
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic">Select a patient to start consultation</div>
        )}
      </div>
    </div>
  );
}