import "./globals.css";
import type { Metadata } from "next";
import { Inter, Noto_Sans_Bengali } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansBengali = Noto_Sans_Bengali({ subsets: ['bengali'], variable: '--font-bengali' });

export const metadata: Metadata = {
  title: { template: '%s | AssOnFire 🔥', default: 'AssOnFire 🔥 | Hardcore Proctored Tests' },
  description: 'The definitive proctored examination platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${notoSansBengali.variable}`}>
      <body className="font-sans bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
