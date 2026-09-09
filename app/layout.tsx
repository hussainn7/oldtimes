import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Earth Through Time — A living history', description: 'Explore 4.5 billion years of Earth. Walk ancient worlds, encounter wildlife, and discover how long you might survive.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
