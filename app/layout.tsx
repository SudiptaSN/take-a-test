import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: '%s | AssOnFire 🔥', default: 'AssOnFire 🔥 | Hardcore Proctored Tests' },
  description: 'The definitive proctored examination platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
