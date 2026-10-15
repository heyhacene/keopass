import type { Metadata, Viewport } from 'next';
import './globals.css';
import { VaultProvider } from '@/lib/vaultContext';

export const metadata: Metadata = {
  title: 'PassVault — Coffre-fort de mots de passe Zero-Knowledge',
  description: 'Gestionnaire de mots de passe sécurisé multiplateforme avec chiffrement de bout en bout AES-256 et générateur intégré.',
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
