// Oturum durumu: gb.auth'u React'e bağlar. useAuth() → { user, ready }.
// Token yenileme SDK'nın işi (bitimine 30 sn kala ya da 401'de bir kez); burada yalnız dinlenir.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EndUser } from '@gridbasetr/client';
import { gb } from './gridbase';

type AuthState = { user: EndUser | null; ready: boolean };
const AuthContext = createContext<AuthState>({ user: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false });
  useEffect(() => {
    let alive = true;
    // Saklanan oturum okununca hazır; dinleyici giriş / çıkış / profil değişikliğini yakalar.
    gb.auth.ready.then(() => alive && setState({ user: gb.auth.user, ready: true }));
    const stop = gb.auth.onChange((user) => setState({ user, ready: true }));
    return () => {
      alive = false;
      stop();
    };
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// Rol kontrolü (GridBase rolleri büyük/küçük harf duyarsız).
export const hasRole = (user: EndUser | null, role: string) =>
  !!user?.roles.some((r) => r.toLowerCase() === role.toLowerCase());

export const nameOf = (user: { displayName?: string | null; email?: string } | null) =>
  user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';
