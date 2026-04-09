"use client";
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  onClose: () => void;
  children: React.ReactNode;
}

export default function ModalPortal({ onClose, children }: ModalPortalProps) {
  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#0a0a0a',
          border: '1px solid #222',
          borderRadius: '6px',
          padding: '32px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
