import React, { useState } from 'react';
import { Building2, ShieldCheck, Users, ArrowRight, CheckCircle2, PhoneCall } from 'lucide-react';
import { Container } from '../components/common/Container';
import { SectionHeading } from '../components/common/SectionHeading';
import { FormField } from '../components/common/FormField';
import { Button } from '../components/common/Button';

export const Employers: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    district: '',
    state: 'Maharashtra',
    serviceRequired: 'Labour Supply',
    workerQuantity: '10 - 25',
    workType: '',
    description: '',
    accommodationProvided: 'No',
    foodProvided: 'No'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
      {/* Hero */}
      <section className="section section-navy" style={{ paddingBottom: '4.5rem' }}>
        <Container size="xl">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <span className="eyebrow eyebrow-navy">Enterprise Staffing Solutions</span>
            <h1 style={{ color: 'var(--color-pearl-white)', marginBottom: 'var(--space-4)', fontSize: 'clamp(2.4rem, 4.5vw, 3.75rem)' }}>
              BUILD A STRONGER WORKFORCE.
            </h1>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-inverse-muted)', lineHeight: 1.65, marginBottom: 'var(--space-8)' }}>
              A Tiger Global helps manufacturing plants, logistics hubs, and commercial facilities access dependable manpower, labour, and security personnel across Maharashtra, Madhya Pradesh, and Chhattisgarh.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <Button to="/enquiry/employer" variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                SUBMIT MANPOWER REQUIREMENT
              </Button>
              <a href="tel:+918349353946" className="btn btn-outline-light btn-lg">
                <PhoneCall size={18} />
                <span>TALK TO OUR TEAM</span>
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Corporate Capabilities */}
      <section className="section">
        <Container size="xl">
          <SectionHeading
            eyebrow="What We Supply"
            title="TAILORED INDUSTRIAL STAFFING"
            subtitle="Supplying qualified personnel to fit your production schedules, assembly lines, and perimeter security requirements."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-8)' }}>
            {/* Capability 1 */}
            <div className="card">
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-champagne-light)',
                color: 'var(--color-midnight-navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-5)',
                border: '1px solid rgba(247, 215, 148, 0.6)'
              }}>
                <Users size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-3)' }}>Manpower & Labour Supply</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Supplying semi-skilled and general helpers for manufacturing lines, food packaging units, glass fabrication, and logistics loading docks.
              </p>
              <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-midnight-navy)', fontWeight: 600, marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>✓ Rotational 8hr / 12hr shift staffing</li>
                <li>✓ Immediate bulk deployment (10 - 100+ workers)</li>
                <li>✓ Daily attendance & muster management</li>
              </ul>
            </div>

            {/* Capability 2 */}
            <div className="card">
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-champagne-light)',
                color: 'var(--color-midnight-navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-5)',
                border: '1px solid rgba(247, 215, 148, 0.6)'
              }}>
                <ShieldCheck size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-3)' }}>Security Guard Supply</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Vetted, disciplined security personnel and shift supervisors for gate security, perimeter patrols, vehicle tracking, and asset surveillance.
              </p>
              <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-midnight-navy)', fontWeight: 600, marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>✓ Height & physical fitness benchmarked</li>
                <li>✓ 100% Police verification records on file</li>
                <li>✓ Standardized dark navy uniforms & badges</li>
              </ul>
            </div>

            {/* Capability 3 */}
            <div className="card">
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-champagne-light)',
                color: 'var(--color-midnight-navy)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-5)',
                border: '1px solid rgba(247, 215, 148, 0.6)'
              }}>
                <Building2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-3)' }}>Labour Contracting & Compliance</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                End-to-end statutory compliance handling: Provident Fund (PF), ESIC enrollment, digital bank payout verifications, and zero child labour assurance.
              </p>
              <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-midnight-navy)', fontWeight: 600, marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>✓ Legal & civil document inspection</li>
                <li>✓ Transparent commercial rate quotations</li>
                <li>✓ Dedicated central coordinator in Nagpur</li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* How Employers Partner With Us (Process) */}
      <section className="section section-pearl">
        <Container size="xl">
          <SectionHeading
            eyebrow="Deployment Process"
            title="HOW WE ENGAGE"
            subtitle="A structured 4-stage engagement protocol designed for rapid industrial deployment."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ color: 'var(--color-champagne-dark)', fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>01</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Requirement Audit</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Submit employee count, required work profiles, location, shift hours, and safety specifications.
              </p>
            </div>

            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ color: 'var(--color-champagne-dark)', fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>02</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Rate Quotation</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Clear commercial proposals covering wage structure, PF, ESIC statutory contributions, and supervision costs.
              </p>
            </div>

            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ color: 'var(--color-champagne-dark)', fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>03</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Screening & KYC</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Verification of original documents, background checking, and physical readiness tests before deployment.
              </p>
            </div>

            <div className="card" style={{ padding: 'var(--space-6)' }}>
              <div style={{ color: 'var(--color-champagne-dark)', fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.5rem' }}>04</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Plant Deployment</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                Reporting of workforce to your plant gate with Form-5 joining dossiers and continuous supervisory management.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Employer Rate Quote Inquiry Form */}
      <section className="section" id="rate-quote">
        <Container size="md">
          <div style={{
            background: 'var(--color-pearl-white)',
            borderRadius: 'var(--radius-2xl)',
            border: '1px solid var(--color-border)',
            padding: 'clamp(2rem, 5vw, 3.5rem)',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
              <span className="eyebrow">Direct Commercial Inquiry</span>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: 'var(--space-2)' }}>
                Employer's Rate Quote Inquiry
              </h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Fill out your plant or organization's requirements for an official commercial proposal.
              </p>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                <CheckCircle2 size={54} style={{ color: 'var(--color-champagne-dark)', margin: '0 auto var(--space-4)' }} />
                <h3 style={{ color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-3)' }}>
                  Inquiry Received Successfully
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)', maxWidth: '500px', margin: '0 auto var(--space-6)', lineHeight: 1.6 }}>
                  Thank you, <strong>{formData.companyName}</strong>. Our enterprise business team in Nagpur will review your requirements and provide a formal quotation within 24 business hours.
                </p>
                <a href="tel:+918349353946" className="btn btn-navy">
                  <PhoneCall size={16} />
                  <span>Call Direct: +91 8349353946</span>
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <FormField
                    label="Firm / Company Name"
                    name="companyName"
                    value={formData.companyName}
                    placeholder="e.g. ABC Packaging Pvt. Ltd."
                    required
                    onChange={handleChange}
                  />

                  <FormField
                    label="Contact Person & Designation"
                    name="contactPerson"
                    value={formData.contactPerson}
                    placeholder="e.g. R. Sharma (Plant Head)"
                    required
                    onChange={handleChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <FormField
                    label="Official Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    placeholder="name@company.com"
                    required
                    onChange={handleChange}
                  />

                  <FormField
                    label="Phone / Mobile Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    placeholder="10-digit phone number"
                    required
                    onChange={handleChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <FormField
                    label="District / Plant Location"
                    name="district"
                    value={formData.district}
                    placeholder="e.g. Nagpur (Butibori), Bhopal, Raipur"
                    required
                    onChange={handleChange}
                  />

                  <FormField
                    label="Operating State"
                    name="state"
                    type="select"
                    value={formData.state}
                    options={[
                      { value: 'Maharashtra', label: 'Maharashtra' },
                      { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
                      { value: 'Chhattisgarh', label: 'Chhattisgarh' }
                    ]}
                    required
                    onChange={handleChange}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <FormField
                    label="Service Required"
                    name="serviceRequired"
                    type="select"
                    value={formData.serviceRequired}
                    options={[
                      { value: 'Labour Supply', label: 'Industrial Labour & Manpower Supply' },
                      { value: 'Security Services', label: 'Security Guard Supply' },
                      { value: 'Job Placement', label: 'Technical & Skilled Staff Placement' }
                    ]}
                    required
                    onChange={handleChange}
                  />

                  <FormField
                    label="Employee Quantity Needed"
                    name="workerQuantity"
                    type="select"
                    value={formData.workerQuantity}
                    options={[
                      { value: '5 - 15', label: '5 - 15 Workers' },
                      { value: '15 - 30', label: '15 - 30 Workers' },
                      { value: '30 - 60', label: '30 - 60 Workers' },
                      { value: '60 - 100+', label: '60 - 100+ Workers' }
                    ]}
                    required
                    onChange={handleChange}
                  />
                </div>

                <FormField
                  label="What is the Employee Work / Scope?"
                  name="workType"
                  value={formData.workType}
                  placeholder="e.g. Food packet packing, furnace assistance, warehouse loading, gate security..."
                  required
                  onChange={handleChange}
                />

                <FormField
                  label="Additional Description & Specifications"
                  name="description"
                  type="textarea"
                  rows={3}
                  value={formData.description}
                  placeholder="Include shift timings, whether accommodation or food facilities are provided on-site, target start date..."
                  onChange={handleChange}
                />

                <Button type="submit" variant="primary" size="lg" style={{ width: '100%', marginTop: 'var(--space-4)' }} icon={<ArrowRight size={18} />}>
                  SUBMIT RATE QUOTE INQUIRY
                </Button>
              </form>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
};
