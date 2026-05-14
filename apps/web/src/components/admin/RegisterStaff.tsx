import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import useAuthStore from '../../store/authStore';

export const RegisterStaff = () => {
  const activeUser = useAuthStore((state: any) => state.user);
  
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'Loan Officer', // Default role
    branch_id: activeUser?.branch_id || '', 
  });

  // Fetch branches dynamically so the Admin can assign the staff member to a specific office
  useEffect(() => {
    const fetchBranches = async () => {
      const activeLenderId = activeUser?.lender_id;
      if (!activeLenderId) return;

      try {
        const response = await api.get(`/branches?lender_id=${activeLenderId}`);
        setBranches(response.data);
      } catch (error) {
        console.error('Failed to load branches:', error);
      }
    };
    fetchBranches();
  }, [activeUser?.lender_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Strict tenant enforcement
    const payload = {
      ...formData,
      lender_id: activeUser?.lender_id,
    };

    try {
      await api.post('/auth/register-staff', payload);
      alert('Staff member registered successfully! They can now log in.');
      // Reset form but keep the active branch selection
      setFormData({ ...formData, first_name: '', last_name: '', email: '', password: '' });
    } catch (error: any) {
      alert(`Registration failed: ${error.response?.data?.message || 'Check network'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl mx-auto">
      <div className="bg-slate-900 p-6 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight">Register System Staff</h2>
        <p className="text-sm text-slate-400 mt-1">Provision access for Loan Officers and Managers.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Access Role</label>
            <select 
              required
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-blue-700"
            >
              <option value="Loan Officer">Loan Officer</option>
              <option value="Branch Manager">Branch Manager</option>
              <option value="Lender Admin">Lender Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Assigned Branch</label>
            <select 
              required
              value={formData.branch_id}
              onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">-- Select Operational Branch --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">First Name</label>
            <input 
              type="text" placeholder="e.g. Jacobs" required
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Last Name</label>
            <input 
              type="text" placeholder="e.g. Mogi" required
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Official Email</label>
            <input 
              type="email" placeholder="staff@mogifintech.co.ke" required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Temporary Password</label>
            <input 
              type="password" placeholder="••••••••" required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <button 
          type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:shadow-none mt-4"
        >
          {loading ? 'Provisioning Account...' : 'Register Staff Member'}
        </button>
      </form>
    </div>
  );
};