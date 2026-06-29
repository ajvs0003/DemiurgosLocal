import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App",
  description: "Built with opencode-sdd-harness",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:rounded focus:bg-blue-600 focus:px-3 focus:py-1.5 focus:text-white"
        >
          Saltar al contenido
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
