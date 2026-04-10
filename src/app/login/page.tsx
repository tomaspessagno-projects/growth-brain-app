"use client";
import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/');
      }
    } else {
      // Validar dominio Medicus
      if (!email.toLowerCase().endsWith('@medicus.com.ar')) {
        setErrorMsg('Solo se permiten pases de Medicus (@medicus.com.ar). Contacta a soporte si crees que es un error.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('¡Bienvenido al Equipo Medicus! Registro exitoso. Ya puedes iniciar sesión.');
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'azure') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) {
      setErrorMsg(`Error con ${provider}: ` + error.message);
      setLoading(false);
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
          <p>Panel de Control del Equipo Medicus</p>
        </div>

        {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}
        {successMsg && <div className={styles.successBox}>{successMsg}</div>}

        <form onSubmit={handleAuth} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              required 
              placeholder="tu@email.com" 
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
            {loading ? 'Cargando...' : (isLogin ? 'Entrar con mi Email' : 'Crear Cuenta')}
          </button>
        </form>

        <div className={styles.divider}>o continuar con</div>

        <div className={styles.socialAuth}>
          <button className={styles.socialBtn} onClick={() => handleOAuth('google')} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Google
          </button>
          
          <button className={styles.socialBtn} onClick={() => handleOAuth('azure')} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#f35325" d="M1 1h10.5v10.5H1z"/>
              <path fill="#81bc06" d="M12.5 1H23v10.5H12.5z"/>
              <path fill="#05a6f0" d="M1 12.5h10.5V23H1z"/>
              <path fill="#ffba08" d="M12.5 12.5H23V23H12.5z"/>
            </svg>
            Microsoft
          </button>
        </div>

        <div className={styles.toggleWrapper}>
          <button type="button" className={styles.toggleBtn} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
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
