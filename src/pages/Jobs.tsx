import React, { useState, useMemo } from 'react';
import { Search, Briefcase, RefreshCw } from 'lucide-react';
import { Container } from '../components/common/Container';
import { JobCard } from '../components/common/JobCard';
import { Button } from '../components/common/Button';
import { SAMPLE_JOBS } from '../data/jobsData';

export const Jobs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  const filteredJobs = useMemo(() => {
    return SAMPLE_JOBS.filter((job) => {
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
  }, [searchTerm, selectedState, selectedCategory, selectedType]);

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
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
              Note: Sample listings represent verified employer roles configured for Phase 1 demonstration.
            </div>
          </div>
        </Container>
      </section>

      {/* Filter Bar & Job Listings */}
      <section className="section" style={{ minHeight: '60vh' }}>
        <Container size="xl">
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
              Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'Opportunity' : 'Opportunities'}
            </span>

            {(searchTerm || selectedState !== 'All' || selectedCategory !== 'All' || selectedType !== 'All') && (
              <button
                type="button"
                onClick={resetFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--text-xs)', color: 'var(--color-dusty-rose-dark)', fontWeight: 600 }}
              >
                <RefreshCw size={12} /> Reset Filters
              </button>
            )}
          </div>

          {/* Job Cards List */}
          {filteredJobs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            /* Empty State */
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
                <Button to="/enquiry" variant="primary" size="sm">
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
