import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O Calabouço da Morte",
  description: "Jogo interativo baseado no livro-jogo Aventuras Fantásticas 05",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        {children}
      </body>
    </html>
  );
}
