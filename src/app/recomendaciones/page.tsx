"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Recomendaciones se renombró a Oportunidades (Fase 1 del reframe a motor de mejora).
export default function RecomendacionesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/oportunidades');
  }, [router]);
  return null;
}
