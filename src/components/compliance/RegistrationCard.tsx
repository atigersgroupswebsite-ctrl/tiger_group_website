import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building,
  Receipt,
  ShieldCheck,
  Users,
  Award,
  FileCheck2
} from 'lucide-react';
import type { RegistrationItem } from '../../types/compliance';

interface RegistrationCardProps {
  item: RegistrationItem;
  index: number;
  onSelect: (item: RegistrationItem) => void;
}

const getRegistrationIcon = (id: string) => {
  switch (id) {
    case 'establishment':
      return <Building size={20} />;
    case 'gst':
      return <Receipt size={20} />;
    case 'epfo':
      return <ShieldCheck size={20} />;
    case 'esic':
      return <Users size={20} />;
    case 'udyam':
      return <Award size={20} />;
    case 'profession-tax':
      return <FileCheck2 size={20} />;
    default:
      return <ShieldCheck size={20} />;
  }
};

export const RegistrationCard: React.FC<RegistrationCardProps> = ({
  item,
  index,
  onSelect
}) => {
  return (
    <motion.div
      className="compliance-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div>
        <div className="compliance-card-header">
          <span className="compliance-card-number">CARD 0{item.cardNumber}</span>
          <div className="compliance-card-icon-badge" aria-hidden="true">
            {getRegistrationIcon(item.id)}
          </div>
        </div>

        <h3 className="compliance-card-title">{item.title}</h3>
        <span className="compliance-card-authority">{item.authority}</span>
        <p className="compliance-card-desc">{item.description}</p>
      </div>

      <button
        type="button"
        className="compliance-card-action"
        onClick={() => onSelect(item)}
        aria-label={`View details for ${item.title}`}
      >
        <span>VIEW DETAILS</span>
        <ArrowRight size={14} className="compliance-card-action-icon" />
      </button>
    </motion.div>
  );
};
