import React, { useState } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { Mail, Lock, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

export const LoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const setAuth = useAuthStore(state => state.setAuth);
  
  // State initialized as empty strings for security
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Save both user data (lender_id, role) and JWT to the persistent store
      setAuth(response.data.user, response.data.access_token);
      
      onLogin();
    } catch (err) {
      alert('Login failed. Please check your credentials or contact your administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-blue-500/30">
      
      {/* Left Panel: Corporate Branding & Graphic (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0B1121] overflow-hidden flex-col justify-between p-12 lg:p-16">
        {/* Abstract Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 to-transparent z-0"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] z-0"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0B1121] to-transparent z-0"></div>
        
        {/* Top Logo */}
        <div className="relative z-10 flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            Mogi<span className="text-slate-400 font-medium">Fintech</span>
          </span>
        </div>

        {/* Center Marketing Copy */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Enterprise Credit<br/>
            <span className="text-blue-500">Infrastructure.</span>
          </h1>
          <p className="text-lg text-slate-400 font-medium leading-relaxed">
            Seamlessly manage loan applications, multi-branch disbursements, and regulatory registry compliance from one unified SaaS platform.
          </p>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 flex items-center text-sm text-slate-500 font-medium">
          &copy; 2026 Mogitech Global Ltd. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 md:px-24 lg:px-32 relative bg-slate-50 lg:bg-white">
        
        {/* Mobile Header (Only visible when Left Panel is hidden) */}
        <div className="lg:hidden flex justify-center items-center space-x-2 mb-12">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <span className="text-3xl font-black tracking-tight text-slate-900">
            Mogi<span className="text-slate-400 font-medium">Fintech</span>
          </span>
        </div>
        
        <div className="w-full max-w-md mx-auto">
          {/* Form Header */}
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Sign in to your institutional workspace to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Corporate Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  type="email" 
                  value={email} 
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white lg:bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder-slate-400 shadow-sm" 
                  placeholder="name@institution.com"
                  required
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <a href="#" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors outline-none focus:underline">
                  Forgot Password?
                </a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password} 
                  autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white lg:bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder-slate-400 shadow-sm" 
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed outline-none focus:ring-4 focus:ring-blue-500/30"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Mobile Footer */}
          <div className="lg:hidden mt-12 text-center">
            <p className="text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} Mogitech Global Ltd.<br/>All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};