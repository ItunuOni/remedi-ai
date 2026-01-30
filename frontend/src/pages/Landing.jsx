import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-slate-900 relative font-sans selection:bg-[#00CCFF] selection:text-slate-900 overflow-x-hidden text-slate-300">
      
      {/* --- ANIMATED BACKGROUND --- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="blob-teal top-[-20%] left-[-10%] opacity-40"></div>
        <div className="blob-yellow bottom-[-20%] right-[-10%] opacity-30 animate-pulse-slow"></div>
        <div className="absolute top-[30%] left-[50%] w-[1000px] h-[1000px] bg-[#00CCFF] rounded-full blur-[200px] opacity-[0.03] -translate-x-1/2"></div>
      </div>

      {/* =========================================
          SECTION 1: HERO (Tighter Bottom Padding)
         ========================================= */}
      <nav className="relative z-50 px-8 py-6 flex justify-between items-center max-w-7xl mx-auto animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 filter drop-shadow-[0_0_8px_rgba(0,204,255,0.5)]"><Logo /></div>
          <span className="font-bold tracking-[0.2em] text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">REMEDI</span>
        </div>
        <Link to="/login" className="px-6 py-2 rounded-full glass-prism text-sm font-bold text-white hover:bg-white/10 transition-all border border-white/5 hover:border-[#00CCFF]/30 hover:shadow-[0_0_15px_rgba(0,204,255,0.3)]">
          Access Portal
        </Link>
      </nav>

      {/* Reduced pb-32 to pb-16 */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-10 pb-16 px-4 text-center">
        <div className="w-64 h-64 mb-10 relative group perspective-1000 animate-fade-in-up">
          <div className="absolute inset-0 bg-[#00CCFF] rounded-full blur-[80px] opacity-30 animate-pulse-slow group-hover:opacity-50 transition-opacity duration-700"></div>
          <div className="relative w-full h-full transform transition-transform duration-700 hover:scale-105 hover:rotate-y-12 hover:rotate-x-6">
            <Logo animate={true} className="w-full h-full drop-shadow-[0_0_30px_rgba(0,204,255,0.6)]" />
          </div>
        </div>

        <h1 className="text-6xl md:text-8xl font-extrabold mb-6 tracking-tight leading-none animate-fade-in-up delay-100">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-400">Medical Clarity.</span><br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00CCFF] to-[#FFFFCC] filter drop-shadow-[0_0_10px_rgba(0,204,255,0.3)]">Instantly.</span>
        </h1>
        
        <p className="text-slate-300 text-xl md:text-2xl max-w-3xl mb-10 leading-relaxed animate-fade-in-up delay-200 font-light">
          Your personal AI health analyst. Explain symptoms privately, receive professional doctor-ready reports, and locate immediate care.
        </p>

        <div className="animate-fade-in-up delay-300">
          <Link to="/login" className="inline-block relative group">
            <div className="absolute -inset-px bg-gradient-to-r from-[#00CCFF] to-[#FFFFCC] rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500 animate-pulse-slow"></div>
            <button className="relative w-full bg-slate-900/80 backdrop-blur-xl border border-white/20 text-white font-bold py-5 px-12 rounded-2xl transition-all active:scale-95 flex items-center gap-4 hover:bg-slate-800/80 hover:border-[#00CCFF]/50 text-lg overflow-hidden">
              {/* Light Sweep Effect on Button */}
              <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-[shimmer_1s_infinite]"></div>
              <span>INITIALIZE SCAN</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#00CCFF] group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </Link>
        </div>
      </div>

      {/* =========================================
          SECTION 2: CORE FEATURES (Tighter Spacing & Holographic Hover)
         ========================================= */}
      {/* Reduced pb-40 to pb-24 */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24 animate-fade-in-up delay-300">
        <h2 className="text-2xl font-bold text-center mb-10 text-white/80 uppercase tracking-widest">System Capabilities</h2>
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Feature Card 1 */}
          <div className="glass-prism p-8 rounded-[2rem] hover:-translate-y-3 transition-all duration-500 border border-white/5 hover:border-[#00CCFF]/30 group relative overflow-hidden shadow-lg hover:shadow-[#00CCFF]/20">
            {/* Holographic Sheen */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
            
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors border border-white/5 group-hover:border-blue-400/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-300 group-hover:text-blue-100 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#00CCFF] transition-colors">Private AI Triage</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Anxiety about symptoms? Get an instant, private analysis. Remedi uses advanced LLMs to understand your condition before you step foot in a clinic.</p>
          </div>

          {/* Feature Card 2 (Hero Card) */}
          <div className="glass-prism p-8 rounded-[2rem] hover:-translate-y-3 transition-all duration-500 border border-white/5 hover:border-[#00CCFF]/50 group relative overflow-hidden shadow-lg hover:shadow-[#00CCFF]/20 z-10 scale-105 bg-[#00CCFF]/[0.02]">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00CCFF]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
            
            <div className="w-14 h-14 bg-[#00CCFF]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#00CCFF]/20 transition-colors border border-white/5 group-hover:border-[#00CCFF]/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#00CCFF] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#00CCFF] transition-colors">Doctor-Ready Reports</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Don't just guess. Generate a professional PDF summary of your symptoms. Makes your doctor's job <span className="text-[#00CCFF] font-bold glow">10x faster</span>.</p>
          </div>

          {/* Feature Card 3 */}
          <div className="glass-prism p-8 rounded-[2rem] hover:-translate-y-3 transition-all duration-500 border border-white/5 hover:border-red-400/30 group relative overflow-hidden shadow-lg hover:shadow-red-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
            
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-500/20 transition-colors border border-white/5 group-hover:border-red-400/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-400 group-hover:text-red-100 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white group-hover:text-red-400 transition-colors">Instant Care Locator</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Immediate action required? Remedi uses precise geolocation to map the nearest open pharmacies and emergency hospital departments instantly.</p>
          </div>
        </div>
      </div>

      {/* =========================================
          SECTION 3: HOW IT WORKS (Reduced spacing)
         ========================================= */}
      {/* Reduced py-32 to py-20 */}
      <div className="relative z-10 py-20 bg-slate-900/50 backdrop-blur-md border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16 text-white tracking-tight">The Remedi Protocol</h2>
          
          <div className="relative">
            {/* Connecting Line with Pulse */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00CCFF]/30 to-transparent -translate-y-1/2 hidden md:block"></div>
            
            <div className="grid md:grid-cols-4 gap-6 relative z-10">
              {[
                { step: "01", title: "Input Data", desc: "Describe symptoms in natural language.", icon: "💬" },
                { step: "02", title: "Neural Analysis", desc: "AI compares against medical databases.", icon: "🧠" },
                { step: "03", title: "Report Gen", desc: "System compiles a clinical PDF draft.", icon: "📄" },
                { step: "04", title: "Care Routing", desc: "GPS locates nearest specialist.", icon: "📍" }
              ].map((item, i) => (
                <div key={i} className="glass-prism p-6 rounded-2xl text-center group hover:-translate-y-2 transition-transform duration-300 bg-slate-900/80 border border-white/5 hover:border-[#00CCFF]/30">
                  <div className="w-10 h-10 mx-auto bg-[#00CCFF] rounded-full flex items-center justify-center text-lg font-bold text-slate-900 mb-4 shadow-[0_0_20px_rgba(0,204,255,0.4)] relative z-20 group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <div className="text-3xl mb-2 grayscale group-hover:grayscale-0 transition-all duration-500">{item.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          SECTION 4: USE CASES (Reduced Spacing)
         ========================================= */}
      {/* Reduced py-32 to py-20 */}
      <div className="relative z-10 py-20 max-w-7xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-12 text-white tracking-tight">Deployment Scenarios</h2>
        
        <div className="grid md:grid-cols-3 md:grid-rows-2 gap-5 h-[700px] md:h-[500px]">
          
          {/* Large Card: The Anxious Parent */}
          <div className="glass-prism p-8 rounded-[2rem] md:col-span-2 md:row-span-2 relative overflow-hidden group border border-white/5 hover:border-[#00CCFF]/20 transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-colors duration-700"></div>
            <h3 className="text-2xl font-bold text-white mb-4">The "Midnight Fever"</h3>
            <p className="text-slate-300 text-lg mb-8 max-w-md">
              It's 2 AM. Your child feels warm. Is it an emergency or just a mild cold?
              <br/><br/>
              Remedi provides an objective analysis instantly, helping you decide whether to rush to the ER or monitor till morning.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-green-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Peace of mind restored
            </div>
          </div>

          {/* Small Card: The Traveler */}
          <div className="glass-prism p-8 rounded-[2rem] relative overflow-hidden group hover:bg-white/5 transition-colors border border-white/5 hover:border-[#00CCFF]/20">
            <h3 className="text-lg font-bold text-white mb-2">The Traveler</h3>
            <p className="text-slate-400 text-xs">In a new city? Don't know where the pharmacy is? Remedi's GPS features work globally.</p>
            <div className="mt-4 flex justify-end transform group-hover:scale-110 transition-transform text-4xl">✈️</div>
          </div>

          {/* Small Card: The Busy Pro */}
          <div className="glass-prism p-8 rounded-[2rem] relative overflow-hidden group hover:bg-white/5 transition-colors border border-white/5 hover:border-[#00CCFF]/20">
            <h3 className="text-lg font-bold text-white mb-2">The Busy Pro</h3>
            <p className="text-slate-400 text-xs">Skip the web search rabbit hole. Get a formatted report to hand to your doctor.</p>
            <div className="mt-4 flex justify-end transform group-hover:scale-110 transition-transform text-4xl">💼</div>
          </div>

        </div>
      </div>

      {/* =========================================
          SECTION 5: TECH SPECS (Reduced Spacing)
         ========================================= */}
      {/* Reduced py-20 to py-16 */}
      <div className="relative z-10 py-16 border-t border-white/5 bg-black/20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl font-bold mb-8 text-white uppercase tracking-widest border-l-4 border-[#00CCFF] pl-4">System Architecture</h2>
          
          <div className="space-y-3">
            <div className="group border border-white/5 rounded-xl p-5 hover:bg-white/5 transition-all cursor-default flex justify-between items-center hover:border-[#00CCFF]/30">
              <div>
                <div className="text-[#00CCFF] font-mono font-bold text-sm mb-1">CORE MODEL</div>
                <div className="text-xs text-slate-400">Powered by Gemini 1.5 Flash Neural Engine.</div>
              </div>
              <span className="text-xs bg-[#00CCFF]/10 text-[#00CCFF] px-2 py-1 rounded border border-[#00CCFF]/20">V 2.5</span>
            </div>

            <div className="group border border-white/5 rounded-xl p-5 hover:bg-white/5 transition-all cursor-default flex justify-between items-center hover:border-green-400/30">
              <div>
                <div className="text-[#00CCFF] font-mono font-bold text-sm mb-1">DATA PRIVACY</div>
                <div className="text-xs text-slate-400">Zero-retention triage. Chat sessions are isolated.</div>
              </div>
              <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20">ENCRYPTED</span>
            </div>

            <div className="group border border-white/5 rounded-xl p-5 hover:bg-white/5 transition-all cursor-default flex justify-between items-center hover:border-purple-400/30">
              <div>
                <div className="text-[#00CCFF] font-mono font-bold text-sm mb-1">OUTPUT FORMAT</div>
                <div className="text-xs text-slate-400">Generates structured clinical drafts for physicians.</div>
              </div>
              <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20">PDF / JSON</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 text-center py-10 border-t border-white/5 bg-slate-900 text-slate-500 text-xs">
        <div className="w-8 h-8 mx-auto mb-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500"><Logo /></div>
        <p className="mb-2">&copy; 2026 Remedi AI Health Systems. Crafted for clarity.</p>
        <p className="opacity-60 text-[10px] max-w-md mx-auto px-4">Disclaimer: Remedi is an AI-assisted triage tool, not a replacement for professional medical diagnosis. In medical emergencies, always contact emergency services immediately.</p>
      </footer>

    </div>
  );
}