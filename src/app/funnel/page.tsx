"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// El deep-dive del cotizador vive ahora en /funnel/cotizador (ruta genérica /funnel/[id]).
export default function FunnelIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/funnel/cotizador');
  }, [router]);
  return null;
}
