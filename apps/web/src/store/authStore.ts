import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  lender_id: string | null;
  branch_id: string | null; // <-- Add this to your User interface
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      // Initialize from localStorage if it exists to stay in sync with api.ts
      token: localStorage.getItem('jwt_token'), 
      isAuthenticated: !!localStorage.getItem('jwt_token'),
      
      setAuth: (user, token) => {
        localStorage.setItem('jwt_token', token); // Essential for the Axios interceptor
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('jwt_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'mogi-auth-storage', // Key for localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;