import React from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import type { FamilyMemberRecord } from '../../types/joining';

interface FamilyTableProps {
  records: FamilyMemberRecord[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof FamilyMemberRecord, value: string) => void;
  readOnly?: boolean;
}

export const FamilyTable: React.FC<FamilyTableProps> = ({
  records,
  onAdd,
  onRemove,
  onChange,
  readOnly = false
}) => {
  return (
    <div>
      <div className="joining-step-header">
        <span className="joining-step-tag">STEP 06</span>
        <h2 className="joining-step-title">FAMILY PARTICULARS & DEPENDENTS</h2>
        <p className="joining-step-desc">
          Family member details required for statutory ESIC insurance beneficiary declaration and gratuity nomination.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-midnight-navy)' }}>
          <Users size={18} style={{ color: 'var(--color-champagne-dark)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>FAMILY MEMBERS (UP TO 5)</h3>
        </div>

        {!readOnly && records.length < 5 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onAdd}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <Plus size={14} />
            <span>ADD FAMILY MEMBER</span>
          </button>
        )}
      </div>

      <div className="repeatable-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="repeatable-table">
          <thead>
            <tr>
              <th style={{ width: '45%' }}>Family Member Name</th>
              <th style={{ width: '25%' }}>Date of Birth / Age</th>
              <th style={{ width: '20%' }}>Relationship</th>
              {!readOnly && <th style={{ width: '10%', textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((fam) => (
              <tr key={fam.id}>
                <td>
                  <input
                    type="text"
                    className={`repeatable-input ${readOnly ? 'read-only-field' : ''}`}
                    placeholder="Full name as per Aadhaar"
                    value={fam.name}
                    readOnly={readOnly}
                    disabled={readOnly}
                    onChange={(e) => onChange(fam.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className={`repeatable-input ${readOnly ? 'read-only-field' : ''}`}
                    placeholder="e.g. 52 Yrs / 12-05-1972"
                    value={fam.dateOfBirthOrAge}
                    readOnly={readOnly}
                    disabled={readOnly}
                    onChange={(e) => onChange(fam.id, 'dateOfBirthOrAge', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className={`repeatable-input ${readOnly ? 'read-only-field' : ''}`}
                    value={fam.relation}
                    disabled={readOnly}
                    onChange={(e) => onChange(fam.id, 'relation', e.target.value)}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                  </select>
                </td>
                {!readOnly && (
                  <td style={{ textAlign: 'center' }}>
                    {records.length > 1 && (
                      <button
                        type="button"
                        className="table-remove-btn"
                        onClick={() => onRemove(fam.id)}
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
        * These entries will be directly mapped into the statutory ESIC Form 1 family declaration and EPFO Form 2 nominee schedules in your final joining dossier.
      </p>
    </div>
  );
};
