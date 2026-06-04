import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { 
  User, Lock, ShieldCheck, AlertCircle, 
  CheckCircle2, Loader2, KeyRound, Mail, 
  Briefcase, Phone, Calendar, Smartphone, 
  Monitor, Globe, Bell, Fingerprint, Activity,
  ToggleLeft, ToggleRight,MapPin
} from 'lucide-react';

export const ProfileSettings = () => {
  const user = useAuthStore((state: any) => state.user);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'security' | 'preferences' | 'sessions'>('security');
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfa_enabled || false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  // --- DYNAMIC DATA STATE ---
  const [sessions, setSessions] = useState<any[]>([]);
  const [lenderName, setLenderName] = useState<string>('Loading...');
  const [branchName, setBranchName] = useState<string>('Loading...');

  // --- PASSWORD STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- INIT DYNAMIC DEVICE & ASSIGNMENT DATA ---
  useEffect(() => {
    // 1. Detect dynamic device details
    const ua = window.navigator.userAgent;
    let os = "Unknown Device";
    if (ua.indexOf("Windows") !== -1) os = "Windows PC";
    else if (ua.indexOf("Mac") !== -1) os = "Mac OS";
    else if (ua.indexOf("Linux") !== -1) os = "Linux";
    else if (ua.indexOf("Android") !== -1) os = "Android";
    else if (ua.indexOf("like Mac") !== -1) os = "iOS";

    let browser = "Web Browser";
    if (ua.indexOf("Edg") !== -1) browser = "Edge";
    else if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
    else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
    else if (ua.indexOf("Safari") !== -1 && ua.indexOf("Chrome") === -1) browser = "Safari";

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Network';
    const isMobile = window.innerWidth < 768 || os === 'Android' || os === 'iOS';

    setSessions([{
      id: 'current-session',
      device: `${os} (${browser})`,
      type: isMobile ? 'mobile' : 'desktop',
      location: timezone.replace('_', ' ').split('/')[1] || timezone,
      status: 'Active Now',
      isCurrent: true
    }]);

    // 2. Fetch the actual Lender and Branch names from the backend
    const fetchAssignmentDetails = async () => {
      if (user?.role === 'Super Admin') {
          setLenderName('Platform Administration');
          setBranchName('Global Access');
          return;
      }

      try {
          // Fetch branches which now safely includes the lender relation
          const res = await api.get(`/branches?lender_id=${user?.lender_id}`);
          const branches = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          
          const myBranch = branches.find((b: any) => b.id === user?.branch_id);
          
          if (myBranch) {
              setBranchName(myBranch.name);
              setLenderName(myBranch.lender?.name || 'Unassigned');
          } else if (branches.length > 0) {
              // Fallback if the user is a Lender Admin not attached to a specific branch
              setBranchName('Headquarters');
              setLenderName(branches[0].lender?.name || 'Unassigned');
          } else {
              setBranchName('Unassigned');
              setLenderName('Unassigned');
          }
      } catch (error) {
          console.error('Failed to load institution details', error);
          setBranchName('Unassigned');
          setLenderName('Unassigned');
      }
    };

    if (user) fetchAssignmentDetails();
  }, [user]);

  // --- PASSWORD STRENGTH LOGIC ---
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strengthScore = calculatePasswordStrength(newPassword);
  const getStrengthColor = () => {
    if (strengthScore <= 25) return 'bg-red-500';
    if (strengthScore <= 50) return 'bg-amber-500';
    if (strengthScore <= 75) return 'bg-blue-500';
    return 'bg-emerald-500';
  };
  const getStrengthLabel = () => {
    if (strengthScore === 0) return '';
    if (strengthScore <= 25) return 'Weak';
    if (strengthScore <= 50) return 'Fair';
    if (strengthScore <= 75) return 'Good';
    return 'Strong';
  };

  // --- ACTIONS ---
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please try again.');
      return;
    }

    if (strengthScore < 75) {
      setErrorMsg('Please choose a stronger password (must include numbers, uppercase, and be 8+ chars).');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.patch('/users/profile/password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      setSuccessMsg(response.data.message || 'Security credentials updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeSession = (id: string, deviceName: string) => {
    if (!window.confirm(`Are you sure you want to revoke and terminate the session for ${deviceName}?`)) return;
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your personal profile, security credentials, and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Read-Only Profile Info & Navigation */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <div className="relative flex flex-col items-center text-center mt-8 pb-6 border-b border-slate-100">
              <div className="w-24 h-24 bg-white text-blue-600 rounded-full flex items-center justify-center font-black text-3xl uppercase border-4 border-white shadow-xl mb-4">
                {user?.first_name?.[0] || 'A'}{user?.last_name?.[0] || ''}
              </div>
              <h2 className="text-xl font-black text-slate-900">{user?.first_name} {user?.last_name}</h2>
              <p className="text-sm font-bold text-slate-500 mb-3">{user?.role || 'Administrator'}</p>
              
              <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200 shadow-sm">
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
              {user?.phone && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Phone Number</p>
                  <div className="flex items-center text-sm font-bold text-slate-700">
                    <Phone size={16} className="mr-2 text-slate-400" /> {user?.phone}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Assigned Institution / Tenant</p>
                <div className="flex items-center text-sm font-bold text-slate-900">
                  <Briefcase size={16} className="mr-2 text-blue-500 shrink-0" /> 
                  <span className="truncate">{lenderName}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-1">Assigned Operational Branch</p>
                <div className="flex items-center text-sm font-bold text-slate-950">
                  <MapPin size={16} className="mr-2 text-indigo-500 shrink-0" /> 
                  <span className="truncate">{branchName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-3">
            <nav className="flex flex-col space-y-1">
              <button 
                onClick={() => setActiveTab('security')}
                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all outline-none ${activeTab === 'security' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <KeyRound size={18} /> <span>Security & Password</span>
              </button>
              <button 
                onClick={() => setActiveTab('preferences')}
                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all outline-none ${activeTab === 'preferences' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Bell size={18} /> <span>Notifications & Preferences</span>
              </button>
              <button 
                onClick={() => setActiveTab('sessions')}
                className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all outline-none ${activeTab === 'sessions' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Activity size={18} /> <span>Active Sessions ({sessions.length})</span>
              </button>
            </nav>
          </div>

        </div>

        {/* Right Column: Dynamic Content */}
        <div className="lg:col-span-8 space-y-6">
          
          {activeTab === 'security' && (
            <>
              {/* Password Update Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-[#0B1121] p-6 text-white flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">Update Password</h3>
                    <p className="text-slate-400 text-xs font-medium mt-0.5">Ensure your account uses a long, complex password.</p>
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

                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1.5">Current Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                          type="password" required
                          value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900 placeholder-slate-400"
                          placeholder="Enter current password"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <label className="text-sm font-bold text-slate-700 block mb-1.5 flex justify-between">
                        <span>New Password</span>
                        <span className={`text-xs ${getStrengthLabel() === 'Strong' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {getStrengthLabel()}
                        </span>
                      </label>
                      <div className="relative group mb-3">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                          type="password" required minLength={8}
                          value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900 placeholder-slate-400"
                          placeholder="Must be at least 8 characters"
                        />
                      </div>
                      
                      {/* Password Strength Meter */}
                      <div className="flex space-x-1 h-1.5 mb-1">
                        <div className={`flex-1 rounded-full transition-colors ${strengthScore >= 25 ? getStrengthColor() : 'bg-slate-200'}`}></div>
                        <div className={`flex-1 rounded-full transition-colors ${strengthScore >= 50 ? getStrengthColor() : 'bg-slate-200'}`}></div>
                        <div className={`flex-1 rounded-full transition-colors ${strengthScore >= 75 ? getStrengthColor() : 'bg-slate-200'}`}></div>
                        <div className={`flex-1 rounded-full transition-colors ${strengthScore >= 100 ? getStrengthColor() : 'bg-slate-200'}`}></div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Use a mix of uppercase letters, numbers, and special characters.</p>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1.5">Confirm New Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                          type="password" required minLength={8}
                          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-semibold text-slate-900 placeholder-slate-400 focus:ring-2 ${
                            confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                          }`}
                          placeholder="Retype your new password"
                        />
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                      <button 
                        type="submit" 
                        disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword || strengthScore < 75}
                        className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none outline-none"
                      >
                        {isSubmitting ? (
                          <><Loader2 size={18} className="animate-spin" /> <span>Updating...</span></>
                        ) : (
                          <><ShieldCheck size={18} /> <span>Save New Password</span></>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* 2FA Settings Card */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
                    <Fingerprint size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Two-Factor Authentication (2FA)</h3>
                    <p className="text-slate-500 text-sm font-medium mt-1 max-w-md">Add an extra layer of security to your account. We'll ask for a code from your authenticator app when you log in.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMfaEnabled(!mfaEnabled)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold transition-colors outline-none shrink-0 ${
                    mfaEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mfaEnabled ? <ToggleRight size={20} className="text-emerald-600"/> : <ToggleLeft size={20} className="text-slate-400"/>}
                  <span>{mfaEnabled ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'preferences' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 md:p-8 border-b border-slate-100">
                <h3 className="font-black text-xl text-slate-900 mb-1">Communication Preferences</h3>
                <p className="text-slate-500 text-sm font-medium">Control how and when you receive system alerts.</p>
              </div>
              
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900">Email Notifications</h4>
                    <p className="text-xs text-slate-500 mt-1">Receive daily summaries and critical security alerts.</p>
                  </div>
                  <button onClick={() => setEmailNotifs(!emailNotifs)} className={`outline-none transition-colors ${emailNotifs ? 'text-blue-600' : 'text-slate-300'}`}>
                    {emailNotifs ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900">SMS / Text Alerts</h4>
                    <p className="text-xs text-slate-500 mt-1">Receive text messages for high-risk system activities.</p>
                  </div>
                  <button onClick={() => setSmsNotifs(!smsNotifs)} className={`outline-none transition-colors ${smsNotifs ? 'text-blue-600' : 'text-slate-300'}`}>
                    {smsNotifs ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 md:p-8 border-b border-slate-100">
                <h3 className="font-black text-xl text-slate-900 mb-1">Active Sessions</h3>
                <p className="text-slate-500 text-sm font-medium">Devices that are currently logged into your account.</p>
              </div>
              
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <div key={session.id} className="p-6 md:p-8 flex items-start justify-between hover:bg-slate-50/40 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-2xl ${session.isCurrent ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        {session.type === 'desktop' ? <Monitor size={20} /> : <Smartphone size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 flex items-center">
                          {session.device} 
                          {session.isCurrent && (
                            <span className="ml-3 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-black tracking-widest rounded-md">Current</span>
                          )}
                        </h4>
                        <div className="flex items-center text-xs text-slate-500 mt-1.5 space-x-3">
                          <span className="flex items-center"><Globe size={12} className="mr-1"/> {session.location}</span>
                          <span className="flex items-center"><Activity size={12} className="mr-1"/> {session.status}</span>
                        </div>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button 
                        onClick={() => handleRevokeSession(session.id, session.device)}
                        className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors outline-none"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};