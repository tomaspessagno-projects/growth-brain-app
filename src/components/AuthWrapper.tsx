"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from "@/components/Navbar";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [domainError, setDomainError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Bypass de autenticación SOLO para desarrollo local (NEXT_PUBLIC_DEV_BYPASS_AUTH=true).
  // Permite ver la herramienta en localhost sin login de Supabase. Desactivar en prod.
  const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

  const isMedicus = (email?: string) => email?.toLowerCase().endsWith('@medicus.com.ar');

  // Sincroniza el access_token a una cookie same-origin para que el middleware gatee /api/*.
  const setAuthCookie = (token: string | null) => {
    if (typeof document === 'undefined') return;
    document.cookie = token
      ? `sb-access-token=${token}; path=/; max-age=3600; SameSite=Lax`
      : 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
  };

  useEffect(() => {
    if (DEV_BYPASS) {
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }
    // Revisión inmediata al montar la app
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        if (!isMedicus(session.user.email)) {
          await supabase.auth.signOut();
          setAuthCookie(null);
          setDomainError(true);
          setIsAuthenticated(false);
          setLoading(false); // Detener carga para mostrar error de dominio
          return;
        } else {
          setAuthCookie(session.access_token);
          setIsAuthenticated(true);
        }
      } else {
        setAuthCookie(null);
      }

      if (!session && pathname !== '/login') {
        router.push('/login');
      } else if (session && pathname === '/login' && isMedicus(session.user.email)) {
        router.push('/'); 
      }
      
      setLoading(false);
    };

    checkSession();

    // Escuchar si la sesión cambia en tiempo real
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (!isMedicus(session.user.email)) {
          await supabase.auth.signOut();
          setAuthCookie(null);
          setDomainError(true);
          setIsAuthenticated(false);
          setLoading(false);
          router.push('/login');
        } else {
          setAuthCookie(session.access_token);
          setDomainError(false);
          setIsAuthenticated(true);
          if (pathname === '/login') router.push('/');
        }
      } else {
        setAuthCookie(null);
        setIsAuthenticated(false);
        if (pathname !== '/login') router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (DEV_BYPASS) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="main-content">{children}</main>
      </div>
    );
  }

  if (domainError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#002D5F', background: '#F8F9FA', textAlign: 'center', padding: '20px', fontFamily: 'Montserrat, sans-serif' }}>
        <h1 style={{ color: '#002D5F', fontSize: '2.5rem', marginBottom: '16px', fontWeight: 800 }}>Acceso Restringido</h1>
        <p style={{ color: '#555', fontSize: '1.1rem' }}>Solo se permite el acceso al personal autorizado de Medicus (@medicus.com.ar).</p>
        <button 
          onClick={() => { setDomainError(false); router.push('/login'); }}
          style={{ marginTop: '32px', padding: '14px 32px', borderRadius: '999px', border: 'none', background: '#002D5F', color: 'white', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(0, 45, 95, 0.2)' }}
        >
          Volver al Login
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#002D5F', background: '#F8F9FA', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Sincronizando SysData…</div>;
  }

  // Si no está auth y estamos en /login, devuelve directamente la página sin layout
  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }

  // Layout normal de la app para usuarios logueados
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
