"use client";
import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // --- "EL MEDICUS GUARD" ---
    if (!email.toLowerCase().endsWith('@medicus.com.ar')) {
      setErrorMsg('Solo se permite el acceso con correos electrónicos de @medicus.com.ar');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      }
    });

    if (error) {
      setErrorMsg('Error al enviar el enlace: ' + error.message);
    } else {
      setSuccessMsg('¡Listo! Revisa tu correo de Medicus. Te hemos enviado un enlace de acceso mágico.');
    }
    setLoading(false);
  };

  return (
    <div className={`animate-fade-in ${styles.loginPage}`}>
      <div className={`glass-panel ${styles.loginBox}`}>
        <div className={styles.brand}>
          <div className={styles.logoBox}>
            <BrainIcon />
          </div>
          <h1>Growth Brain AI</h1>
          <p>Acceso Seguro Medicus</p>
        </div>

        {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}
        {successMsg && <div className={styles.successBox}>{successMsg}</div>}

        {!successMsg ? (
          <form onSubmit={handleMagicLink} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Correo Electrónico Corporativo</label>
              <input 
                type="email" 
                required 
                placeholder="tu_nombre@medicus.com.ar" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Validando...' : 'Enviar Enlace de Acceso'}
            </button>
            <p className={styles.hint}>
              Ingresa tu mail de Medicus para recibir un enlace de inicio de sesión único. Sin contraseñas.
            </p>
          </form>
        ) : (
          <div className={styles.confirmState}>
            <p>Por favor, haz clic en el enlace que enviamos a <strong>{email}</strong> para entrar a la plataforma.</p>
            <button className={styles.toggleBtn} onClick={() => setSuccessMsg('')}>
              ← Intentar con otro mail
            </button>
          </div>
        )}
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
