import React from 'react';
import { Plus, Trash2, PhoneCall } from 'lucide-react';
import type { EmergencyContact } from '../../types/joining';

interface EmergencyContactSectionProps {
  contacts: EmergencyContact[];
  onContactChange: (id: string, field: keyof EmergencyContact, value: string) => void;
  onAddContact: () => void;
  onRemoveContact: (id: string) => void;
  errors: Record<string, string>;
}

export const EmergencyContactSection: React.FC<EmergencyContactSectionProps> = ({
  contacts,
  onContactChange,
  onAddContact,
  onRemoveContact,
  errors
}) => {
  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)' }}>
          <PhoneCall size={18} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            EMERGENCY FAMILY CONTACT DETAILS
          </h3>
        </div>

        {contacts.length < 3 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onAddContact}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <Plus size={14} />
            <span>ADD RELATIVE</span>
          </button>
        )}
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)' }}>
        Designate a blood relative or guardian to be notified in the event of workplace emergencies or medical exigencies.
      </p>

      {contacts.map((contact, index) => (
        <div
          key={contact.id}
          style={{
            backgroundColor: 'var(--color-pearl-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-4)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Emergency Relative #{index + 1}
            </span>
            {contacts.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveContact(contact.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-dusty-rose-dark)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600
                }}
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div className="joining-grid-3">
            <div className="field-wrapper">
              <label className="field-label">
                <span>RELATIVE NAME</span>
                <span className="field-required-star">*</span>
              </label>
              <input
                type="text"
                className={`field-input ${errors[`emergency_${contact.id}_name`] ? 'has-error' : ''}`}
                placeholder="e.g. Ramesh Patil"
                value={contact.name}
                onChange={(e) => onContactChange(contact.id, 'name', e.target.value)}
              />
              {errors[`emergency_${contact.id}_name`] && (
                <span className="field-error-msg">{errors[`emergency_${contact.id}_name`]}</span>
              )}
            </div>

            <div className="field-wrapper">
              <label className="field-label">
                <span>CONTACT NUMBER</span>
                <span className="field-required-star">*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                className={`field-input ${errors[`emergency_${contact.id}_phone`] ? 'has-error' : ''}`}
                placeholder="10-digit mobile"
                value={contact.contactNumber}
                onChange={(e) => onContactChange(contact.id, 'contactNumber', e.target.value.replace(/\D/g, ''))}
              />
              {errors[`emergency_${contact.id}_phone`] && (
                <span className="field-error-msg">{errors[`emergency_${contact.id}_phone`]}</span>
              )}
            </div>

            <div className="field-wrapper">
              <label className="field-label">
                <span>RELATION</span>
                <span className="field-required-star">*</span>
              </label>
              <select
                className={`field-select ${errors[`emergency_${contact.id}_relation`] ? 'has-error' : ''}`}
                value={contact.relation}
                onChange={(e) => onContactChange(contact.id, 'relation', e.target.value)}
              >
                <option value="">Select Relation</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Spouse">Spouse</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Guardian">Guardian / Other</option>
              </select>
              {errors[`emergency_${contact.id}_relation`] && (
                <span className="field-error-msg">{errors[`emergency_${contact.id}_relation`]}</span>
              )}
            </div>
          </div>

          <div className="field-wrapper" style={{ marginTop: 'var(--space-3)' }}>
            <label className="field-label">
              <span>RESIDENTIAL ADDRESS OF RELATIVE</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input ${errors[`emergency_${contact.id}_address`] ? 'has-error' : ''}`}
              placeholder="House/Plot No., Area, City, District"
              value={contact.address}
              onChange={(e) => onContactChange(contact.id, 'address', e.target.value)}
            />
            {errors[`emergency_${contact.id}_address`] && (
              <span className="field-error-msg">{errors[`emergency_${contact.id}_address`]}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
