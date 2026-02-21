import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'pb-test-app-mobile',
  description: 'PB Academy Training App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
