import React, { useState } from 'react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { RegistrationCard } from './RegistrationCard';
import { RegistrationModal } from './RegistrationModal';
import { REGISTRATION_ITEMS } from '../../data/complianceData';
import type { RegistrationItem } from '../../types/compliance';

export const RegistrationSection: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<RegistrationItem | null>(null);

  const handleOpenModal = (item: RegistrationItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  return (
    <section className="compliance-section" id="compliance">
      <Container size="xl">
        <SectionHeading
          eyebrow="REGISTRATIONS & COMPLIANCE"
          title="REGISTERED. DOCUMENTED. READY TO WORK."
          subtitle="A Tiger Global Career Solution & Consultancy maintains registrations and statutory records supporting its business operations."
        />

        <div className="compliance-grid">
          {REGISTRATION_ITEMS.map((item, index) => (
            <RegistrationCard
              key={item.id}
              item={item}
              index={index}
              onSelect={handleOpenModal}
            />
          ))}
        </div>
      </Container>

      {/* Detail Modal */}
      <RegistrationModal
        item={selectedItem}
        isOpen={Boolean(selectedItem)}
        onClose={handleCloseModal}
      />
    </section>
  );
};
