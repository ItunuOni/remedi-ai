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
  
  // Features State
  const [showSettings, setShowSettings] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  
  // Status: idle | sending | success
  const [dispatchStatus, setDispatchStatus] = useState("idle"); 

  // Emergency Profile State (NOW INCLUDES ADDRESS & CONDITIONS)
  const [emergencyConfig, setEmergencyConfig] = useState({ 
    contactName: '', 
    contactPhone: '',
    hospitalName: '',
    hospitalEmail: '',
    homeAddress: '',       
    medicalConditions: '' 
  });
  
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
        alert("✅ Emergency Profile Updated Successfully");
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

  // --- LOUD DEBUGGING VERSION (With Auto-Fill Safety) ---
  const handleEmergencyDispatch = async () => {
    alert("STEP 1: Button Clicked. Checking Config..."); 

    const targetEmail = emergencyConfig.hospitalEmail;
    
    if (!targetEmail) {
        alert("⚠️ STOP: No hospital email found in settings.");
        setShowEmergencyModal(false);
        setShowSettings(true); 
        return;
    }

    alert(`STEP 2: Config Found. Sending to: ${targetEmail}`); 
    setDispatchStatus("sending");

    try {
        // SAFETY: If address/conditions are empty, send "Not Provided" so server doesn't crash
        const payload = {
            patient_email: user.email,
            hospital_email: targetEmail,
            contact_name: emergencyConfig.contactName || "Unknown Contact",
            contact_phone: emergencyConfig.contactPhone || "No Phone",
            home_address: emergencyConfig.homeAddress || "Address Not Provided",
            medical_conditions: emergencyConfig.medicalConditions || "None Listed"
        };

        console.log("SENDING PAYLOAD:", payload);

        const response = await fetch(`${RAW_URL}/emergency-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert(`STEP 3: Response Received. Status: ${response.status}`); 

        if (response.ok) {
            setDispatchStatus("success");
            alert("✅ SUCCESS: Server accepted the alert!");
            setShowEmergencyModal(false);
        } else {
            const errorText = await response.text();
            throw new Error(`Server rejected it: ${errorText}`);
        }

    } catch (err) {
        alert(`❌ FAILURE: ${err.message}`); 
        console.error("DISPATCH ERROR:", err);
        
        // Fallback
        alert("⚠️ Switching to Manual Email Fallback...");
        const mailtoLink = `mailto:${targetEmail}?subject=URGENT&body=Emergency`;
        window.location.href = mailtoLink; 
        
        setDispatchStatus("success");
        setShowEmergencyModal(false);
    } finally {
        setDispatchStatus("idle");
    }
  };

  const handleQuickStart = (symptom) => {
     setInput(symptom);
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
    
    if (emergencyConfig.contactName) {
        doc.text(`Emergency Contact: ${emergencyConfig.contactName} (${emergencyConfig.contactPhone})`, 20, 60);
    }

    let y = 75; 

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
      
      {/* --- SETTINGS FORM --- */}
      {showSettings && (
         <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh]">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">⚙️</span>
                    <h3 className="text-xl font-bold text-white">Emergency Profile</h3>
                </div>
                <p className="text-slate-400 text-sm mb-6">Configure specific hospital details for rapid dispatch.</p>

                <form onSubmit={saveSettings} className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-xs uppercase text-[#00CCFF] font-bold tracking-widest">Patient Details</label>
                        <input className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-[#00CCFF] outline-none text-sm" 
                            value={emergencyConfig.homeAddress} onChange={e => setEmergencyConfig({...emergencyConfig, homeAddress: e.target.value})} placeholder="Home Address (e.g., 12 Lekki Phase 1)" required />
                        <input className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-[#00CCFF] outline-none text-sm" 
                            value={emergencyConfig.medicalConditions} onChange={e => setEmergencyConfig({...emergencyConfig, medicalConditions: e.target.value})} placeholder="Existing Conditions (e.g. Asthma, Diabetes, None)" />
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs uppercase text-[#00CCFF] font-bold tracking-widest">Primary Contact</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input className="bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-[#00CCFF] outline-none text-sm" 
                                value={emergencyConfig.contactName} onChange={e => setEmergencyConfig({...emergencyConfig, contactName: e.target.value})} placeholder="Full Name" required />
                            <input className="bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-[#00CCFF] outline-none text-sm" 
                                value={emergencyConfig.contactPhone} onChange={e => setEmergencyConfig({...emergencyConfig, contactPhone: e.target.value})} placeholder="Phone Number" type="tel" required />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="text-xs uppercase text-[#00CCFF] font-bold tracking-widest">Preferred Care Facility</label>
                        <input className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-[#00CCFF] outline-none text-sm" 
                            value={emergencyConfig.hospitalName} onChange={e => setEmergencyConfig({...emergencyConfig, hospitalName: e.target.value})} placeholder="Hospital / Clinic Name" />
                        <input className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-white focus:border-[#00CCFF] outline-none text-sm" 
                            value={emergencyConfig.hospitalEmail} onChange={e => setEmergencyConfig({...emergencyConfig, hospitalEmail: e.target.value})} placeholder="Hospital Official Email" type="email" required />
                    </div>
                    <button type="submit" className="w-full bg-[#00CCFF] text-slate-900 font-bold py-4 rounded-xl hover:scale-105 transition-transform">Save Profile</button>
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
                    <p className="text-lg font-bold text-slate-900">{emergencyConfig.hospitalName || "Emergency Services"}</p>
                </div>
                <button onClick={handleEmergencyDispatch} className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-xl shadow-lg uppercase mb-3">NOTIFY HOSPITAL NOW</button>
                <button onClick={() => setShowEmergencyModal(false)} className="text-slate-400 text-sm hover:text-slate-600 underline">Dismiss Alert</button>
            </div>
         </div>
      )}

      {/* SIDEBAR (Responsive) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 md:bg-transparent glass-prism border-r border-white/10 flex flex-col h-full transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0"><Logo /></div>
            <span className="text-white font-bold tracking-wider text-xl">REMEDI</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">✕</button>
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
        {/* MOBILE HEADER -