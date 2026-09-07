import React from 'react';
import { Plus, Trash2, GraduationCap, CheckCircle } from 'lucide-react';
import type { EducationRecord } from '../../types/joining';

interface EducationTableProps {
  records: EducationRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof EducationRecord, value: string) => void;
  readOnly?: boolean;
}

export const EducationTable: React.FC<EducationTableProps> = ({
  records,
  onAdd,
  onRemove,
  onChange,
  readOnly = false
}) => {
  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 05</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <h2 className="joining-step-title" style={{ margin: 0 }}>
            ACADEMIC & TECHNICAL QUALIFICATIONS
          </h2>
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}
          >
            OPTIONAL
          </span>
        </div>
        <p className="joining-step-desc">
          Education is completely optional. You may declare up to 5 qualification records (School, ITI/Diploma, College), or proceed directly to the next step without entering education.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)' }}>
          <GraduationCap size={18} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>QUALIFICATION ENTRIES</h3>
        </div>

        {!readOnly && records.length < 5 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onAdd}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <Plus size={14} />
            <span>ADD QUALIFICATION</span>
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div
          style={{
            border: '1.5px dashed rgba(25, 42, 86, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#16A34A', marginBottom: '0.5rem' }}>
            <CheckCircle size={18} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>No Education Records Added (Valid)</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '520px', margin: '0 auto 1rem', lineHeight: 1.5 }}>
            Education is not mandatory for this role. You may leave this section empty and proceed, or add qualifications if you wish to record them.
          </p>
          {!readOnly && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAdd}
              style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
            >
              <Plus size={14} />
              <span>Add Qualification (Optional)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="repeatable-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="repeatable-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Qualification</th>
                <th style={{ width: '35%' }}>Board / University</th>
                <th style={{ width: '15%' }}>Passing Year</th>
                <th style={{ width: '15%' }}>Percentage / Grade</th>
                {!readOnly && <th style={{ width: '10%', textAlign: 'center' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id}>
                  <td>
                    <input
                      type="text"
                      className={`repeatable-input ${readOnly ? 'read-only-field' : ''}`}
                      placeholder="e.g. 10th / ITI / B.Com"
                      value={rec.qualification}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(e) => onChange(rec.id, 'qualification', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`repeatable-input ${readOnly ? 'read-only-field' : ''}`}
                      placeholder="Board or Institution name"
                      value={rec.boardOrUniversity}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(e) => onChange(rec.id, 'boardOrUniversity', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      maxLength={4}
                      className={`repeatable-input ${readOnly ? 'read-only-field' : ''}`}
                      placeholder="YYYY"
                      value={rec.yearOfPassing}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(e) => onChange(rec.id, 'yearOfPassing', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className={`repeatable-input ${readOnly ? 'read-only-field' : ''}`}
                      placeholder="e.g. 68.5%"
                      value={rec.percentageOrGrade}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(e) => onChange(rec.id, 'percentageOrGrade', e.target.value)}
                    />
                  </td>
                  {!readOnly && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="table-remove-btn"
                        onClick={() => onRemove(rec.id)}
                        title="Remove row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-3) 0 0 0' }}>
        * Education is optional. Maximum 5 qualification records can be submitted.
      </p>
    </div>
  );
};
