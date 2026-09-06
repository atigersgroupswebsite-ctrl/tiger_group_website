import React from 'react';
import { Plus, Trash2, Home, MapPin, PhoneCall } from 'lucide-react';
import type { AddressDetails, EmergencyContact } from '../../types/joining';

interface AddressSectionProps {
  permanentAddress: AddressDetails;
  currentAddress: AddressDetails;
  sameAsPermanent: boolean;
  emergencyContacts: EmergencyContact[];
  onPermanentChange: (field: keyof AddressDetails, value: string) => void;
  onCurrentChange: (field: keyof AddressDetails, value: string) => void;
  onSameAsPermanentToggle: (checked: boolean) => void;
  onEmergencyChange: (id: string, field: keyof EmergencyContact, value: string) => void;
  onAddEmergencyContact: () => void;
  onRemoveEmergencyContact: (id: string) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}

export const AddressSection: React.FC<AddressSectionProps> = ({
  permanentAddress,
  currentAddress,
  sameAsPermanent,
  emergencyContacts,
  onPermanentChange,
  onCurrentChange,
  onSameAsPermanentToggle,
  onEmergencyChange,
  onAddEmergencyContact,
  onRemoveEmergencyContact,
  errors,
  readOnly = false
}) => {
  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 03</span>
        <h2 className="joining-step-title">ADDRESS & EMERGENCY CONTACT</h2>
        <p className="joining-step-desc">
          Permanent residential domicile, current workplace residence, and designated emergency relatives.
        </p>
      </div>

      {/* PERMANENT ADDRESS */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
          <Home size={18} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>PERMANENT ADDRESS</h3>
        </div>

        <div className="field-wrapper">
          <label className="field-label">
            <span>RESIDENTIAL ADDRESS (HOUSE NO., STREET / LOCALITY)</span>
            <span className="field-required-star">*</span>
          </label>
          <textarea
            rows={2}
            className={`field-textarea ${errors['perm_address'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
            placeholder="Complete postal address as per Aadhaar"
            value={permanentAddress.address}
            onChange={(e) => onPermanentChange('address', e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
          />
          {errors['perm_address'] && <span className="field-error-msg">{errors['perm_address']}</span>}
        </div>

        <div className="joining-grid-3">
          <div className="field-wrapper">
            <label className="field-label">
              <span>CITY / TOWN</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input ${errors['perm_city'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder="e.g. Nagpur"
              value={permanentAddress.city}
              onChange={(e) => onPermanentChange('city', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {errors['perm_city'] && <span className="field-error-msg">{errors['perm_city']}</span>}
          </div>

          <div className="field-wrapper">
            <label className="field-label">
              <span>DISTRICT</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input ${errors['perm_district'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder="e.g. Nagpur"
              value={permanentAddress.district}
              onChange={(e) => onPermanentChange('district', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {errors['perm_district'] && <span className="field-error-msg">{errors['perm_district']}</span>}
          </div>

          <div className="field-wrapper">
            <label className="field-label">
              <span>PIN CODE (6 DIGITS)</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              maxLength={6}
              className={`field-input ${errors['perm_pin'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder="440001"
              value={permanentAddress.pinCode}
              onChange={(e) => onPermanentChange('pinCode', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {errors['perm_pin'] && <span className="field-error-msg">{errors['perm_pin']}</span>}
          </div>
        </div>

        <div className="joining-grid-2">
          <div className="field-wrapper">
            <label className="field-label">
              <span>STATE</span>
              <span className="field-required-star">*</span>
            </label>
            <select
              className={`field-select ${readOnly ? 'read-only-field' : ''}`}
              value={permanentAddress.state}
              onChange={(e) => onPermanentChange('state', e.target.value)}
              disabled={readOnly}
            >
              <option value="Maharashtra">Maharashtra</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Chhattisgarh">Chhattisgarh</option>
              <option value="Other">Other State</option>
            </select>
          </div>

          <div className="field-wrapper">
            <label className="field-label">
              <span>COUNTRY</span>
            </label>
            <input
              type="text"
              className="field-input read-only-field"
              value="India"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* CURRENT ADDRESS */}
      <div style={{ marginBottom: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid rgba(25, 42, 86, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)' }}>
            <MapPin size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>CURRENT / LOCAL ADDRESS</h3>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: readOnly ? 'default' : 'pointer', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}>
            <input
              type="checkbox"
              style={{ width: '16px', height: '16px', accentColor: 'var(--color-midnight-navy)' }}
              checked={sameAsPermanent}
              onChange={(e) => onSameAsPermanentToggle(e.target.checked)}
              disabled={readOnly}
            />
            <span>Same as permanent address</span>
          </label>
        </div>

        <div className="field-wrapper">
          <label className="field-label">
            <span>RESIDENTIAL ADDRESS</span>
            <span className="field-required-star">*</span>
          </label>
          <textarea
            rows={2}
            className={`field-textarea ${errors['curr_address'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
            placeholder="Current workplace lodging, hostel, or residential address"
            value={currentAddress.address}
            readOnly={sameAsPermanent || readOnly}
            disabled={readOnly}
            onChange={(e) => onCurrentChange('address', e.target.value)}
          />
          {errors['curr_address'] && <span className="field-error-msg">{errors['curr_address']}</span>}
        </div>

        <div className="joining-grid-3">
          <div className="field-wrapper">
            <label className="field-label">
              <span>CITY / TOWN</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input ${errors['curr_city'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
              placeholder="Current City"
              value={currentAddress.city}
              readOnly={sameAsPermanent || readOnly}
              disabled={readOnly}
              onChange={(e) => onCurrentChange('city', e.target.value)}
            />
            {errors['curr_city'] && <span className="field-error-msg">{errors['curr_city']}</span>}
          </div>

          <div className="field-wrapper">
            <label className="field-label">
              <span>DISTRICT</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              className={`field-input ${errors['curr_district'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
              placeholder="Current District"
              value={currentAddress.district}
              readOnly={sameAsPermanent || readOnly}
              disabled={readOnly}
              onChange={(e) => onCurrentChange('district', e.target.value)}
            />
            {errors['curr_district'] && <span className="field-error-msg">{errors['curr_district']}</span>}
          </div>

          <div className="field-wrapper">
            <label className="field-label">
              <span>PIN CODE (6 DIGITS)</span>
              <span className="field-required-star">*</span>
            </label>
            <input
              type="text"
              maxLength={6}
              className={`field-input ${errors['curr_pin'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
              placeholder="PIN code"
              value={currentAddress.pinCode}
              readOnly={sameAsPermanent || readOnly}
              disabled={readOnly}
              onChange={(e) => onCurrentChange('pinCode', e.target.value)}
            />
            {errors['curr_pin'] && <span className="field-error-msg">{errors['curr_pin']}</span>}
          </div>
        </div>
      </div>

      {/* EMERGENCY CONTACT */}
      <div style={{ paddingTop: 'var(--space-6)', borderTop: '1px solid rgba(25, 42, 86, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)' }}>
            <PhoneCall size={18} style={{ color: 'var(--color-champagne-dark)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>EMERGENCY FAMILY CONTACT</h3>
          </div>

          {!readOnly && emergencyContacts.length < 2 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onAddEmergencyContact}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <Plus size={14} />
              <span>ADD SECOND CONTACT</span>
            </button>
          )}
        </div>

        {emergencyContacts.map((contact, idx) => (
          <div
            key={contact.id}
            style={{
              padding: 'var(--space-5)',
              backgroundColor: 'var(--color-pearl-surface)',
              border: '1px solid rgba(25, 42, 86, 0.1)',
              borderRadius: 'var(--radius-xl)',
              marginBottom: 'var(--space-4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-champagne-dark)', textTransform: 'uppercase' }}>
                Primary Emergency Relative {emergencyContacts.length > 1 ? `#${idx + 1}` : ''}
              </span>
              {!readOnly && emergencyContacts.length > 1 && (
                <button
                  type="button"
                  className="table-remove-btn"
                  onClick={() => onRemoveEmergencyContact(contact.id)}
                  title="Remove emergency contact"
                >
                  <Trash2 size={16} />
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
                  className={`field-input ${readOnly ? 'read-only-field' : ''}`}
                  placeholder="e.g. Manohar Patil"
                  value={contact.name}
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={(e) => onEmergencyChange(contact.id, 'name', e.target.value)}
                />
              </div>

              <div className="field-wrapper">
                <label className="field-label">
                  <span>RELATION</span>
                  <span className="field-required-star">*</span>
                </label>
                <select
                  className={`field-select ${readOnly ? 'read-only-field' : ''}`}
                  value={contact.relation}
                  disabled={readOnly}
                  onChange={(e) => onEmergencyChange(contact.id, 'relation', e.target.value)}
                >
                  <option value="">Select Relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div className="field-wrapper">
                <label className="field-label">
                  <span>CONTACT NUMBER</span>
                  <span className="field-required-star">*</span>
                </label>
                <div className="field-phone-box">
                  <span className="field-phone-prefix">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    className={`field-phone-input ${readOnly ? 'read-only-field' : ''}`}
                    placeholder="10-digit number"
                    value={contact.contactNumber}
                    readOnly={readOnly}
                    disabled={readOnly}
                    onChange={(e) => onEmergencyChange(contact.id, 'contactNumber', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="field-wrapper" style={{ marginBottom: 0 }}>
              <label className="field-label">
                <span>RESIDENCE ADDRESS</span>
              </label>
              <input
                type="text"
                className={`field-input ${readOnly ? 'read-only-field' : ''}`}
                placeholder="Relative's residential village / city"
                value={contact.address}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={(e) => onEmergencyChange(contact.id, 'address', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
