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
      <body className="bg-gray-50 min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="ml-60 min-h-screen p-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
