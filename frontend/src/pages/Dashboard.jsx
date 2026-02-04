import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) { setUser(currentUser); } else { navigate('/'); }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "sessions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(loadedSessions);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !currentSessionId) { setMessages([]); return; }
    const q = query(collection(db, "users", user.uid, "sessions", currentSessionId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => doc.data());
      setMessages(msgs);
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
    if (!window.confirm("Are you sure you want to delete this diagnosis record? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "sessions", sessionId));
      if (currentSessionId === sessionId) { startNewSession(); }
    } catch (err) { console.error(err); alert("Failed to delete record."); }
  };

  const requestDoctor = async () => {
    if (!currentSessionId || messages.length === 0) {
        alert("Please explain your symptoms to the AI first.");
        return;
    }
    if (!window.confirm("This will send your chat history to a licensed specialist for review. Continue?")) return;

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
            text: "✅ **REQUEST SENT:** A specialist has been notified. You will receive a response here shortly.",
            createdAt: serverTimestamp()
        });
        alert("Request sent successfully!");
    } catch (error) {
        console.error(error);
        alert("Failed to send request.");
    }
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
    doc.text(`Patient Reference: ${user?.email || 'Anonymous'}`, 20, 50);
    doc.text(`Report Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 60, 190, 60);
    let y = 70; 
    
    // FILTER: Ignore short "thank you" messages in PDF
    const validMessages = messages.filter(msg => {
       const txt = msg.text.toLowerCase();
       return txt.length > 5 && !txt.includes("thank you") && !txt.includes("you are welcome");
    });

    validMessages.forEach(msg => {
      if (y > 270) { doc.addPage(); y = 20; }
      const isAI = msg.role === 'ai';
      const role = isAI ? "REMEDI AI ANALYSIS:" : "PATIENT SYMPTOMS:";
      const color = isAI ? [0, 100, 150] : [80, 80, 80];
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...color);
      doc.text(role, 20, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const cleanText = msg.text.replace(/\*\*/g, '').replace(/\*/g, '•');
      const splitText = doc.splitTextToSize(cleanText, 170); 
      doc.text(splitText, 20, y + 6);
      y += (splitText.length * 6) + 12; 
    });
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Disclaimer: This report is AI-generated and does not constitute a formal medical diagnosis. Please consult a doctor.", 20, 290);
    doc.save("Remedi_Health_Report.pdf");
  };

  const findNearby = (type) => {
    const query = type === 'pharmacies' ? 'pharmacies near me' : 'hospitals near me';
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}/`, '_blank');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!user) return;
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
        role: "user",
        text: textToSend,
        createdAt: serverTimestamp()
      });
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await response.json();
      const aiText = data.response || "Error: No response from AI.";
      await addDoc(collection(db, "users", user.uid, "sessions", activeSessionId, "messages"), {
        role: "ai",
        text: aiText,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', text: "System Error: Neural Core Unreachable." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-white font-sans overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="blob-teal top-[-20%] left-[-10%] opacity-20"></div>
        <div className="blob-yellow bottom-[-20%] right-[-10%] opacity-20"></div>
      </div>

      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-slate-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8"><Logo /></div>
           <span className="text-white font-bold tracking-wider text-lg">REMEDI</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>

      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 md:bg-transparent glass-prism border-r border-white/10 flex flex-col h-full 
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="h-20 min-h-[5rem] flex items-center justify-between px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0"><Logo /></div>
            <span className="text-white font-bold tracking-wider text-xl">REMEDI</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <button onClick={startNewSession} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-[#00CCFF] transition-all border border-white/5 hover:border-white/20 flex items-center gap-2 mb-8 shadow-lg">
            <span className="text-xl font-bold">+</span> New Diagnosis
          </button>
          
          <div className="text-xs font-bold text-slate-500 uppercase mb-3 px-2 tracking-widest">Find Care</div>
          <div className="grid grid-cols-2 gap-2 mb-8 px-1">
            <button onClick={() => findNearby('pharmacies')} className="p-3 rounded-xl bg-[#00CCFF]/10 hover:bg-[#00CCFF]/20 border border-[#00CCFF]/30 flex flex-col items-center gap-1 transition-all">
              <span className="text-xl">💊</span>
              <span className="text-[10px] text-[#00CCFF] font-bold">Pharmacy</span>
            </button>
            <button onClick={() => findNearby('hospitals')} className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex flex-col items-center gap-1 transition-all">
              <span className="text-xl">🏥</span>
              <span className="text-[10px] text-red-400 font-bold">Hospital</span>
            </button>
          </div>

          <button onClick={requestDoctor} className="w-full p-3 rounded-xl bg-[#00CCFF] hover:bg-[#00bfe6] text-slate-900 font-bold text-sm mb-8 flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105">
             <span>👨‍⚕️</span> Verify with Specialist
          </button>

          <div className="text-xs font-bold text-slate-500 uppercase mb-3 px-2 tracking-widest">History</div>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} onClick={() => { setCurrentSessionId(session.id); setIsSidebarOpen(false); }} className={`group w-full flex items-center justify-between p-3 rounded-lg text-sm transition-all border cursor-pointer ${currentSessionId === session.id ? 'bg-[#00CCFF]/20 text-white border-[#00CCFF]/50' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}>
                <span className="truncate flex-1 pr-2">{session.preview || "Untitled Diagnosis"}</span>
                <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1" title="Delete Record">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
            {sessions.length === 0 && <div className="px-2 text-slate-600 text-xs italic">No past records found.</div>}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm text-red-300 hover:text-red-200">Sign Out</button>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#00CCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="hidden md:inline">Download Report</span>
              <span className="md:hidden">PDF</span>
            </button>
          )}
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6 relative custom-scrollbar">
          {!currentSessionId && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="max-w-2xl w-full glass-prism rounded-2xl p-6 md:p-10 text-center border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6"><Logo animate={true} /></div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 capitalize">
                  Hi {user?.email?.split('@')[0] || "there"}, I'm here to help.
                </h3>
                <p className="text-slate-400 text-base md:text-lg leading-relaxed">
                  Tell me how you're feeling today. To give you the best advice, try to include how long you've felt this way and how strong the pain is.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 md:w-10 md:h-10 mr-3 mt-1 flex-shrink-0 bg-slate-800 rounded-full p-2 border border-[#00CCFF]/30"><Logo /></div>
              )}
              <div className={`max-w-[85%] p-4 rounded-2xl backdrop-blur-md border ${msg.role === 'user' ? 'bg-[#00CCFF]/10 border-[#00CCFF]/30 text-white rounded-tr-none whitespace-pre-wrap' : 'bg-white/5 border-white/10 text-slate-200 rounded-tl-none'}`}>
                {msg.role === 'ai' ? (
                  <ReactMarkdown components={{
                      strong: ({node, ...props}) => <span className="font-bold text-[#00CCFF]" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 space-y-2 mt-2" {...props} />,
                      li: ({node, ...props}) => <li className="marker:text-[#00CCFF] pl-1" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                    }}>{msg.text}</ReactMarkdown>
                ) : (msg.text)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="w-8 h-8 md:w-10 md:h-10 mr-3 mt-1 flex-shrink-0 bg-slate-800 rounded-full p-2 border border-[#00CCFF]/30 animate-pulse"><Logo /></div>
              <div className="bg-white/5 border border-white/10 text-slate-400 p-4 rounded-2xl rounded-tl-none italic text-sm">Analyzing symptoms...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-6 bg-slate-900 border-t border-white/5 shrink-0 z-20">
          <div className="max-w-4xl mx-auto relative group">
            <textarea
              id="chat-input"
              rows="1"
              placeholder="Symptoms:"
              className="w-full bg-slate-800/80 text-white placeholder-slate-500 rounded-2xl border border-white/10 px-6 py-4 pr-16 focus:outline-none focus:border-[#00CCFF] focus:ring-1 focus:ring-[#00CCFF] transition-all shadow-lg resize-none overflow-hidden leading-tight flex items-center"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              style={{ minHeight: '56px' }}
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              <button 
                onClick={handleSend} 
                disabled={isLoading} 
                className="p-2 bg-[#00CCFF] rounded-xl text-slate-900 hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,204,255,0.3)] disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}