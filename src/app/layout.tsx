import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

import AuthWrapper from "@/components/AuthWrapper";

export const metadata: Metadata = {
  title: "Growth Brain AI",
  description: "Plataforma Premium para Gestión de Experimentos y Aprendizajes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </body>
    </html>
  );
}
