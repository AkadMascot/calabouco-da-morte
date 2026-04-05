import type { Metadata } from "next";
import Providers from '@/components/Providers';
import "./globals.css";

export const metadata: Metadata = {
  title: "O Calabouço da Morte",
  description: "Jogo interativo baseado no livro-jogo Aventuras Fantásticas 05",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
