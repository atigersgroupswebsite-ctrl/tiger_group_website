import React from 'react';
import { Plus, Trash2, Home, MapPin, PhoneCall } from 'lucide-react';
import type { AddressDetails, EmergencyContact, JoiningFieldConfig } from '../../types/joining';
import { normalizeIndianPhoneNumber } from '../../utils/phoneUtils';
import { isFieldRequired, isFieldEnabled } from '../../utils/joiningValidation';
import { CustomFieldsRenderer } from './CustomFieldsRenderer';

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
  configMap?: Record<string, JoiningFieldConfig>;
  customFields?: Record<string, any>;
  onCustomFieldChange?: (fieldKey: string, value: any) => void;
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
  readOnly = false,
  configMap,
  customFields,
  onCustomFieldChange
}) => {
  const handleEmergencyPhoneChange = (id: string, val: string) => {
    const norm = normalizeIndianPhoneNumber(val);
    if (norm.isValid) {
      onEmergencyChange(id, 'contactNumber', norm.displayDigits);
      return;
    }
    const digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      const local = digits.slice(2);
      if (/^[6-9]\d{9}$/.test(local)) {
        onEmergencyChange(id, 'contactNumber', local);
        return;
      }
    }
    onEmergencyChange(id, 'contactNumber', digits.slice(0, 10));
  };

  const handleEmergencyPhonePaste = (id: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      const norm = normalizeIndianPhoneNumber(pasted);
      if (norm.isValid) {
        e.preventDefault();
        onEmergencyChange(id, 'contactNumber', norm.displayDigits);
      }
    }
  };

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

        {isFieldEnabled('address.perm_address', configMap) && (
          <div className="field-wrapper">
            <label className="field-label">
              <span>{configMap?.['address.perm_address']?.label?.toUpperCase() || 'RESIDENTIAL ADDRESS (HOUSE NO., STREET / LOCALITY)'}</span>
              {isFieldRequired('address.perm_address', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <textarea
              rows={2}
              className={`field-textarea ${errors['perm_address'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['address.perm_address']?.placeholder || 'Complete postal address as per Aadhaar'}
              value={permanentAddress.address}
              onChange={(e) => onPermanentChange('address', e.target.value)}
              readOnly={readOnly}
              disabled={readOnly}
            />
            {errors['perm_address'] && <span className="field-error-msg">{errors['perm_address']}</span>}
          </div>
        )}

        <div className="joining-grid-3">
          {isFieldEnabled('address.perm_city', configMap) && (
            <div className="field-wrapper">
              <label className="field-label">
                <span>{configMap?.['address.perm_city']?.label?.toUpperCase() || 'CITY / TOWN'}</span>
                {isFieldRequired('address.perm_city', configMap, true) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                type="text"
                className={`field-input ${errors['perm_city'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['address.perm_city']?.placeholder || 'e.g. Nagpur'}
                value={permanentAddress.city}
                onChange={(e) => onPermanentChange('city', e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
              {errors['perm_city'] && <span className="field-error-msg">{errors['perm_city']}</span>}
            </div>
          )}

          {isFieldEnabled('address.perm_district', configMap) && (
            <div className="field-wrapper">
              <label className="field-label">
                <span>{configMap?.['address.perm_district']?.label?.toUpperCase() || 'DISTRICT'}</span>
                {isFieldRequired('address.perm_district', configMap, true) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                type="text"
                className={`field-input ${errors['perm_district'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['address.perm_district']?.placeholder || 'e.g. Nagpur'}
                value={permanentAddress.district}
                onChange={(e) => onPermanentChange('district', e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
              {errors['perm_district'] && <span className="field-error-msg">{errors['perm_district']}</span>}
            </div>
          )}

          {isFieldEnabled('address.perm_pinCode', configMap) && (
            <div className="field-wrapper">
              <label className="field-label">
                <span>{configMap?.['address.perm_pinCode']?.label?.toUpperCase() || 'PIN CODE (6 DIGITS)'}</span>
                {isFieldRequired('address.perm_pinCode', configMap, true) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                type="text"
                maxLength={6}
                className={`field-input ${errors['perm_pinCode'] || errors['perm_pin'] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['address.perm_pinCode']?.placeholder || '440001'}
                value={permanentAddress.pinCode}
                onChange={(e) => onPermanentChange('pinCode', e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
              {(errors['perm_pinCode'] || errors['perm_pin']) && (
                <span className="field-error-msg">{errors['perm_pinCode'] || errors['perm_pin']}</span>
              )}
            </div>
          )}
        </div>

        <div className="joining-grid-2">
          {isFieldEnabled('address.perm_state', configMap) && (
            <div className="field-wrapper">
              <label className="field-label">
                <span>{configMap?.['address.perm_state']?.label?.toUpperCase() || 'STATE'}</span>
                {isFieldRequired('address.perm_state', configMap, true) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
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
          )}

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

        {isFieldEnabled('address.curr_address', configMap) && (
          <div className="field-wrapper">
            <label className="field-label">
              <span>{configMap?.['address.curr_address']?.label?.toUpperCase() || 'RESIDENTIAL ADDRESS'}</span>
              {!sameAsPermanent && isFieldRequired('address.curr_address', configMap, true) ? (
                <span className="field-required-star">*</span>
              ) : (
                <span className="field-optional-tag">(Optional)</span>
              )}
            </label>
            <textarea
              rows={2}
              className={`field-textarea ${errors['curr_address'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
              placeholder={configMap?.['address.curr_address']?.placeholder || 'Current workplace lodging, hostel, or residential address'}
              value={currentAddress.address}
              readOnly={sameAsPermanent || readOnly}
              disabled={readOnly}
              onChange={(e) => onCurrentChange('address', e.target.value)}
            />
            {errors['curr_address'] && <span className="field-error-msg">{errors['curr_address']}</span>}
          </div>
        )}

        <div className="joining-grid-3">
          {isFieldEnabled('address.curr_city', configMap) && (
            <div className="field-wrapper">
              <label className="field-label">
                <span>{configMap?.['address.curr_city']?.label?.toUpperCase() || 'CITY / TOWN'}</span>
                {!sameAsPermanent && isFieldRequired('address.curr_city', configMap, true) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                type="text"
                className={`field-input ${errors['curr_city'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['address.curr_city']?.placeholder || 'Current City'}
                value={currentAddress.city}
                readOnly={sameAsPermanent || readOnly}
                disabled={readOnly}
                onChange={(e) => onCurrentChange('city', e.target.value)}
              />
              {errors['curr_city'] && <span className="field-error-msg">{errors['curr_city']}</span>}
            </div>
          )}

          {isFieldEnabled('address.curr_district', configMap) && (
            <div className="field-wrapper">
              <label className="field-label">
                <span>{configMap?.['address.curr_district']?.label?.toUpperCase() || 'DISTRICT'}</span>
                {!sameAsPermanent && isFieldRequired('address.curr_district', configMap, true) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                type="text"
                className={`field-input ${errors['curr_district'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['address.curr_district']?.placeholder || 'Current District'}
                value={currentAddress.district}
                readOnly={sameAsPermanent || readOnly}
                disabled={readOnly}
                onChange={(e) => onCurrentChange('district', e.target.value)}
              />
              {errors['curr_district'] && <span className="field-error-msg">{errors['curr_district']}</span>}
            </div>
          )}

          {isFieldEnabled('address.curr_pinCode', configMap) && (
            <div className="field-wrapper">
              <label className="field-label">
                <span>{configMap?.['address.curr_pinCode']?.label?.toUpperCase() || 'PIN CODE (6 DIGITS)'}</span>
                {!sameAsPermanent && isFieldRequired('address.curr_pinCode', configMap, true) ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                type="text"
                maxLength={6}
                className={`field-input ${errors['curr_pinCode'] || errors['curr_pin'] ? 'has-error' : ''} ${sameAsPermanent || readOnly ? 'read-only-field' : ''}`}
                placeholder={configMap?.['address.curr_pinCode']?.placeholder || 'PIN code'}
                value={currentAddress.pinCode}
                readOnly={sameAsPermanent || readOnly}
                disabled={readOnly}
                onChange={(e) => onCurrentChange('pinCode', e.target.value)}
              />
              {(errors['curr_pinCode'] || errors['curr_pin']) && (
                <span className="field-error-msg">{errors['curr_pinCode'] || errors['curr_pin']}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EMERGENCY CONTACT */}
      {isFieldEnabled('address.emergency', configMap) && (
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
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-slate-gray)' }}>
                  EMERGENCY CONTACT #{idx + 1}
                </span>
                {!readOnly && emergencyContacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveEmergencyContact(contact.id)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <div className="joining-grid-3">
                <div className="field-wrapper">
                  <label className="field-label">
                    <span>NAME</span>
                    <span className="field-required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`field-input ${errors[`emergency_${contact.id}_name`] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                    placeholder="Relative full name"
                    value={contact.name}
                    onChange={(e) => onEmergencyChange(contact.id, 'name', e.target.value)}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                  {errors[`emergency_${contact.id}_name`] && (
                    <span className="field-error-msg">{errors[`emergency_${contact.id}_name`]}</span>
                  )}
                </div>

                <div className="field-wrapper">
                  <label className="field-label">
                    <span>RELATION</span>
                    <span className="field-required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`field-input ${errors[`emergency_${contact.id}_relation`] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                    placeholder="e.g. Father, Mother, Brother"
                    value={contact.relation}
                    onChange={(e) => onEmergencyChange(contact.id, 'relation', e.target.value)}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                  {errors[`emergency_${contact.id}_relation`] && (
                    <span className="field-error-msg">{errors[`emergency_${contact.id}_relation`]}</span>
                  )}
                </div>

                <div className="field-wrapper">
                  <label className="field-label">
                    <span>PHONE NUMBER</span>
                    <span className="field-required-star">*</span>
                  </label>
                  <div className="field-phone-box">
                    <span className="field-phone-prefix">+91</span>
                    <input
                      type="tel"
                      maxLength={16}
                      className={`field-phone-input ${errors[`emergency_${contact.id}_phone`] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                      placeholder="10-digit mobile"
                      value={contact.contactNumber}
                      onChange={(e) => handleEmergencyPhoneChange(contact.id, e.target.value)}
                      onPaste={(e) => handleEmergencyPhonePaste(contact.id, e)}
                      readOnly={readOnly}
                      disabled={readOnly}
                    />
                  </div>
                  {errors[`emergency_${contact.id}_phone`] && (
                    <span className="field-error-msg">{errors[`emergency_${contact.id}_phone`]}</span>
                  )}
                </div>
              </div>

              <div className="field-wrapper" style={{ marginTop: 'var(--space-3)' }}>
                <label className="field-label">
                  <span>EMERGENCY CONTACT ADDRESS</span>
                  <span className="field-required-star">*</span>
                </label>
                <input
                  type="text"
                  className={`field-input ${errors[`emergency_${contact.id}_address`] ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                  placeholder="Relative residential address / village / city"
                  value={contact.address}
                  onChange={(e) => onEmergencyChange(contact.id, 'address', e.target.value)}
                  readOnly={readOnly}
                  disabled={readOnly}
                />
                {errors[`emergency_${contact.id}_address`] && (
                  <span className="field-error-msg">{errors[`emergency_${contact.id}_address`]}</span>
                )}
              </div>
            </div>
          ))}
          {errors['emergency'] && <span className="field-error-msg">{errors['emergency']}</span>}
        </div>
      )}

      {/* Dynamic Custom Fields configured for Address Section */}
      <CustomFieldsRenderer
        section="address"
        configMap={configMap}
        customFields={customFields}
        onChange={onCustomFieldChange}
        errors={errors}
        readOnly={readOnly}
      />
    </div>
  );
};
