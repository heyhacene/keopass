import type { Metadata, Viewport } from 'next';
import './globals.css';
import { VaultProvider } from '@/lib/vaultContext';

export const metadata: Metadata = {
  title: 'KeoPass — Coffre-fort de mots de passe Zero-Knowledge',
  description: 'Gestionnaire de mots de passe et coffre-fort sécurisé multiplateforme de la suite Keo avec chiffrement AES-256.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <VaultProvider>
          {children}
        </VaultProvider>
      </body>
    </html>
  );
}
