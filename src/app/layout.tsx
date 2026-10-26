import type { Metadata } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "./service-worker-registration";

export const metadata: Metadata = {
  applicationName: "GeoLearner",
  title: "GeoLearner — Apprendre la géographie",
  description:
    "Ton espace personnel pour choisir tes prochains tests de géographie et suivre ta progression.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "GeoLearner",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
