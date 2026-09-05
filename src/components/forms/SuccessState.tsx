import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Home, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SuccessStateProps {
  title: string;
  copy: string;
  referenceLabel: string;
  referenceId: string;
  onReset: () => void;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  copy,
  referenceLabel,
  referenceId,
  onReset
}) => {
  return (
    <motion.div
      className="form-success-container"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="form-success-icon-box"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
      >
        <CheckCircle2 size={38} strokeWidth={2.2} />
      </motion.div>

      <h2 className="form-success-title">{title}</h2>
      <p className="form-success-copy">{copy}</p>

      <div className="form-reference-card">
        <div className="form-reference-label">{referenceLabel}</div>
        <div className="form-reference-id">{referenceId}</div>
        <div className="form-reference-note">
          * Frontend simulation reference. A production-verified ID will be generated upon backend integration.
        </div>
      </div>

      <div className="form-success-actions">
        <button
          type="button"
          onClick={onReset}
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RotateCcw size={15} />
          <span>Submit Another Enquiry</span>
        </button>

        <Link
          to="/"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Home size={15} />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </motion.div>
  );
};
