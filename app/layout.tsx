import type { Metadata } from 'next';
import './globals.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/600.css';

export const metadata: Metadata = {
  title: 'Bas Ek Chai — The evening commute',
  description:
    'Five Indian streets, a little chaos, and one well-earned cup. Play Cross the Road and Rush Hour.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
