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

    if (!email.toLowerCase().endsWith('@medicus.com.ar')) {
      setErrorMsg('Solo se permite el acceso con correos @medicus.com.ar');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message === 'Invalid login credentials'
        ? 'Credenciales inválidas. Revisá tu correo y contraseña.'
        : 'Error al iniciar sesión: ' + error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <div className={`${styles.card} animate-fade-in`}>
        <div className={styles.brand}>
          <span className={styles.logo}><DataIcon /></span>
          <div>
            <h1 className={styles.title}>SysData</h1>
            <p className={styles.tagline}>Motor de mejora continua · Medicus</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <label className={styles.label}>
            Correo corporativo
            <input type="email" required placeholder="tu.nombre@medicus.com.ar" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} autoFocus />
          </label>
          <label className={styles.label}>
            Contraseña
            <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
          </label>

          {errorMsg && <div className={styles.error}>{errorMsg}</div>}

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className={styles.footer}>
          <span className={styles.lock}>🔒</span> Acceso restringido al equipo de Medicus
        </div>
      </div>
    </div>
  );
}

function DataIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  );
}
