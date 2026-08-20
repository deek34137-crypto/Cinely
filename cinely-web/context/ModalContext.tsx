'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ModalContextValue {
  isOpen: boolean;
  canonicalId: string | null;
  openModal: (canonicalId: string) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [canonicalId, setCanonicalId] = useState<string | null>(null);

  const openModal = useCallback((id: string) => {
    setCanonicalId(id);
    setIsOpen(true);
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setCanonicalId(null);
    document.body.style.overflow = '';
  }, []);

  return (
    <ModalContext.Provider value={{ isOpen, canonicalId, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useMediaModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useMediaModal must be used within a ModalProvider');
  }
  return context;
}
