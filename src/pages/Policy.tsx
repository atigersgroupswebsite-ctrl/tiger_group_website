// ==============================================================================
// File: src/pages/Policy.tsx
// Backward-compatibility wrapper pointing to TermsAndConditionsPage
// ==============================================================================

import React from 'react';
import { TermsAndConditionsPage } from './TermsAndConditionsPage';

export const Policy: React.FC = () => {
  return <TermsAndConditionsPage />;
};

export default Policy;
