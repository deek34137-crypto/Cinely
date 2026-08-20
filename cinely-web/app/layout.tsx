import type { Metadata } from 'next';
import React from 'react';
import '../styles/globals.css';
import { Providers } from './providers';
import { AuthProvider } from '../context/AuthContext';
import { ModalProvider } from '../context/ModalContext';
import { MediaDetailModal } from '../components/modal/MediaDetailModal';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Cinely — Universal Media Discovery & Streaming',
  description: 'Decentralized media discovery, stream resolution, and playback orchestration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>
            <ModalProvider>
              <ErrorBoundary>
                {children}
                <MediaDetailModal />
              </ErrorBoundary>
            </ModalProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}

