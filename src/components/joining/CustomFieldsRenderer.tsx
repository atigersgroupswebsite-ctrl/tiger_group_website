// ==============================================================================
// File: src/components/joining/CustomFieldsRenderer.tsx
// Description: Dynamic Custom Fields Renderer for Configured Joining Form Sections
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// ==============================================================================

import React from 'react';
import type { JoiningFieldConfig } from '../../types/joining';

interface CustomFieldsRendererProps {
  section: string;
  configMap?: Record<string, JoiningFieldConfig>;
  customFields?: Record<string, any>;
  onChange?: (fieldKey: string, value: any) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
}

export const CustomFieldsRenderer: React.FC<CustomFieldsRendererProps> = ({
  section,
  configMap,
  customFields = {},
  onChange,
  errors = {},
  readOnly = false
}) => {
  if (!configMap) return null;

  const fieldsForSection = Object.values(configMap)
    .filter((f) => !f.is_system && f.is_enabled && f.section === section)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  if (fieldsForSection.length === 0) return null;

  return (
    <div className="custom-fields-section-container" style={{ marginTop: '1.25rem' }}>
      <div className="joining-grid-2">
        {fieldsForSection.map((field) => {
          const value = customFields[field.field_key] ?? '';
          const fieldError = errors[field.field_key];

          if (field.field_type === 'checkbox') {
            return (
              <div key={field.id} className="field-wrapper full-width" style={{ gridColumn: 'span 2' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange?.(field.field_key, e.target.checked)}
                    disabled={readOnly}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1F2937' }}>
                    {field.label}
                  </span>
                  {field.is_required ? (
                    <span className="field-required-star">*</span>
                  ) : (
                    <span className="field-optional-tag">(Optional)</span>
                  )}
                </label>
                {field.help_text && (
                  <p style={{ margin: '4px 0 0 26px', fontSize: '0.75rem', color: '#6B7280' }}>
                    {field.help_text}
                  </p>
                )}
                {fieldError && <span className="field-error-msg" style={{ marginLeft: '26px' }}>{fieldError}</span>}
              </div>
            );
          }

          if (field.field_type === 'textarea') {
            return (
              <div key={field.id} className="field-wrapper full-width" style={{ gridColumn: 'span 2' }}>
                <label className="field-label" htmlFor={field.field_key}>
                  <span>{field.label.toUpperCase()}</span>
                  {field.is_required ? (
                    <span className="field-required-star">*</span>
                  ) : (
                    <span className="field-optional-tag">(Optional)</span>
                  )}
                </label>
                <textarea
                  id={field.field_key}
                  className={`field-input ${fieldError ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                  placeholder={field.placeholder || ''}
                  value={value}
                  onChange={(e) => onChange?.(field.field_key, e.target.value)}
                  readOnly={readOnly}
                  disabled={readOnly}
                  rows={3}
                />
                {field.help_text && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>{field.help_text}</p>
                )}
                {fieldError && <span className="field-error-msg">{fieldError}</span>}
              </div>
            );
          }

          if (field.field_type === 'select') {
            const options = field.options || [];
            return (
              <div key={field.id} className="field-wrapper">
                <label className="field-label" htmlFor={field.field_key}>
                  <span>{field.label.toUpperCase()}</span>
                  {field.is_required ? (
                    <span className="field-required-star">*</span>
                  ) : (
                    <span className="field-optional-tag">(Optional)</span>
                  )}
                </label>
                <select
                  id={field.field_key}
                  className={`field-select ${fieldError ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                  value={value}
                  onChange={(e) => onChange?.(field.field_key, e.target.value)}
                  disabled={readOnly}
                >
                  <option value="">{field.placeholder || 'Select an option'}</option>
                  {options.map((opt, oIdx) => (
                    <option key={oIdx} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {field.help_text && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>{field.help_text}</p>
                )}
                {fieldError && <span className="field-error-msg">{fieldError}</span>}
              </div>
            );
          }

          // text, number, date, email, phone
          const inputType =
            field.field_type === 'phone'
              ? 'tel'
              : field.field_type === 'email'
              ? 'email'
              : field.field_type === 'number'
              ? 'number'
              : field.field_type === 'date'
              ? 'date'
              : 'text';

          return (
            <div key={field.id} className="field-wrapper">
              <label className="field-label" htmlFor={field.field_key}>
                <span>{field.label.toUpperCase()}</span>
                {field.is_required ? (
                  <span className="field-required-star">*</span>
                ) : (
                  <span className="field-optional-tag">(Optional)</span>
                )}
              </label>
              <input
                id={field.field_key}
                type={inputType}
                className={`field-input ${fieldError ? 'has-error' : ''} ${readOnly ? 'read-only-field' : ''}`}
                placeholder={field.placeholder || ''}
                value={value}
                onChange={(e) => onChange?.(field.field_key, e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
              />
              {field.help_text && (
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6B7280' }}>{field.help_text}</p>
              )}
              {fieldError && <span className="field-error-msg">{fieldError}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
