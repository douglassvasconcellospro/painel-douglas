import type { Metadata } from "next";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";

export const metadata: Metadata = {
  title: "Painel Financeiro — Douglas Vasconcellos",
  description: "Painel de gestão financeira e clientes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: '#f9fafb' }}>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
