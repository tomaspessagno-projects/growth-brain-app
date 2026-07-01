"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import NavRangePicker from '@/components/NavRangePicker';
import { MVP_MODE, MVP_NAV_PATHS } from '@/lib/mvp';

const NAV_ALL = [
  { name: 'Resumen', path: '/' },
  { name: 'Embudos', path: '/funnel' },
  { name: 'Histórico', path: '/historico' },
  { name: 'Oportunidades', path: '/oportunidades' },
  { name: 'Experimentos', path: '/experimentos' },
  { name: 'Aprendizajes', path: '/playbook' },
  { name: 'Segmentos', path: '/segmentos' },
  { name: 'Explorador', path: '/explorador' },
  { name: 'Status', path: '/status' },
];
// MVP: solo el núcleo. Poniendo MVP_MODE=false vuelven todas.
const NAV = MVP_MODE ? NAV_ALL.filter((n) => MVP_NAV_PATHS.has(n.path)) : NAV_ALL;

function activeKey(pathname: string): string {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/oportunidades')) return '/oportunidades';
  if (pathname.startsWith('/experimentos')) return '/experimentos';
  if (pathname.startsWith('/funnel')) return '/funnel';
  if (pathname.startsWith('/historico')) return '/historico';
  if (pathname.startsWith('/playbook')) return '/playbook';
  if (pathname.startsWith('/segmentos')) return '/segmentos';
  if (pathname.startsWith('/status')) return '/status';
  if (pathname.startsWith('/explorador') || pathname.startsWith('/crm') || pathname.startsWith('/economia')) return '/explorador';
  return '';
}

export default function Navbar() {
  const pathname = usePathname() || '/';
  const active = activeKey(pathname);

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logo}><DataIcon /></span>
          <span className={styles.brandName}>SysData</span>
        </Link>

        {/* MVP mínimo = 1 sola pantalla → sin pestañas (la marca vuelve al inicio). */}
        {NAV.length > 1 && (
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <Link key={item.path} href={item.path} className={`${styles.link} ${active === item.path ? styles.active : ''}`}>
                {item.name}
              </Link>
            ))}
          </nav>
        )}

        <div className={styles.right}>
          <NavRangePicker />
        </div>
      </div>
    </header>
  );
}

function DataIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="20" x2="6" y2="13"></line>
      <line x1="12" y1="20" x2="12" y2="8"></line>
      <line x1="18" y1="20" x2="18" y2="4"></line>
    </svg>
  );
}
