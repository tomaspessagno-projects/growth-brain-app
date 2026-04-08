"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from "@/components/Sidebar";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Revisión inmediata al montar la app
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && pathname !== '/login') {
        router.push('/login');
      } else if (session && pathname === '/login') {
        router.push('/'); // Evita que un logueado vea el login
      } else if (session) {
        setIsAuthenticated(true);
      }
      
      setLoading(false);
    };

    checkSession();

    // Escuchar si la sesión cambia en tiempo real
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== '/login') {
        setIsAuthenticated(false);
        router.push('/login');
      } else if (session && pathname === '/login') {
        setIsAuthenticated(true);
        router.push('/');
      } else if (session) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

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
