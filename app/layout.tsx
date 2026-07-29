import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AssOnFire 🔥 | Hardcore Proctored Tests",
  description: "Create and proctor tests on AssOnFire.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
