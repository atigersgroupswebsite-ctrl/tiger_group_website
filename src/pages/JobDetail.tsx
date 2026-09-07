import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Briefcase, Calendar, CheckCircle2, ShieldCheck, PhoneCall, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';
import { getPublicJobBySlugOrId } from '../services/jobService';
import type { Job } from '../types';

export const JobDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      let isMounted = true;
      setIsLoading(true);
      setError(null);

      getPublicJobBySlugOrId(slug)
        .then((res) => {
          if (isMounted) {
            setJob(res);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err?.message || 'Failed to load opportunity details.');
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [slug]);

  if (isLoading) {
    return (
      <main style={{ paddingTop: 'calc(var(--header-height) + 4rem)', minHeight: '70vh' }}>
        <Container size="md">
          <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-8)' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-midnight-navy)', margin: '0 auto var(--space-4)' }} />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              Loading opportunity details...
            </p>
          </div>
        </Container>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main style={{ paddingTop: 'calc(var(--header-height) + 4rem)', minHeight: '70vh' }}>
        <Container size="md">
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', background: 'var(--color-pearl-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
            <AlertCircle size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto var(--space-4)' }} />
            <h2>Job Opportunity Not Found</h2>
            <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)', maxWidth: '460px', margin: '1rem auto 0' }}>
              The job vacancy you are looking for may have expired, been paused, or filled. Please browse our active listings.
            </p>
            <div style={{ marginTop: '2rem' }}>
              <Button to="/jobs" variant="primary" icon={<ArrowLeft size={16} />} iconPosition="left">
                Back to All Jobs
              </Button>
            </div>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      {/* Breadcrumb & Navigation */}
      <section className="section-sm section-pearl" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Container size="xl">
          <Link
            to="/jobs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-midnight-navy)',
              marginBottom: 'var(--space-4)'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to All Opportunities</span>
          </Link>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-2)'
          }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className="badge badge-navy">{job.department}</span>
              <span className="badge badge-gold">{job.state}</span>
              <span className="badge badge-rose">{job.employmentType}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--color-midnight-navy)', margin: 0 }}>
              {job.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                <span>{job.location} ({job.state})</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Briefcase size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                <span>{job.openings} {job.openings === 1 ? 'Opening' : 'Openings'}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                <span>Posted: {job.postedDate}</span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Details Layout */}
      <section className="section" style={{ background: '#FFFFFF' }}>
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
            gap: 'var(--space-12)',
            alignItems: 'start'
          }}>
            {/* Left Column: Scope & Requirements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
              {/* Role Overview */}
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-4)' }}>
                  Role Overview
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: 'var(--text-base)' }}>
                  {job.overview}
                </p>
              </div>

              {/* Responsibilities */}
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-4)' }}>
                  Key Responsibilities
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {job.responsibilities.map((resp, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '3px' }} />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-4)' }}>
                  Candidate Requirements
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {job.requirements.map((req, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-dusty-rose-dark)', flexShrink: 0, marginTop: '3px' }} />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Facilities & Welfare */}
              {job.facilitiesProvided && job.facilitiesProvided.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1.4rem', color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-4)' }}>
                    Benefits & Statutory Welfare
                  </h3>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {job.facilitiesProvided.map((facility, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: 'var(--color-pearl-surface)',
                          border: '1px solid var(--color-border)',
                          padding: '0.4rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 600,
                          color: 'var(--color-midnight-navy)'
                        }}
                      >
                        ✓ {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Action Card */}
            <div style={{ position: 'sticky', top: 'calc(var(--header-height) + 2rem)' }}>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                boxShadow: 'var(--shadow-md)'
              }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                  Opportunity Summary
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Location</span>
                    <div style={{ fontWeight: 600, color: 'var(--color-midnight-navy)' }}>{job.location}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>State Corridor</span>
                    <div style={{ fontWeight: 600, color: 'var(--color-midnight-navy)' }}>{job.state}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Employment Type</span>
                    <div style={{ fontWeight: 600, color: 'var(--color-midnight-navy)' }}>{job.employmentType}</div>
                  </div>
                  {job.salaryRange && (
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Estimated Salary Range</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-midnight-navy)' }}>{job.salaryRange}</div>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Office Timings For Submission</span>
                    <div style={{ fontWeight: 600, color: 'var(--color-midnight-navy)' }}>11:00 AM to 4:00 PM</div>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                  <Button
                    to={`/enquiry/job-seeker?job=${job.slug}`}
                    variant="primary"
                    size="lg"
                    style={{ width: '100%' }}
                    icon={<ArrowRight size={18} />}
                  >
                    APPLY NOW
                  </Button>

                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <a
                      href="tel:+918349353946"
                      style={{ fontSize: '0.85rem', color: 'var(--color-midnight-navy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <PhoneCall size={14} /> Call Desk: +91 8349353946
                    </a>
                  </div>
                </div>

                {/* Statutory Note */}
                <div style={{
                  marginTop: 'var(--space-6)',
                  background: 'var(--color-pearl-surface)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5
                }}>
                  <ShieldCheck size={14} style={{ color: 'var(--color-champagne-dark)', display: 'inline', marginRight: '4px' }} />
                  Joining the referred company is free of charge. Consult official 10-point terms for registration details.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
};
