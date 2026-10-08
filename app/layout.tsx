import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const themeBootstrap = `
(() => {
  try {
    const saved = localStorage.getItem("cdic-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = saved === "dark" || saved === "light" ? saved : preferred;
  } catch (_) {}
})();`;

export const metadata: Metadata = {
  title: "CDIC-BR · Acompanhamento das dioceses",
  description: "Painel executivo de acompanhamento da participação das dioceses no CDIC-BR.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={poppins.className}>{children}</body>
    </html>
  );
}
