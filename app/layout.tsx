import type { Metadata } from "next";
import "./globals.css";
import { sitePath } from "./paths";

export const metadata: Metadata = {
  title: "IVMOVA | Dönüşümün Gündemi",
  description: "Enerji, enerji piyasaları, teknoloji, mobilite ve iklim alanlarında kaynakları görünür haberler, analizler ve uzman görüşleri.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: sitePath("/ivmova-mark.svg"),
    shortcut: sitePath("/ivmova-mark.svg"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        {children}
      </body>
    </html>
  );
}
