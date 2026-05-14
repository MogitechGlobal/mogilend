// apps/web/src/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useAuthStore from '@/store/authStore'; // Zustand store

export default function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      if (result.access_token) {
        setAuth(result.user, result.access_token);
        // Redirect based on role-based dashboard routing
        window.location.href = result.user.role === 'Super Admin' ? '/admin' : '/lender/dashboard';
      }
    } catch (error) {
      console.error('Login failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-center font-bold text-slate-800">MogiFintech Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input 
              type="email" 
              placeholder="Corporate Email" 
              {...register('email', { required: true })} 
              className="w-full"
            />
            {errors.email && <span className="text-sm text-red-500">Email is required</span>}
          </div>
          <div>
            <Input 
              type="password" 
              placeholder="Password" 
              {...register('password', { required: true })} 
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Authenticating...' : 'Secure Login'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}