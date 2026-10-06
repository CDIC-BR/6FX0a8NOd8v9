import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CDIC-BR · Painel de Acompanhamento",
  description: "Dashboard de acompanhamento da implantação das dioceses com integração preparada para Trello.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
