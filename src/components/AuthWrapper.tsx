"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from "@/components/Sidebar";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [domainError, setDomainError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isMedicus = (email?: string) => email?.toLowerCase().endsWith('@medicus.com.ar');

  useEffect(() => {
    // Revisión inmediata al montar la app
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        if (!isMedicus(session.user.email)) {
          await supabase.auth.signOut();
          setDomainError(true);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
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
          setDomainError(true);
          setIsAuthenticated(false);
          router.push('/login');
        } else {
          setIsAuthenticated(true);
          if (pathname === '/login') router.push('/');
        }
      } else {
        setIsAuthenticated(false);
        if (pathname !== '/login') router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (domainError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#0b0c10', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ color: '#ff4444' }}>Acceso Restringido</h1>
        <p>Solo se permite el acceso al personal de Medicus (@medicus.com.ar).</p>
        <button 
          onClick={() => { setDomainError(false); router.push('/login'); }}
          style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'white', color: 'black', cursor: 'pointer' }}
        >
          Volver al Login
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'white', background: '#0b0c10' }}>Iniciando entorno seguro...</div>;
  }

  // Si no está auth y estamos en /login, devuelve directamente la página sin layout
  if (!isAuthenticated && pathname === '/login') {
    return <>{children}</>;
  }

  // Layout normal de la app para usuarios logueados
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
