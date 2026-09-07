import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';
import { JobCard } from '../common/JobCard';
import { getPublicJobs } from '../../services/jobService';
import type { Job } from '../../types';

export const OpportunitiesPreview: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getPublicJobs()
      .then((res) => {
        if (isMounted) {
          setJobs(res || []);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch preview jobs:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const previewJobs = jobs.slice(0, 3);

  // If loading or no jobs, still provide the section cleanly without fake demo jobs
  if (!loading && previewJobs.length === 0) {
    return null;
  }

  return (
    <section className="section section-pearl" id="opportunities-preview">
      <Container size="xl">
        <SectionHeading
          eyebrow="Verified Opportunities"
          title="FIND YOUR NEXT OPPORTUNITY"
          subtitle="Explore verified industrial, security, and technical vacancies across our partner employer network."
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-10)' }}>
          {previewJobs.map((job, index) => (
            <ScrollReveal key={job.id} delay={index * 0.1} direction="up">
              <JobCard job={job} />
            </ScrollReveal>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Button to="/jobs" variant="navy" size="lg" icon={<ArrowRight size={18} />}>
            VIEW ALL JOBS
          </Button>
        </div>
      </Container>
    </section>
  );
};
