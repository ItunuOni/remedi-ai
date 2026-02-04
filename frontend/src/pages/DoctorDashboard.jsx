import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const RAW_URL = "https://remedi-backend-5eu1.onrender.com";

export default function DoctorDashboard() {
  const [user, setUser] = useState(null); 
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [doctorNote, setDoctorNote] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 1. AUTH GUARD
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            setUser(null);
        }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch patients
  useEffect(() => {
    if (!user) return; 

    // We only fetch 'pending' patients. 
    // To see past patients, we'd need a separate 'history' tab, but for now this is fine.
    const q = query(collection(db, "doctor_requests"), where("status", "==", "pending"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(list);
    }, (err) => {
      console.error(err);
      setError(err.message);
    });
    return () => unsubscribe();
  }, [user]); 

  // 2. Fetch Chat History
  const loadPatientChat = async (ticket) => {
    setSelectedPatient(ticket);
    setDoctorNote("");
    setAiSummary("Loading summary...");

    try {
        const msgsRef = collection(db, "users", ticket.userId, "sessions", ticket.sessionId, "messages");
        const q = query(msgsRef, orderBy("createdAt", "asc"));
        
        const snapshot = await getDocs(q);
        const msgs = snapshot.docs.map(doc => doc.data());
        setChatHistory(msgs);

        const fullText = msgs.map(m => `${m.role}: ${m.text}`).join("\n");
        generateSummary(fullText);
    } catch (err) {
        console.error(err);
        alert("Error loading chat: " + err.message);
    }
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
      setAiSummary("Could not generate summary. Backend might be sleeping.");
    }
  };

  const sendPrescription = async () => {
    if (!doctorNote) return;
    try {
        await addDoc(collection(db, "users", selectedPatient.userId, "sessions", selectedPatient.sessionId, "messages"), {
            role: "ai", 
            text: `👨‍⚕️ **DOCTOR'S NOTE:** ${doctorNote}`,
            createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "doctor_requests", selectedPatient.id), {
            status: "completed",
            resolvedBy: auth.currentUser?.email || "Doctor"
        });

        alert("Prescription sent!");
        // We DO NOT set selectedPatient(null) here anymore. 
        // This keeps the patient on screen so the doctor can review what they sent.
    } catch (err) {
        alert("Failed to send: " + err.message);
    }
  };

  if (!user) {
    return (
        <div className="flex h-screen bg-slate-900 items-center justify-center flex-col text-white">
            <div className="w-20 h-20 mb-6"><Logo /></div>
            <h1 className="text-2xl font-bold mb-2">Doctor Access Only</h1>
            <p className="text-slate-400 mb-6">Please log in to view the medical console.</p>
            <button 
                onClick={() => navigate('/login')}
                className="bg-[#00CCFF] text-slate-900 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
                Log In System
            </button>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-white/10 p-4 bg-slate-900/50 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8"><Logo /></div>
            <span className="font-bold text-xl tracking-wider">REMEDI <span className="text-[#00CCFF] text-xs">MD</span></span>
        </div>
        
        {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded mb-4 text-xs text-red-200">
                ⚠️ Error: {error}
            </div>
        )}

        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Waiting Room ({patients.length})</h2>
        
        <div className="space-y-2 flex-1 overflow-y-auto">
            {patients.map(p => (
                <div key={p.id} onClick={() => loadPatientChat(p)} className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'bg-[#00CCFF]/20 border-[#00CCFF]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                    <div className="font-bold text-sm text-white">{p.userEmail}</div>
                    <div className="text-xs text-slate-400 truncate">{p.preview}</div>
                </div>
            ))}
            {patients.length === 0 && !error && <p className="text-slate-500 text-sm italic">No patients waiting.</p>}
        </div>

        <button onClick={() => { signOut(auth); navigate("/"); }} className="mt-4 w-full py-3 text-red-400 text-sm hover:text-white border-t border-white/10">Log Out</button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {selectedPatient ? (
            <div className="flex-1 flex overflow-hidden">
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