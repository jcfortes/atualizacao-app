import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Sistema de Atualização Monetária — Matemático.com.br",
  description: "Atualize valores pela inflação com IPCA, IGPM, INPC e CDI. Calcule correções monetárias com precisão.",
  keywords: ["atualização monetária", "IPCA", "IGPM", "correção monetária", "inflação"],
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  openGraph: {
    title: "Sistema de Atualização Monetária — Matemático.com.br",
    description: "Corrija valores pela inflação com precisão.",
    url: "https://atualizacao.matematico.com.br",
    siteName: "Matemático.com.br",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} antialiased`}>
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
