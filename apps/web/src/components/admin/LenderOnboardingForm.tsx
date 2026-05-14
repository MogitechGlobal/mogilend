'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useAuthStore from '@/store/authStore';

export default function LenderOnboardingForm() {
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((state: any) => state.token); // Retrieve your saved JWT

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Using a fallback for the API URL to prevent the 'undefined' error
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}/v1/lenders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        alert('Institutional tenant provisioned successfully!');
        reset(); 
      } else {
        alert('Failed to provision lender. Check admin permissions.');
      }
    } catch (error) {
      console.error('Network error', error);
      alert('Unable to connect to MogiFintech API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-0">
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-slate-200 rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-6">
          <CardTitle className="text-xl font-bold tracking-tight">
            Provision New Institutional Tenant
          </CardTitle>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-bold">
            Super Admin Console
          </p>
        </CardHeader>
        
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Responsive Grid: 1 col on mobile, 2 cols on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Institution Name</label>
                <Input 
                  className="rounded-xl border-slate-200 py-6"
                  placeholder="e.g., Mogi Credit Services" 
                  {...register('name', { required: true })} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Principal Admin</label>
                <Input 
                  className="rounded-xl border-slate-200 py-6"
                  placeholder="e.g., Jacobs Mogi" 
                  {...register('admin_name')} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Official Email</label>
                <Input 
                  type="email" 
                  className="rounded-xl border-slate-200 py-6"
                  placeholder="hello@mogicredit.co.ke" 
                  {...register('email', { required: true })} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Contact Phone</label>
                <Input 
                  className="rounded-xl border-slate-200 py-6"
                  placeholder="2547XXXXXXXX" 
                  {...register('phone', { required: true })} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">KRA PIN (Tax ID)</label>
                <Input 
                  className="rounded-xl border-slate-200 py-6 font-mono"
                  placeholder="P051..." 
                  {...register('tax_pin')} 
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-bold text-slate-700">CR12 Registration</label>
                <Input 
                  className="rounded-xl border-slate-200 py-6 font-mono"
                  placeholder="PVT-..." 
                  {...register('registration_number')} 
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                type="submit" 
                className="w-full py-7 text-lg font-black bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? 'Initializing SaaS Environment...' : 'Provision New Lender'}
              </Button>
              
              {/* Contextual Logout for Super Admin */}
              <button 
                type="button"
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="w-full text-slate-400 text-sm font-bold hover:text-red-500 transition-colors"
              >
                Logout Super Admin
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}