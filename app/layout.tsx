import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoRoute - UVA Carbon-Smart Routing",
  description: "Make the greener choice the obvious choice",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
