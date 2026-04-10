"use client";
import React, { useEffect } from 'react';
import ModalPortal from './ModalPortal';
import styles from './SlideMode.module.css';

interface SlideModeProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function SlideMode({ isOpen, onClose, title, subtitle, children }: SlideModeProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className={styles.overlay} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
        
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.tag}>Growth Brain | Executive View</span>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <div className={styles.divider}></div>
        </header>

        <main className={styles.content}>
          {children}
        </main>

        <footer className={styles.footer}>
          <span>Medicus Confidential</span>
          <span>{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </footer>
      </div>
    </ModalPortal>
  );
}
