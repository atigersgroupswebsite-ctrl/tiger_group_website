// ==============================================================================
// File: src/components/layout/PublicLayout.tsx
// Description: Layout wrapper for public website with Navbar and Footer
// ==============================================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingWhatsAppButton } from '../common/FloatingWhatsAppButton';

export const PublicLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Navbar />
      <div style={{ flex: 1, width: '100%', maxWidth: '100%' }}>
        <Outlet />
      </div>
      <Footer />
      <FloatingWhatsAppButton />
    </div>
  );
};
