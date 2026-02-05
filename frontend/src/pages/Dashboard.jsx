import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown'; 
import { jsPDF } from 'jspdf'; 
import Logo from '../components/Logo'; 

const RAW_URL = "https://remedi-backend-5eu1.onrender.com";
const BACKEND_URL = RAW_URL.replace(/\/$/, ""); 

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  // New States
  const [showSettings, setShowSettings] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyConfig, setEmergencyConfig] = useState({ contactName: '', hospitalEmail: '' });
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) { 
        setUser(currentUser); 
        loadSettings(currentUser.uid); 
      } else { 
        navigate('/'); 
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadSettings = async (uid) => {
    try {
        const docRef = doc(db, "users", uid, "settings", "profile");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setEmergencyConfig(docSnap.data());
    } catch (err) { console.error("Error loading settings", err); }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
        await setDoc(doc(db, "users", user.uid, "settings", "profile"), emergencyConfig);
        alert("Emergency Profile Saved!");
        setShowSettings(false);
    } catch (err) { alert("Failed to save settings."); }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "sessions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !currentSessionId) { setMessages([]); return; }
    const q = query(collection(db, "users", user.uid, "sessions", currentSessionId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, [user, currentSessionId]);

  const handleLogout = async () => { await signOut(auth); navigate('/'); };

  const startNewSession = () => {
    setCurrentSessionId(null); 
    setMessages([]);
    setIsSidebarOpen(false); 
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation(); 
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "sessions", sessionId));
      if (currentSessionId === sessionId) { startNewSession(); }
    } catch (err) { console.error(err); }
  };

  const startVideoChat = () => {
    if (!currentSessionId) { alert("Please start a diagnosis first."); return; }
    window.open(`https://meet.jit.si/remedi-secure-${currentSessionId}`, '_blank');
  };

  const requestDoctor = async () => {
    if (!currentSessionId || messages.length === 0) { alert("Please explain your symptoms first."); return; }
    if (!window.confirm("Send report to specialist?")) return;

    try {
        await addDoc(collection(db, "doctor_requests"), {
            userId: user.uid,
            userEmail: user.email,
            sessionId: currentSessionId,
            preview: messages[0]?.text || "No preview",
            status: "pending",
            createdAt: serverTimestamp()
        });
        await addDoc(collection(db, "users", user.uid, "sessions", currentSessionId, "messages"), {
            role: "ai",
            text: "✅ **REQUEST SENT:** A specialist has been notified.",
            createdAt: serverTimestamp()
        });
        alert("Request sent!");
    } catch (error) { console.error(error); alert("Failed."); }
  };

  const handleEmergencyDispatch = () => {
    const targetEmail = emergencyConfig.hospitalEmail || prompt("Enter hospital email:");
    if (targetEmail) {
        alert(`🚨 EMERGENCY REPORT DISPATCHED TO: ${targetEmail}`);
        setShowEmergencyModal(false);
    }
  };

  // --- QUICK START HANDLER ---
  const handleQuickStart = (symptom) => {
     setInput(symptom);
     // Auto-send would require moving logic out of handleSend or using a timeout, 
     // but filling the input is safer for user confirmation.
     const inputField = document.getElementById("chat-input");
     if(inputField) inputField.focus();
  };

  const generatePDF = () => {
    if (messages.length === 0) return;
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(0, 204, 255); 
    doc.setFontSize(22);
    doc.text("REMEDI", 20, 25);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("AI DIAGNOSTIC REPORT", 150, 25);
    doc.setTextColor(0, 0, 0); 
    doc.setFontSize(10);
    doc.text(`Patient: ${user?.email || 'Anonymous'}`, 20, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 55);
    let y = 70; 

    const validMessages = messages.filter(msg => {
       const txt = msg.text.toLowerCase().trim();
       if (txt.length < 3) return false;
       if (txt.includes("request sent") || txt.includes("doctor's note") || txt.includes("emergency_trigger")) return false;
       const chitChat = ["thank you", "thanks", "welcome", "hello", "hi there"];
       if (chitChat.some(phrase => txt.includes(phrase))) return false;
       return true;
    });

    if (validMessages.length === 0) { alert("No clinical data."); return; }

    validMessages.forEach(msg => {
      if (y > 270) { doc.addPage(); y = 20; }
      const isAI = msg.role === 'ai';
      doc.setFont("helvetica", "bold");
      doc.setTextColor(isAI ? 0 : 80, isAI ? 100 : 80, isAI ? 150 : 80);
      doc.text(isAI ? "REMEDI AI ANALYSIS:" : "PATIENT SYMPTOMS:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const cleanText = msg.text.replace(/\*\*/g, '').replace(/🚨 EMERGENCY_TRIGGER 🚨/g, ''); 
      const splitText = doc.splitTextToSize(cleanText, 170); 
      doc.text(splitText, 20, y + 6);
      y += (splitText.length * 6) + 12; 
    });
    doc.save("Remedi_Health_Report.pdf");
  };

  const findNearby = (type) => {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(type + ' near me')}/`, '_blank');
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    const textToSend = input;
    setInput('');
    setIsLoading(true);
    let activeSessionId = currentSessionId;
    try {
      if (!activeSessionId) {
        const sessionRef = await addDoc(collection(db, "users", user.uid, "sessions"), {
          createdAt: serverTimestamp(),
          preview: textToSend.substring(0, 30) + "..." 
        });
        activeSessionId = sessionRef.id;
        setCurrentSessionId(activeSessionId);
      } else {
        const sessionDocRef = doc(db, "users", user.uid, "sessions", activeSessionId);
        await setDoc(sessionDocRef, { preview: textToSend.substring(0, 30) + "..." }, { merge: true });
      }
      await addDoc(collection(db, "users", user.uid, "sessions", activeSessionId, "messages"), {
        role: "user", text: textToSend, createdAt: serverTimestamp()
      });
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: textToSend }),
      });
      const data = await response.json();
      let aiText = data.response || "Error: No response.";
      if (aiText.includes("EMERGENCY_TRIGGER")) {
         setShowEmergencyModal(true);
         aiText = aiText.replace("🚨 EMERGENCY_TRIGGER 🚨", "").trim();
      }
      await addDoc(collection(db, "users", user.uid, "sessions", activeSessionId, "messages"), {
        role: "ai", text: aiText, createdAt: serverTimestamp()
      });
    } catch (error) { console.error(error); setMessages(prev => [...prev, { role: 'ai', text: "System Error." }]); } 
    finally { setIsLoading(false); }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-white font-sans overflow-hidden">
      {/* SETTINGS MODAL */}
      {showSettings && (
         <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-800 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold text-[#00CCFF] mb-4">Emergency Profile</h3>
                <form onSubmit={saveSettings} className="space-y-4">
                    <input className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:border-[#00CCFF] outline-none" 
                        value={emergencyConfig.contactName} onChange={e => setEmergencyConfig({...emergencyConfig, contactName: e.target.value})} placeholder="Primary Contact Name" />
                    <input className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:border-[#00CCFF] outline-none" 
                        value={emergencyConfig.hospitalEmail} onChange={e => setEmergencyConfig({...emergencyConfig, hospitalEmail: e.target.value})} placeholder="Preferred Hospital Email" />
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setShowSettings(false)} className="flex-1 py-3 rounded-xl hover:bg-white/5 border border-white/10">Cancel</button>
                        <button type="submit" className="flex-1 bg-[#00CCFF] text-slate-900 font-bold py-3 rounded-xl hover:scale-105">Save</button>
                    </div>
                </form>
            </div>
         </div>
      )}

      {/* EMERGENCY MODAL */}
      {showEmergencyModal && (
         <div className="fixed inset-0 bg-red-900/90 z-[70] flex items-center justify-center p-4 animate-pulse">
            <div className="bg-white text-red-600 p-8 rounded-2xl w-full max-w-lg shadow-2xl text-center border-4 border-red-600">
                <div className="text-6xl mb-4">🚨</div>
                <h2 className="text-3xl font-black mb-2 uppercase">Emergency Detected</h2>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 text-left">
                    <p className="text-sm text-slate-500 uppercase font-bold mb-1">Dispatching To:</p>
                    <p className="text-lg font-bold text-slate-900">{emergencyConfig.hospitalEmail || "Emergency Services (Pending Input)"}</p>
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={handleEmergencyDispatch} className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-xl shadow-lg uppercase">NOTIFY HOSPITAL NOW</button>
                    <button onClick={() => setShowEmergencyModal(false)} className="text-slate-400 text-sm hover:text-slate-600 underline">Dismiss Alert</button>
                </div>
            </div>
         </div>
      )}

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 md:bg-transparent glass-prism border-r border-white/10 flex flex-col h-full transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0"><Logo /></div>
            <span className="text-white font-bold tracking-wider text-xl">REMEDI</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">X</button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <button onClick={startNewSession} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-[#00CCFF] transition-all border border-white/5 hover:border-white/20 flex items-center gap-2 mb-8 shadow-lg">
            <span className="text-xl font-bold">+</span> New Diagnosis
          </button>
          
          <div className="text-xs font-bold text-slate-500 uppercase mb-3 px-2 tracking-widest">Find Care</div>
          <div className="grid grid-cols-2 gap-2 mb-8 px-1">
            <button onClick={() => findNearby('pharmacy')} className="p-3 rounded-xl bg-[#00CCFF]/10 hover:bg-[#00CCFF]/20 border border-[#00CCFF]/30 flex flex-col items-center gap-1 transition-all">
              <span className="text-xl">💊</span>
              <span className="text-[10px] text-[#00CCFF] font-bold">Pharmacy</span>
            </button>
            <button onClick={() => findNearby('hospital')} className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex flex-col items-center gap-1 transition-all">
              <span className="text-xl">🏥</span>
              <span className="text-[10px] text-red-400 font-bold">Hospital</span>
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 mb-8">
              {/* FIXED: Shortened text to prevent wrap */}
              <button onClick={requestDoctor} className="p-3 rounded-xl bg-[#00CCFF] hover:bg-[#00bfe6] text-slate-900 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105">
                 <span>👨‍⚕️</span> Consult Specialist
              </button>
              <button onClick={startVideoChat} title="Video Chat" className="p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/50 text-purple-300 font-bold flex items-center justify-center transition-all hover:scale-105">
                 <span>📹</span>
              </button>
          </div>

          <div className="text-xs font-bold text-slate-500 uppercase mb-3 px-2 tracking-widest">History</div>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} onClick={() => { setCurrentSessionId(session.id); setIsSidebarOpen(false); }} className={`group w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all border cursor-pointer ${currentSessionId === session.id ? 'bg-[#00CCFF]/20 text-white border-[#00CCFF]/50' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
                <span className="truncate flex-1 pr-2">{session.preview || "Untitled Diagnosis"}</span>
                <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1">🗑️</button>
              </div>
            ))}
            {sessions.length === 0 && <div className="px-2 text-slate-600 text-xs italic">No past records found.</div>}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 shrink-0 flex justify-between items-center">
          <button onClick={handleLogout} className="text-sm text-red-300 hover:text-red-200">Sign Out</button>
          <button onClick={() => setShowSettings(true)} className="text-slate-400 hover:text-[#00CCFF] transition-colors" title="Settings">⚙️</button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10 pt-16 md:pt-0">
        <div className="h-20 min-h-[5rem] border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg">AI Diagnostic Console</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00CCFF] rounded-full animate-pulse"></span>
              <span className="text-xs text-[#00CCFF] tracking-widest uppercase">System Online</span>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={generatePDF} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 md:px-4 rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:scale-105">
              <span>Download Report</span>
            </button>
          )}
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 relative custom-scrollbar">
          
          {/* PREMIUM INTRO: REPLACES BORING TEXT */}
          {!currentSessionId && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center p-4">
               <div className="w-full max-w-3xl">
                  <div className="text-center mb-10">
                     <div className="w-24 h-24 mx-auto mb-6 opacity-90"><Logo animate={true} /></div>
                     <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">System Online</h1>
                     <p className="text-slate-400 text-lg">Select a quick diagnosis or describe your symptoms below.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <button onClick={() => handleQuickStart("I have a severe headache and sensitivity to light.")} className="p-6 bg-slate-800/50 hover:bg-[#00CCFF]/10 border border-white/5 hover:border-[#00CCFF]/30 rounded-2xl transition-all group text-left">
                        <span className="text-2xl mb-2 block">🤕</span>
                        <span className="font-bold text-slate-200 group-hover:text-[#00CCFF]">Head & Neck</span>
                     </button>
                     <button onClick={() => handleQuickStart("I am coughing and having trouble breathing.")} className="p-6 bg-slate-800/50 hover:bg-[#00CCFF]/10 border border-white/5 hover:border-[#00CCFF]/30 rounded-2xl transition-all group text-left">
                        <span className="text-2xl mb-2 block">🫁</span>
                        <span className="font-bold text-slate-200 group-hover:text-[#00CCFF]">Respiratory</span>
                     </button>
                     <button onClick={() => handleQuickStart("I have a high fever and body aches.")} className="p-6 bg-slate-800/50 hover:bg-[#00CCFF]/10 border border-white/5 hover:border-[#00CCFF]/30 rounded-2xl transition-all group text-left">
                        <span className="text-2xl mb-2 block">🤒</span>
                        <span className="font-bold text-slate-200 group-hover:text-[#00CCFF]">Fever / Flu</span>
                     </button>
                     <button onClick={() => handleQuickStart("I have sharp chest pains.")} className="p-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-2xl transition-all group text-left">
                        <span className="text-2xl mb-2 block">🆘</span>
                        <span className="font-bold text-red-200 group-hover:text-red-100">Emergency</span>
                     </button>
                  </div>
               </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && <div className="w-8 h-8 mr-3 mt-1 bg-slate-800 rounded-full p-2 border border-[#00CCFF]/30"><Logo /></div>}
              <div className={`max-w-[85%] p-4 rounded-2xl border ${msg.role === 'user' ? 'bg-[#00CCFF]/10 border-[#00CCFF]/30 text-white rounded-tr-none' : 'bg-white/5 border-white/10 text-slate-200 rounded-tl-none'}`}>
                {msg.role === 'ai' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-slate-500 italic ml-12 text-sm">Analyzing...</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-6 bg-slate-900 border-t border-white/5 shrink-0 z-20">
          <div className="max-w-4xl mx-auto relative">
            <textarea id="chat-input" rows="1" placeholder="Describe your symptoms..." className="w-full bg-slate-800/80 text-white rounded-2xl border border-white/10 px-6 py-4 pr-16 focus:border-[#00CCFF] focus:outline-none resize-none" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyPress} disabled={isLoading} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <button onClick={handleSend} disabled={isLoading} className="p-2 bg-[#00CCFF] rounded-xl text-slate-900 hover:scale-105 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}