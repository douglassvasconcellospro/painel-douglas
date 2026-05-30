import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Painel Financeiro — Douglas Vasconcellos",
  description: "Painel de gestão financeira e clientes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb', margin: 0, padding: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '2rem', overflowX: 'hidden', minHeight: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
