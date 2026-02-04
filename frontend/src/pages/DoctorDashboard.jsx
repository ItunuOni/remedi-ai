import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; 
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

  // 2. Fetch ALL Patients (Pending & Completed)
  useEffect(() => {
    if (!user) return; 

    // MODIFIED: Shows EVERYTHING sorted by newest.
    const q = query(collection(db, "doctor_requests"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(list);
    }, (err) => {
      console.error(err);
      setError(err.message);
    });
    return () => unsubscribe();
  }, [user]); 

  // 3. Fetch Active Chat
  useEffect(() => {
    if (!selectedPatient) {
        setChatHistory([]);
        setAiSummary("");
        return;
    }

    const msgsRef = collection(db, "users", selectedPatient.userId, "sessions", selectedPatient.sessionId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => doc.data());
        setChatHistory(msgs);
    });

    if (!aiSummary) {
       generateSummary(selectedPatient); 
    }

    return () => unsubscribe();
  }, [selectedPatient]);

  const generateSummary = async (ticket) => {
    setAiSummary("Generating smart summary...");
    try {
      const res = await fetch(`${RAW_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: ticket.preview }) 
      });
      const data = await res.json();
      setAiSummary(data.response);
    } catch (err) {
      setAiSummary("Could not generate summary.");
    }
  };

  // --- NEW: DELETE TICKET ---
  const deleteTicket = async (e, ticketId) => {
    e.stopPropagation(); // Prevent opening the chat when clicking delete
    if (!window.confirm("Remove this patient from your waiting list?")) return;
    
    try {
        await deleteDoc(doc(db, "doctor_requests", ticketId));
        if (selectedPatient?.id === ticketId) {
            setSelectedPatient(null);
        }
    } catch (err) {
        alert("Failed to delete: " + err.message);
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

        // We mark as completed, but it stays in the list (visually changed)
        await updateDoc(doc(db, "doctor_requests", selectedPatient.id), {
            status: "completed",
            resolvedBy: auth.currentUser?.email || "Doctor"
        });

        alert("Prescription sent!");
        setDoctorNote(""); 
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

        {/* UPDATED TITLE */}
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Patient Queue ({patients.length})</h2>
        
        <div className="space-y-2 flex-1 overflow-y-auto">
            {patients.map(p => (
                <div 
                    key={p.id} 
                    onClick={() => setSelectedPatient(p)} 
                    className={`group relative p-3 rounded-lg border cursor-pointer transition-all 
                        ${selectedPatient?.id === p.id ? 'bg-[#00CCFF]/20 border-[#00CCFF]' : 'bg-white/5 border-transparent hover:bg-white/10'}
                        ${p.status === 'completed' ? 'opacity-70 border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'}
                    `}
                >
                    <div className="font-bold text-sm text-white flex justify-between">
                        <span>{p.userEmail}</span>
                        {p.status === 'completed' && <span className="text-green-400 text-[10px]">✓ DONE</span>}
                    </div>
                    <div className="text-xs text-slate-400 truncate pr-6">{p.preview}</div>
                    
                    {/* DELETE BUTTON (Only shows on hover) */}
                    <button 
                        onClick={(e) => deleteTicket(e, p.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-2 transition-all"
                        title="Remove from list"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
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
                            <div key={idx} className={`p-4 rounded-xl text-sm max-w-[90%] shadow-sm ${msg.role === 'user' ? 'bg-[#00CCFF]/10 text-white ml-auto border border-[#00CCFF]/30 rounded-tr-none' : 'bg-white/5 text-slate-300 rounded-tl-none border border-white/5'}`}>
                                <span className="text-[10px] uppercase font-bold opacity-50 block mb-2 tracking-wider">{msg.role}</span>
                                {/* MARKDOWN RENDERER */}
                                <ReactMarkdown components={{
                                    strong: ({node, ...props}) => <span className="font-bold text-[#00CCFF]" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc ml-4 space-y-2 mt-2" {...props} />,
                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                                }}>
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-96 p-6 bg-slate-800/50 flex flex-col border-l border-white/10">
                    <div className="mb-6 p-4 bg-[#00CCFF]/10 border border-[#00CCFF]/20 rounded-xl">
                        <h4 className="text-xs font-bold text-[#00CCFF] uppercase mb-2 flex items-center gap-2">
                             ✨ AI Summary
                        </h4>
                        <div className="text-sm text-slate-200 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                           <ReactMarkdown>{aiSummary}</ReactMarkdown>
                        </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Prescription / Advice</h4>
                    <textarea 
                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-4 text-sm focus:border-[#00CCFF] focus:outline-none resize-none mb-4 text-white placeholder-slate-600"
                        placeholder="Type your medical advice here..."
                        value={doctorNote}
                        onChange={(e) => setDoctorNote(e.target.value)}
                    ></textarea>

                    <button onClick={sendPrescription} className="w-full bg-[#00CCFF] text-slate-900 font-bold py-3 rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,204,255,0.2)]">
                        Send to Patient
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic flex-col gap-4">
                <div className="w-16 h-16 opacity-20"><Logo /></div>
                Select a patient to start consultation
            </div>
        )}
      </div>
    </div>
  );
}