import React from 'react';

interface FormSectionProps {
  tag: string;
  title: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ tag, title }) => {
  return (
    <div className="form-section-header">
      <div className="form-section-tag">{tag}</div>
      <h3 className="form-section-title">{title}</h3>
    </div>
  );
};
