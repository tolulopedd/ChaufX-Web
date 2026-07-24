import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChaufX Canada",
  description: "Personal driver platform for vehicle owners, drivers, and operators.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png?v=8", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png?v=8"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
