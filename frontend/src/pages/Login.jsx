import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import Logo from '../components/Logo'; 

// 🛡️ SECURITY: DUPLICATE YOUR DOCTOR LIST HERE
// This ensures the Login page knows exactly where to send you.
const AUTHORIZED_DOCTORS = [
  "oniitunu804@gmail.com", 
  "doctor@remedi.ng",
  "test@doctor.com" 
];

export default function Login() {
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // --- THE SMART TRAFFIC CONTROLLER ---
  const redirectUser = (userEmail) => {
    if (AUTHORIZED_DOCTORS.includes(userEmail)) {
      console.log("👨‍⚕️ Doctor identified. Redirecting to Medical Portal...");
      navigate('/doctor'); 
    } else {
      console.log("👤 Patient identified. Redirecting to Dashboard...");
      navigate('/dashboard'); 
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(''); 

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }
      // CHECK EMAIL AND REDIRECT
      redirectUser(userCredential.user.email);
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // CHECK EMAIL AND REDIRECT
      redirectUser(result.user.email);
    } catch (err) {
      setError("Google Sign-In Failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-slate-900 overflow-hidden">
      
      {/* Background Orbs */}
      <div className="blob-teal w-[500px] h-[500px] top-[-10%] left-[-10%] opacity-50"></div>
      <div className="blob-yellow w-[400px] h-[400px] bottom-[-10%] right-[-10%] opacity-40"></div>

      {/* The Glass Card */}
      <div className="glass-prism rounded-2xl p-10 max-w-md w-full relative z-10 mx-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4 hover:scale-110 transition-transform">
            <div className="w-16 h-16 mx-auto">
               <Logo animate={true} /> 
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Patient Access'}
          </h2>
          <p className="text-blue-200 text-sm">
            {isLogin ? 'Securely access your health records.' : 'Create your secure AI profile.'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00CCFF] focus:ring-1 focus:ring-[#00CCFF] transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00CCFF] focus:ring-1 focus:ring-[#00CCFF] transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#00CCFF] hover:bg-[#00A0A8] text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-teal-500/20 transition-all active:scale-95 mt-4"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* --- OR DIVIDER --- */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-slate-500">Or continue with</span>
          </div>
        </div>

        {/* --- GOOGLE BUTTON --- */}
        <button 
          onClick={handleGoogleLogin}
          type="button" 
          className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95"
        >
          {/* Google G Logo SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>

        {/* Toggle Login/Signup */}
        <div className="mt-8 text-center space-y-4">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-200 hover:text-white transition-colors"
          >
            {isLogin ? "New to Remedi? " : "Already have an account? "}
            <span className="text-[#00CCFF] font-bold underline decoration-transparent hover:decoration-[#00CCFF] transition-all">
              {isLogin ? "Create Account" : "Sign In"}
            </span>
          </button>
          
          {/* DOCTOR LOGIN LINK - SUBTLE & PROFESSIONAL */}
          <div className="border-t border-white/10 pt-4">
             <Link to="/doctor" className="text-xs text-slate-500 hover:text-[#00CCFF] transition-colors flex items-center justify-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Medical Staff Access
             </Link>
          </div>
        </div>

      </div>
    </div>
  );
}