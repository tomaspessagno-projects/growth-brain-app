"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '80px' : '280px');
    
    // Obtener el usuario actual
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [isCollapsed]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Recarga para que AuthWrapper redireccione
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { name: 'Experimentos', path: '/experimentos', icon: <ExperimentIcon /> },
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <button className={styles.collapseBtn} onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? '→' : '←'}
      </button>

      <div className={styles.brand} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <div className={styles.logoBox} style={{ width: isCollapsed ? '32px' : '40px', height: isCollapsed ? '32px' : '40px' }}>
          <BrainIcon />
        </div>
        {!isCollapsed && <h2>Growth Brain</h2>}
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (pathname?.startsWith(item.path) && item.path !== '/');
          
          return (
            <Link href={item.path} key={item.path} className={`${styles.navItem} ${isActive ? styles.active : ''}`} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '12px 0' : '12px 16px' }}>
              <span className={styles.icon}>{item.icon}</span>
              {!isCollapsed && <span className={styles.label}>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <footer className={styles.footer}>
        <div className={styles.userSection}>
          {!isCollapsed && user && (
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          )}
          <button onClick={handleLogout} className={styles.logoutBtn} title="Cerrar Sesión">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
        <div className={styles.tagLine}>
          {!isCollapsed ? <div className={styles.tag}>Medicus AI Powered</div> : <div className={styles.tag}>AI</div>}
        </div>
      </footer>
    </aside>
  );
}

// Icons (Inline SVG)
function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9"></rect>
      <rect x="14" y="3" width="7" height="5"></rect>
      <rect x="14" y="12" width="7" height="9"></rect>
      <rect x="3" y="16" width="7" height="5"></rect>
    </svg>
  );
}

function ExperimentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.31"></path>
      <path d="M14 9.3V1.99"></path>
      <path d="M8.5 2h7"></path>
      <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
      <path d="M5.52 16h12.96"></path>
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path>
    </svg>
  );
}
