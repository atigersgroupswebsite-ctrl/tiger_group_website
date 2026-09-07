import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Briefcase, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Container } from '../components/common/Container';
import { JobCard } from '../components/common/JobCard';
import { Button } from '../components/common/Button';
import { getPublicJobs } from '../services/jobService';
import type { Job } from '../types';

export const Jobs: React.FC = () => {
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const jobs = await getPublicJobs();
      setJobsList(jobs || []);
    } catch (err: any) {
      console.error('Error retrieving active vacancies:', err);
      setError(err?.message || 'Unable to retrieve active vacancies at this time. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = useMemo(() => {
    return jobsList.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.overview.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesState = selectedState === 'All' || job.state === selectedState;
      const matchesCategory = selectedCategory === 'All' || job.serviceCategory === selectedCategory;
      const matchesType = selectedType === 'All' || job.employmentType === selectedType;

      return matchesSearch && matchesState && matchesCategory && matchesType;
    });
  }, [jobsList, searchTerm, selectedState, selectedCategory, selectedType]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedState('All');
    setSelectedCategory('All');
    setSelectedType('All');
  };

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      {/* Header */}
      <section className="section section-pearl" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '3rem' }}>
        <Container size="xl">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(25, 42, 86, 0.05)',
              border: '1px solid rgba(25, 42, 86, 0.1)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              marginBottom: 'var(--space-3)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-midnight-navy)'
            }}>
              <span>A Tiger Group's</span>
              <span style={{ color: 'var(--color-champagne-dark)' }}>→</span>
              <span style={{ color: 'var(--color-champagne-dark)' }}>CAREER SOLUTION & CONSULTANCY</span>
            </div>

            <h1 style={{ marginBottom: 'var(--space-2)' }}>
              CAREER OPPORTUNITIES
            </h1>
            <div style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: 'var(--color-champagne-dark)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 'var(--space-3)'
            }}>
              A TIGER GLOBAL CAREER SOLUTION & CONSULTANCY
            </div>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
              Browse genuine industrial, warehousing, security, and technical job openings across Maharashtra, Madhya Pradesh, and Chhattisgarh.
            </p>
          </div>
        </Container>
      </section>

      {/* Filter Bar & Job Listings */}
      <section className="section" style={{ minHeight: '60vh' }}>
        <Container size="xl">
          {/* Error Alert */}
          {error && (
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.5rem',
              marginBottom: 'var(--space-6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991B1B', fontSize: 'var(--text-sm)' }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchJobs}
                className="btn-admin-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="jobs-filter-bar">
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search job title, skill, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
              />
              <Search
                size={18}
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}
              />
            </div>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="form-control form-select"
            >
              <option value="All">All States (3)</option>
              <option value="Maharashtra">Maharashtra (Nagpur)</option>
              <option value="Madhya Pradesh">Madhya Pradesh (Bhopal/Indore)</option>
              <option value="Chhattisgarh">Chhattisgarh (Raipur/Bilaspur)</option>
            </select>

            {/* Service Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-control form-select"
            >
              <option value="All">All Categories</option>
              <option value="Job Placement">Job Placement</option>
              <option value="Labour Supply">Labour Supply</option>
              <option value="Security Services">Security Services</option>
            </select>

            {/* Employment Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-control form-select"
            >
              <option value="All">All Job Types</option>
              <option value="Full Time">Full Time</option>
              <option value="Contract">Contract</option>
              <option value="Rotational Shift">Rotational Shift</option>
            </select>
          </div>

          {/* Results Count & Reset */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-midnight-navy)', fontWeight: 600 }}>
              Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'Opportunity' : 'Opportunities'}{isLoading ? ' (Loading live openings...)' : ''}
            </span>

            {(searchTerm || selectedState !== 'All' || selectedCategory !== 'All' || selectedType !== 'All') && (
              <button
                type="button"
                onClick={resetFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--text-xs)', color: 'var(--color-dusty-rose-dark)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <RefreshCw size={12} /> Reset Filters
              </button>
            )}
          </div>

          {/* Loading state */}
          {isLoading && jobsList.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-16) var(--space-8)',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-midnight-navy)' }} />
              <p style={{ fontSize: 'var(--text-sm)' }}>Fetching current job openings from employer network...</p>
            </div>
          )}

          {/* Job Cards List */}
          {!isLoading && filteredJobs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Empty State: Zero Openings in Database */}
          {!isLoading && !error && jobsList.length === 0 && (
            <div style={{
              background: 'var(--color-pearl-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-16) var(--space-8)',
              textAlign: 'center',
              border: '1px dashed var(--color-border)'
            }}>
              <Briefcase size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3 style={{ color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-2)' }}>
                No Current Openings
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '480px', margin: '0 auto var(--space-6)' }}>
                There are currently no active job vacancies available in this cycle. New employer requirements are published regularly. You can submit a candidate enquiry for future placement.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)' }}>
                <Button to="/enquiry/job-seeker" variant="primary" size="sm">
                  Submit Candidate Enquiry
                </Button>
              </div>
            </div>
          )}

          {/* Empty State: Filter mismatch */}
          {!isLoading && !error && jobsList.length > 0 && filteredJobs.length === 0 && (
            <div style={{
              background: 'var(--color-pearl-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-16) var(--space-8)',
              textAlign: 'center',
              border: '1px dashed var(--color-border)'
            }}>
              <Briefcase size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3 style={{ color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-2)' }}>
                No Matching Opportunities Found
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '460px', margin: '0 auto var(--space-6)' }}>
                We couldn't find any roles matching your current search criteria. Try adjusting your filters or submit a general application.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)' }}>
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Clear Filters
                </Button>
                <Button to="/enquiry/job-seeker" variant="primary" size="sm">
                  Submit Candidate Enquiry
                </Button>
              </div>
            </div>
          )}
        </Container>
      </section>
    </main>
  );
};
