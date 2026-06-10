import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

import AuthWrapper from "@/components/AuthWrapper";

export const metadata: Metadata = {
  title: "SysData",
  description: "Motor de experimentación y analítica de funnel — Medicus / armatuplan",
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
