import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { Mail, Lock, Loader2, ArrowRight, Shield } from 'lucide-react';
import { Logo } from '../components/Logo';

export const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const setAuth = useAuthStore(state => state.setAuth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Trigger entrance animations when the component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      setAuth(response.data.user, response.data.access_token);
      onLogin();
    } catch (err) {
      alert('Login failed. Please check your credentials or contact your administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Custom Animation Keyframes 
        Injected here to guarantee they work without requiring tailwind.config edits 
      */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        .animate-entrance {
          opacity: 0;
          animation: fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        
        .animate-ambient {
          animation: ambientPulse 8s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-[100dvh] flex bg-[#F8FAFC] font-sans selection:bg-blue-500/30">
        
        {/* LEFT PANEL: Enterprise Branding (Hidden on Mobile) */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative bg-[#0B1121] overflow-hidden flex-col justify-between p-12 xl:p-20 border-r border-slate-800/80 shadow-[inset_-20px_0_40px_rgba(0,0,0,0.2)]">
          
          {/* Architectural Background Effects */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
          
          {/* Ambient Glowing Orbs */}
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-ambient"></div>
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-ambient" style={{ animationDelay: '4s' }}></div>
          
          {/* Top Logo */}
          <div className={`relative z-10 transition-opacity duration-1000 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
            <Logo />
          </div>

          {/* Center Marketing Copy */}
          <div className="relative z-10 max-w-lg mt-12">
            <div className={`inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-full mb-8 backdrop-blur-md animate-entrance delay-100`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[11px] font-black text-blue-400 tracking-widest uppercase">Core System Online</span>
            </div>
            
            <h1 className={`text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15] mb-6 animate-entrance delay-200`}>
              Enterprise Credit<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-emerald-400 drop-shadow-sm">
                Infrastructure.
              </span>
            </h1>
            
            <p className={`text-lg text-slate-400 font-medium leading-relaxed max-w-md animate-entrance delay-300`}>
              Seamlessly manage multi-branch disbursements, KYC compliance, and loan origination from one unified operating system.
            </p>
          </div>

          {/* Bottom Footer */}
          <div className={`relative z-10 flex items-center justify-between text-sm text-slate-500 font-medium pt-8 border-t border-slate-800/50 animate-entrance delay-400`}>
            <p>&copy; {new Date().getFullYear()} Mogitech Global Ltd.</p>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white transition-colors duration-300">Support</a>
              <a href="#" className="hover:text-white transition-colors duration-300 flex items-center gap-1.5">
                System Status
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Login Form */}
        <div className="w-full lg:w-[55%] xl:w-1/2 flex flex-col justify-center px-6 sm:px-12 md:px-24 xl:px-32 relative bg-white lg:rounded-l-3xl lg:-ml-6 z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.05)]">
          
          {/* Mobile Header (Only visible when Left Panel is hidden) */}
          <div className={`lg:hidden flex flex-col items-center mb-10 mt-8 animate-entrance`}>
            <div className="flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200/80 shrink-0 mb-5">
              <img src="/favicon.ico" alt="MogiLend Icon" className="w-9 h-9 object-contain scale-110" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold tracking-tight">
                <span className="text-slate-900">Mogi</span><span className="text-emerald-600">Lend</span>
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1.5">Lend Smart. Grow Together.</p>
            </div>
          </div>
          
          <div className="w-full max-w-md mx-auto">
            {/* Form Header */}
            <div className={`mb-10 text-center lg:text-left animate-entrance delay-100`}>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Welcome Back</h2>
              <p className="text-slate-500 font-medium text-[15px]">Sign in to your institutional workspace to continue.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Email Field */}
              <div className={`space-y-1.5 animate-entrance delay-200`}>
                <label className="text-[13px] font-bold text-slate-700 ml-1">Corporate Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300 z-10" size={20} />
                  <input 
                    type="email" 
                    value={email} 
                    autoComplete="email"
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-[3px] focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 font-medium text-slate-900 placeholder-slate-400 hover:border-slate-300 hover:bg-slate-50/50" 
                    placeholder="name@institution.com"
                    required
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div className={`space-y-1.5 animate-entrance delay-300`}>
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[13px] font-bold text-slate-700">Password</label>
                  <a href="#" className="text-[13px] font-bold text-blue-600 hover:text-blue-700 transition-colors outline-none focus:underline">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-300 z-10" size={20} />
                  <input 
                    type="password" 
                    value={password} 
                    autoComplete="current-password"
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-[3px] focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all duration-300 font-medium text-slate-900 placeholder-slate-400 hover:border-slate-300 hover:bg-slate-50/50" 
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className={`pt-4 animate-entrance delay-400`}>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-[#0B1121] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-slate-900/10 hover:bg-blue-600 hover:shadow-blue-600/20 active:scale-[0.98] transition-all duration-300 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed outline-none focus:ring-4 focus:ring-slate-900/20 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin text-blue-400" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Security Badge */}
            <div className={`mt-10 flex items-center justify-center space-x-2 text-slate-400 animate-entrance delay-400`}>
              <Shield size={14} className="text-emerald-500" />
              <span className="text-xs font-semibold tracking-wide">Bank-grade Security</span>
            </div>

            {/* Mobile Footer */}
            <div className={`lg:hidden mt-12 text-center pb-8 animate-entrance delay-400`}>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                &copy; {new Date().getFullYear()} Mogitech Global Ltd.<br/>All rights reserved.
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};