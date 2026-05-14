import { useState } from 'react';
import useAuthStore from '../../store/authStore';

export const ProfileSettings = () => {
  const user = useAuthStore((state: any) => state.user);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
        <p className="text-slate-500">Manage your personal information and security preferences.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-blue-200 uppercase">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user?.first_name} {user?.last_name}</h2>
              <p className="text-sm text-slate-500 font-medium">{user?.role} • {user?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            {isEditing ? 'Cancel Edit' : 'Update Profile'}
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Email Address</label>
            <p className="text-slate-900 font-semibold p-3 bg-slate-50 rounded-xl border border-slate-100">{user?.email}</p>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Institutional Role</label>
            <p className="text-slate-900 font-semibold p-3 bg-slate-50 rounded-xl border border-slate-100">{user?.role}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Lender ID</label>
            <p className="text-slate-900 font-mono text-xs p-3 bg-slate-50 rounded-xl border border-slate-100 truncate">{user?.lender_id}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Branch Context</label>
            <p className="text-slate-900 font-semibold p-3 bg-slate-50 rounded-xl border border-slate-100">
              {user?.branch_id || 'Global / Unassigned'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-6">
        <h3 className="text-lg font-bold text-slate-900">Security & Privacy</h3>
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">🔐</div>
            <div>
              <p className="font-bold text-blue-900">Two-Factor Authentication</p>
              <p className="text-sm text-blue-700/70">Enhance your account security with MFA.</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200">
            Enable
          </button>
        </div>
      </div>
    </div>
  );
};