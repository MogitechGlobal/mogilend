import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import useAuthStore from '../../store/authStore';

export const RegisterBorrower = () => {
  const user = useAuthStore((state: any) => state.user); 
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]); // State to hold dynamic branches
  
  // Initialize form with user's specific branch_id if they have one
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    national_id: '',
    phone_number: '',
    branch_id: user?.branch_id || '', // Dynamic initialization
  });

  // Dynamically fetch branches for this specific lender
  useEffect(() => {
    const fetchBranches = async () => {
      const activeLenderId = user?.lender_id;
      if (!activeLenderId) return;

      try {
        const response = await api.get(`/branches?lender_id=${activeLenderId}`);
        setBranches(response.data);
      } catch (error) {
        console.error('Failed to load branches:', error);
      }
    };

    fetchBranches();
  }, [user?.lender_id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please upload a National ID document.');
    if (!formData.branch_id) return alert('Please select an operating branch.');

    setLoading(true);
    
    // Strict production assignment - no fallback strings
    const activeLenderId = user?.lender_id; 

    if (!activeLenderId) {
      alert("Critical Error: No Lender Context Found.");
      setLoading(false);
      return;
    }

    const payload = new FormData();
    payload.append('first_name', formData.first_name);
    payload.append('last_name', formData.last_name);
    payload.append('national_id', formData.national_id);
    payload.append('phone_number', formData.phone_number);
    payload.append('lender_id', activeLenderId); 
    payload.append('branch_id', formData.branch_id); // Using the dynamic selection
    payload.append('file', file);

    try {
      const response = await api.post('/borrowers/register-with-kyc', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(`KYC Success! Borrower Registered with ID: ${response.data.id}`);
      window.location.reload(); 
    } catch (error: any) {
      alert(`Registration blocked: ${error.response?.data?.message || 'Server Error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">New Client Onboarding</h2>
        <p className="text-sm text-slate-500">Ensure the National ID image is clear for KYC verification.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        
        {/* Branch Selection Dropdown (Only shows if the user doesn't have a fixed branch, or for Admins) */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">Operating Branch</label>
          <select 
            required
            value={formData.branch_id}
            onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={!!user?.branch_id}
          >
            <option value="">-- Select Registering Branch --</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {/* Updated to use branch.location to match your JSON data */}
                {branch.name} - {branch.location} 
              </option>
            ))}
          </select>
          {!!user?.branch_id && (
            <p className="text-xs text-blue-600 font-medium mt-1">Locked to your assigned branch.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">First Name</label>
            <input 
              type="text" 
              placeholder="e.g. Jacobs"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Last Name</label>
            <input 
              type="text" 
              placeholder="e.g. Mogi"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">National ID Number</label>
            <input 
              type="text" 
              placeholder="8-digit ID"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              onChange={(e) => setFormData({...formData, national_id: e.target.value})} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Phone Number</label>
            <input 
              type="tel" 
              placeholder="2547XXXXXXXX"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onChange={(e) => setFormData({...formData, phone_number: e.target.value})} 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">National ID Photo (Front)</label>
          <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors text-center">
            <input 
              type="file" 
              accept="image/*"
              required
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="text-blue-600 font-semibold">
                ✓ {file.name} Selected
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-blue-600 font-semibold block">Click to upload image</span>
                <span className="text-xs text-slate-400">JPG, PNG or GIF (Max 5MB)</span>
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:shadow-none"
        >
          {loading ? 'Uploading KYC Data...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
};