import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atualização Monetária — Matemático.com.br",
  description: "Atualize valores pela inflação com IPCA, IGPM, INPC e CDI. Calcule correções monetárias com precisão.",
  keywords: ["atualização monetária", "IPCA", "IGPM", "correção monetária", "inflação"],
  openGraph: {
    title: "Atualização Monetária — Matemático.com.br",
    description: "Corrija valores pela inflação com precisão.",
    url: "https://atualizacao.matematico.com.br",
    siteName: "Matemático.com.br",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
