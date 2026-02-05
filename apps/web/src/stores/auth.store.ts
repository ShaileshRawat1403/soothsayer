import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      
      login: (user, token, refreshToken) =>
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),
      
      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),
      
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'soothsayer-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
