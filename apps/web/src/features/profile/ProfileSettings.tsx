import React, { useState } from 'react';
import { api } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { 
  User, Lock, ShieldCheck, AlertCircle, 
  CheckCircle2, Loader2, KeyRound, Mail, Briefcase 
} from 'lucide-react';

export const ProfileSettings = () => {
  const user = useAuthStore((state: any) => state.user);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please try again.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Your new password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.patch('/users/profile/password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      setSuccessMsg(response.data.message || 'Password updated securely.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-10">
      
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-slate-500 font-medium mt-1">Manage your personal profile and security credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Read-Only Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-2xl uppercase border-4 border-white shadow-md mb-4">
                {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || ''}
              </div>
              <h2 className="text-xl font-black text-slate-900">{user?.first_name} {user?.last_name}</h2>
              <p className="text-sm font-bold text-slate-500">{user?.role || 'Administrator'}</p>
              
              <div className="mt-4 inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest rounded-full border border-emerald-100">
                <ShieldCheck size={14} className="mr-1.5" /> Account Active
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Official Email</p>
                <div className="flex items-center text-sm font-bold text-slate-700">
                  <Mail size={16} className="mr-2 text-slate-400" /> {user?.email}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Institution / Branch</p>
                <div className="flex items-center text-sm font-bold text-slate-700">
                  <Briefcase size={16} className="mr-2 text-slate-400" /> {user?.lender_id ? 'Assigned Branch' : 'System Administration'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Security & Password Update */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#0B1121] p-6 text-white flex items-center space-x-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Security Credentials</h3>
                <p className="text-slate-400 text-xs font-medium">Update your temporary or current password here.</p>
              </div>
            </div>

            <div className="p-8">
              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex items-center animate-fade-in">
                  <AlertCircle size={18} className="mr-2 shrink-0" /> {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold flex items-center animate-fade-in">
                  <CheckCircle2 size={18} className="mr-2 shrink-0" /> {successMsg}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Current Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                      type="password" required
                      value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900 placeholder-slate-400"
                      placeholder="Enter your current or temporary password"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="password" required minLength={8}
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold text-slate-900 placeholder-slate-400"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Confirm New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                    <input 
                      type="password" required minLength={8}
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold text-slate-900 placeholder-slate-400"
                      placeholder="Retype your new password"
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none outline-none"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> <span>Updating Security...</span></>
                    ) : (
                      <><ShieldCheck size={18} /> <span>Save New Password</span></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};