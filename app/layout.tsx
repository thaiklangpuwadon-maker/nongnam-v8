import './globals.css';

export const metadata = {
  title: 'Nong Nam AI Companion',
  description: 'Thai AI companion MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#df4d88" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nong Nam" />
      </head>
      <body>{children}</body>
    </html>
  );
}
