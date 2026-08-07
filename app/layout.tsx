import "./globals.css";
import type { Metadata } from "next";
import { Inter, Hind_Siliguri } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const hindSiliguri = Hind_Siliguri({ weight: ['300', '400', '500', '600', '700'], subsets: ['bengali'], variable: '--font-bengali' });

export const metadata: Metadata = {
  title: { template: '%s | AssOnFire 🔥', default: 'AssOnFire 🔥 | Hardcore Proctored Tests' },
  description: 'The definitive proctored examination platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${hindSiliguri.variable}`}>
      <body className="font-sans bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
