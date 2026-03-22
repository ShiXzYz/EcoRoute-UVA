import type { Metadata } from "next";
import "./globals.css";
import { GoogleMapsProvider } from "@/lib/GoogleMapsContext";
import { AuthProvider } from "@/lib/auth";
import SuppressWarnings from "@/components/SuppressWarnings";

export const metadata: Metadata = {
  title: "EcoRoute - UVA Carbon-Smart Routing",
  description: "Make the greener choice the obvious choice",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GoogleMapsProvider>
          <AuthProvider>
            <SuppressWarnings />
            {children}
          </AuthProvider>
        </GoogleMapsProvider>
      </body>
    </html>
  );
}
