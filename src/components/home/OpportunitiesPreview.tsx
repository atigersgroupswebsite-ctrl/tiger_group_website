import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Container } from '../common/Container';
import { SectionHeading } from '../common/SectionHeading';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';
import { JobCard } from '../common/JobCard';
import { SAMPLE_JOBS } from '../../data/jobsData';

export const OpportunitiesPreview: React.FC = () => {
  const previewJobs = SAMPLE_JOBS.slice(0, 3);

  return (
    <section className="section section-pearl" id="opportunities-preview">
      <Container size="xl">
        <SectionHeading
          eyebrow="Open Roles (Demo Data)"
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
