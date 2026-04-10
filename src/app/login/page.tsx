"use client";
import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // --- "EL MEDICUS GUARD" ---
    if (!email.toLowerCase().endsWith('@medicus.com.ar')) {
      setErrorMsg('Solo se permite el acceso con correos electrónicos de @medicus.com.ar');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('Credenciales inválidas. Verifica tu correo y contraseña corporativa.');
      } else {
        setErrorMsg('Error al iniciar sesión: ' + error.message);
      }
      setLoading(false);
    } else {
      // Éxito: AuthWrapper detectará la sesión y redirigirá.
      // Pero forzamos redirección para mejor UX instantánea
      router.push('/');
    }
  };

  return (
    <div className={`animate-fade-in ${styles.loginPage}`}>
      <div className={`glass-panel ${styles.loginBox}`}>
        <div className={styles.brand}>
          <div className={styles.logoBox}>
            <BrainIcon />
          </div>
          <h1>Growth Brain AI</h1>
          <p>Control de Acceso Medicus</p>
        </div>

        {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Correo Electrónico Corporativo</label>
            <input 
              type="email" 
              required 
              placeholder="tu.nombre@medicus.com.ar" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Contraseña</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
          
          <div className={styles.authMeta}>
            <p className={styles.hint}>
              Ingresa tus credenciales autorizadas por el equipo de sistemas.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function BrainIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path>
    </svg>
  );
}
