import React from 'react';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
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
        <h2 className="joining-step-title">ACADEMIC & TECHNICAL QUALIFICATIONS</h2>
        <p className="joining-step-desc">
          Chronological record of school, technical certifications (ITI/Diploma), or college degrees.
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
            <span>ADD EDUCATION</span>
          </button>
        )}
      </div>

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
                    {records.length > 1 && (
                      <button
                        type="button"
                        className="table-remove-btn"
                        onClick={() => onRemove(rec.id)}
                        title="Remove row"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 'var(--space-2) 0 0 0' }}>
        * Maximum 5 educational records can be declared. Attested marksheet copies will be verified during document upload (Step 07).
      </p>
    </div>
  );
};
