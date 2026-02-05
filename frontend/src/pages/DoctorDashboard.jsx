import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; 
import Logo from '../components/Logo';

const RAW_URL = "https://remedi-backend-5eu1.onrender.com";

const AUTHORIZED_DOCTORS = [
  "oniitunu804@gmail.com", 
  "trenztech62@gmail.com",
  "lekefrnk@gmail.com"
];

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [doctorNote, setDoctorNote] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            if (AUTHORIZED_DOCTORS.includes(currentUser.email)) {
                setUser(currentUser);
                setIsAuthorized(true);
            } else {
                setUser(currentUser);
                setIsAuthorized(false);
            }
        } else {
            setUser(null);
            setIsAuthorized(false);
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthorized) return; 
    const q = query(collection(db, "doctor_requests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => { setError(err.message); });
    return () => unsubscribe();
  }, [user, isAuthorized]); 

  useEffect(() => {
    if (!selectedPatient) {
        setChatHistory([]);
        setAiSummary("");
        return;
    }
    const msgsRef = collection(db, "users", selectedPatient.userId, "sessions", selectedPatient.sessionId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setChatHistory(snapshot.docs.map(doc => doc.data()));
    });
    if (!aiSummary) { generateSummary(selectedPatient); }
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
    } catch (err) { setAiSummary("Could not generate summary."); }
  };

  const deleteTicket = async (e, ticketId) => {
    e.stopPropagation(); 
    if (!window.confirm("Remove this patient from your waiting list?")) return;
    try {
        await deleteDoc(doc(db, "doctor_requests", ticketId));
        if (selectedPatient?.id === ticketId) setSelectedPatient(null);
    } catch (err) { alert("Failed to delete."); }
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
        setDoctorNote(""); 
    } catch (err) { alert("Failed to send."); }
  };

  const joinVideoCall = () => {
    if (!selectedPatient) return;
    window.open(`https://meet.jit.si/remedi-secure-${selectedPatient.sessionId}`, '_blank');
  };

  if (!user) return <div className="flex h-screen bg-slate-900 items-center justify-center text-white">Loading Security...</div>;
  
  if (!isAuthorized) {
    return (
        <div className="flex h-screen bg-slate-900 items-center justify-center flex-col text-white">
            <h1 className="text-3xl font-bold text-red-500 mb-2">⛔ Access Denied</h1>
            <p className="text-slate-300 mb-4">Authorized Personnel Only</p>
            <button onClick={() => { signOut(auth); navigate('/login'); }} className="text-red-400 border border-red-500 px-6 py-2 rounded-lg">Log Out</button>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans flex-col md:flex-row">
      
      {/* SIDEBAR: Visible on Mobile ONLY if no patient selected, OR on Desktop always */}
      <div className={`w-full md:w-80 border-r border-white/10 p-4 bg-slate-900/50 flex flex-col ${selectedPatient ? 'hidden md:flex' : 'flex-1'}`}>
        <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8"><Logo /></div>
            <span className="font-bold text-xl tracking-wider">REMEDI <span className="text-[#00CCFF] text-xs">MD</span></span>
        </div>
        
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Patient Queue ({patients.length})</h2>
        <div className="space-y-2 flex-1 overflow-y-auto">
            {patients.map(p => (
                <div key={p.id} onClick={() => setSelectedPatient(p)} className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${selectedPatient?.id === p.id ? 'bg-[#00CCFF]/20 border-[#00CCFF]' : 'bg-white/5 border-transparent hover:bg-white/10'} ${p.status === 'completed' ? 'opacity-70 border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'}`}>
                    <div className="font-bold text-sm text-white flex justify-between items-center h-5">
                        <span className="truncate pr-2">{p.userEmail}</span>
                        {p.status === 'completed' && <span className="text-green-400 text-[10px] whitespace-nowrap group-hover:opacity-0 transition-opacity duration-200">✓ DONE</span>}
                    </div>
                    <div className="text-xs text-slate-400 truncate pr-6">{p.preview}</div>
                    <button onClick={(e) => deleteTicket(e, p.id)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-2 transition-all">🗑️</button>
                </div>
            ))}
        </div>
        <button onClick={() => { signOut(auth); navigate("/"); }} className="mt-4 w-full py-3 text-red-400 text-sm hover:text-white border-t border-white/10">Log Out</button>
      </div>

      {/* MAIN AREA: Visible on Mobile ONLY if patient selected, OR on Desktop always */}
      <div className={`flex-1 flex-col ${selectedPatient ? 'flex' : 'hidden md:flex'}`}>
        {selectedPatient ? (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* CHAT AREA */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-white/10 custom-scrollbar">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            {/* MOBILE BACK BUTTON */}
                            <button onClick={() => setSelectedPatient(null)} className="md:hidden text-slate-400 hover:text-white mr-2">← Back</button>
                            <h3 className="text-lg font-bold text-[#00CCFF]">Patient History</h3>
                        </div>
                        <button onClick={joinVideoCall} className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                            📹 Video
                        </button>
                    </div>
                    <div className="space-y-4 pb-4">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`p-4 rounded-xl text-sm max-w-[90%] shadow-sm ${msg.role === 'user' ? 'bg-[#00CCFF]/10 text-white ml-auto border border-[#00CCFF]/30 rounded-tr-none' : 'bg-white/5 text-slate-300 rounded-tl-none border border-white/5'}`}>
                                <span className="text-[10px] uppercase font-bold opacity-50 block mb-2 tracking-wider">{msg.role}</span>
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DOCTOR NOTES PANEL (Stacks on mobile, Sidebar on desktop) */}
                <div className="w-full md:w-96 p-6 bg-slate-800/50 flex flex-col border-t md:border-t-0 md:border-l border-white/10 h-1/2 md:h-full">
                    <div className="mb-4 p-4 bg-[#00CCFF]/10 border border-[#00CCFF]/20 rounded-xl hidden md:block">
                        <h4 className="text-xs font-bold text-[#00CCFF] uppercase mb-2">✨ AI Summary</h4>
                        <div className="text-sm text-slate-200 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar"><ReactMarkdown>{aiSummary}</ReactMarkdown></div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Prescription / Advice</h4>
                    <textarea className="flex-1 bg-slate-900 border border-white/10 rounded-xl p-4 text-sm focus:border-[#00CCFF] focus:outline-none resize-none mb-4 text-white placeholder-slate-600" placeholder="Type medical advice..." value={doctorNote} onChange={(e) => setDoctorNote(e.target.value)}></textarea>
                    <button onClick={sendPrescription} className="w-full bg-[#00CCFF] text-slate-900 font-bold py-3 rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,204,255,0.2)]">Send to Patient</button>
                </div>
            </div>
        ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 italic flex-col gap-4">
                <div className="w-16 h-16 opacity-20"><Logo /></div>
                Select a patient from the queue
            </div>
        )}
      </div>
    </div>
  );
}