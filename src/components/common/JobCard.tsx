import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Briefcase, ArrowRight } from 'lucide-react';
import type { Job } from '../../types';
import { Button } from './Button';

interface JobCardProps {
  job: Job;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <div className="job-card">
      <div className="job-card-main">
        <div className="job-card-badges">
          <span className="badge badge-navy">
            <Briefcase size={12} />
            {job.department}
          </span>
          <span className="badge badge-gold">
            <MapPin size={12} />
            {job.state}
          </span>
          <span className="badge badge-rose">
            {job.employmentType}
          </span>
          {job.isFeatured && (
            <span className="badge badge-green">
              Featured
            </span>
          )}
        </div>

        <Link to={`/jobs/${job.slug}`}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-midnight-navy)', margin: '0.2rem 0' }}>
            {job.title}
          </h3>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={14} />
            {job.location}
          </span>
          <span>•</span>
          <span>{job.experienceLevel}</span>
          <span>•</span>
          <span style={{ color: 'var(--color-midnight-navy)', fontWeight: 600 }}>{job.openings} Vacancies</span>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: '0.4rem 0 0 0', maxWidth: '680px' }}>
          {job.overview}
        </p>

        {job.salaryRange && (
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>
            Estimated Package: <strong style={{ color: 'var(--color-midnight-navy)' }}>{job.salaryRange}</strong>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginTop: '0.5rem' }}>
        <Button to={`/jobs/${job.slug}`} variant="outline" size="sm">
          Details
        </Button>
        <Button
          to={`/enquiry/job-seeker?job=${job.slug}`}
          variant="primary"
          size="sm"
          icon={<ArrowRight size={14} />}
        >
          Apply Now
        </Button>
      </div>
    </div>
  );
};
