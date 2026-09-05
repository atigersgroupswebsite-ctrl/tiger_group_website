import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Briefcase, Calendar, CheckCircle2, ShieldCheck, PhoneCall } from 'lucide-react';
import { Container } from '../components/common/Container';
import { Button } from '../components/common/Button';
import { SAMPLE_JOBS } from '../data/jobsData';

export const JobDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const job = SAMPLE_JOBS.find((j) => j.slug === slug);

  if (!job) {
    return (
      <main style={{ paddingTop: 'calc(var(--header-height) + 4rem)', minHeight: '70vh' }}>
        <Container size="md">
          <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <h2>Job Opportunity Not Found</h2>
            <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
              The job vacancy you are looking for may have expired or been filled.
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
                {job.location}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Briefcase size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                {job.experienceLevel}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={16} style={{ color: 'var(--color-champagne-dark)' }} />
                {job.openings} Active Vacancies
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* Main Details & Sidebar */}
      <section className="section">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-10)',
            alignItems: 'start'
          }} className="job-detail-grid">
            <style>{`
              @media (min-width: 992px) {
                .job-detail-grid {
                  grid-template-columns: 1fr 360px !important;
                }
              }
            `}</style>

            {/* Left Content */}
            <div>
              {/* Role Overview */}
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-3)' }}>Role Overview</h3>
                <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                  {job.overview}
                </p>
              </div>

              {/* Responsibilities */}
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-4)' }}>Key Responsibilities</h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {job.responsibilities.map((resp, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-champagne-dark)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-4)' }}>Candidate Requirements</h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {job.requirements.map((req, i) => (
                    <li key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                      <CheckCircle2 size={18} style={{ color: 'var(--color-midnight-navy)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Facilities / Social Security */}
              {job.facilitiesProvided && (
                <div style={{ marginBottom: 'var(--space-8)' }}>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-4)' }}>Facilities & Statutory Benefits</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                    {job.facilitiesProvided.map((fac, i) => (
                      <div key={i} style={{ background: 'var(--color-pearl-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-midnight-navy)' }}>
                        ✓ {fac}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Application Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #192A56 0%, #111D3B 100%)',
                color: 'var(--color-pearl-white)',
                padding: 'var(--space-8)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid rgba(247, 215, 148, 0.3)',
                marginTop: 'var(--space-6)'
              }}>
                <h4 style={{ color: 'var(--color-pearl-white)', marginBottom: '0.5rem' }}>
                  Ready to apply for this position?
                </h4>
                <p style={{ color: 'var(--color-text-inverse-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)' }}>
                  Submit your candidate details online. Our placement officers will coordinate your interview choice across partner companies.
                </p>
                <Button
                  to={`/enquiry/job-seeker?job=${job.slug}`}
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={18} />}
                >
                  APPLY NOW FOR THIS ROLE
                </Button>
              </div>
            </div>

            {/* Right Sidebar: Summary & Consultancy Rules */}
            <div>
              <div style={{
                background: 'var(--color-pearl-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-6)',
                boxShadow: 'var(--shadow-md)',
                position: 'sticky',
                top: 'calc(var(--header-height) + 2rem)'
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
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Estimated Range (Sample)</span>
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
