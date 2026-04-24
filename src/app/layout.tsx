import type { Metadata } from "next";
import { Cinzel, Cinzel_Decorative, IM_Fell_English } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", weight: ["400", "700", "900"] });
const cinzelDeco = Cinzel_Decorative({ subsets: ["latin"], variable: "--font-cinzel-deco", weight: ["400", "700", "900"] });
const imFell = IM_Fell_English({ subsets: ["latin"], variable: "--font-im-fell", weight: ["400"] });

export const metadata: Metadata = {
  title: "Deathtrap Dungeon",
  description: "An interactive film based on Ian Livingstone's Fighting Fantasy gamebook",
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
    <html lang="en">
      <body className={`min-h-screen bg-gray-950 text-gray-100 ${cinzel.variable} ${cinzelDeco.variable} ${imFell.variable}`}>
        {children}
      </body>
    </html>
  );
}
