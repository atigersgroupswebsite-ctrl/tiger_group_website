import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, ShieldCheck, Home } from 'lucide-react';
import { Container } from '../components/common/Container';
import { ProgressIndicator } from '../components/common/ProgressIndicator';
import { FormField } from '../components/common/FormField';
import { Button } from '../components/common/Button';
import type { EnquiryFormState } from '../types';
import { SAMPLE_JOBS } from '../data/jobsData';

export const Enquiry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedJobSlug = searchParams.get('job');
  const matchedJob = SAMPLE_JOBS.find((j) => j.slug === preselectedJobSlug);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<EnquiryFormState>({
    fullName: '',
    fatherName: '',
    dob: '',
    gender: 'Male',
    serviceCategory: matchedJob ? matchedJob.serviceCategory : 'Job Placement',
    preferredJobRole: matchedJob ? matchedJob.title : '',
    preferredState: matchedJob ? matchedJob.state : 'Maharashtra',
    availability: 'Immediate',
    qualification: '10th Pass',
    experienceYears: 'Fresher (0 Years)',
    previousCompany: '',
    skills: '',
    mobileNumber: '',
    alternateNumber: '',
    email: '',
    currentAddress: '',
    city: 'Nagpur',
    state: 'Maharashtra',
    hasOriginalDocuments: true,
    acceptedPolicy: false
  });

  // Prepopulate if query param changes
  useEffect(() => {
    if (matchedJob) {
      setFormData((prev) => ({
        ...prev,
        serviceCategory: matchedJob.serviceCategory,
        preferredJobRole: matchedJob.title,
        preferredState: matchedJob.state
      }));
    }
  }, [matchedJob]);

  const steps = [
    { number: 1, label: 'Personal' },
    { number: 2, label: 'Preferences' },
    { number: 3, label: 'Education' },
    { number: 4, label: 'Contact' },
    { number: 5, label: 'Review' }
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
      if (!formData.fatherName.trim()) newErrors.fatherName = "Father's Name is required";
    } else if (stepNumber === 2) {
      if (!formData.preferredJobRole.trim()) newErrors.preferredJobRole = 'Job role or inquiry is required';
    } else if (stepNumber === 3) {
      if (!formData.qualification.trim()) newErrors.qualification = 'Please select qualification';
    } else if (stepNumber === 4) {
      if (!formData.mobileNumber.trim()) {
        newErrors.mobileNumber = 'Mobile number is required';
      } else if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
        newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
      }
      if (!formData.currentAddress.trim()) newErrors.currentAddress = 'Current address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
    } else if (stepNumber === 5) {
      if (!formData.acceptedPolicy) {
        newErrors.acceptedPolicy = 'You must accept the official consultancy terms to proceed.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      } else {
        // Submit
        setIsSubmitted(true);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)', minHeight: '85vh', paddingBottom: '5rem' }}>
      {/* Header */}
      <section className="section-sm section-pearl" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Container size="md">
          <div style={{ textAlign: 'center' }}>
            <span className="eyebrow">Candidate Portal</span>
            <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', marginBottom: 'var(--space-2)' }}>
              CANDIDATE ENQUIRY
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '560px', margin: '0 auto' }}>
              Complete the structured multi-step inquiry to register for interviews with verified employers across Central India.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Wizard Form Container */}
      <section className="section-sm">
        <Container size="md">
          <div className="wizard-container">
            {isSubmitted ? (
              /* Success State */
              <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'var(--color-champagne-light)',
                  color: 'var(--color-midnight-navy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-6)',
                  border: '2px solid rgba(247, 215, 148, 0.8)'
                }}>
                  <CheckCircle2 size={40} />
                </div>

                <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-3)', color: 'var(--color-midnight-navy)' }}>
                  Enquiry Submitted Successfully!
                </h2>

                <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', maxWidth: '540px', margin: '0 auto var(--space-8)', lineHeight: 1.65 }}>
                  Thank you, <strong>{formData.fullName}</strong>. Your candidate inquiry has been generated for <strong>{formData.preferredJobRole}</strong>.
                </p>

                <div style={{
                  background: 'var(--color-pearl-surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-6)',
                  border: '1px solid var(--color-border)',
                  maxWidth: '540px',
                  margin: '0 auto var(--space-8)',
                  textAlign: 'left'
                }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--color-midnight-navy)', marginBottom: '0.5rem' }}>
                    Next Steps for Joining:
                  </h4>
                  <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>1. Bring your original documents (Aadhaar, PAN, Bank passbook, educational marksheets) to our Nagpur office.</li>
                    <li>2. Office hours: <strong>11:00 AM to 4:00 PM</strong>.</li>
                    <li>3. Our placement coordinator will arrange your interview selection across 3 partner organizations.</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <Button to="/jobs" variant="outline">
                    Browse Other Jobs
                  </Button>
                  <Button to="/" variant="primary" icon={<Home size={16} />}>
                    Return to Homepage
                  </Button>
                </div>
              </div>
            ) : (
              /* Multi-step Form */
              <div>
                <ProgressIndicator
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={(step) => {
                    if (step < currentStep) setCurrentStep(step);
                  }}
                />

                {/* Preselected Notice if coming from a job card */}
                {matchedJob && (
                  <div style={{
                    background: 'var(--color-champagne-light)',
                    border: '1px solid rgba(247, 215, 148, 0.8)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.6rem 1rem',
                    marginBottom: 'var(--space-6)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-midnight-navy)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <FileText size={15} />
                    <span>Applying specifically for: <strong>{matchedJob.title}</strong> ({matchedJob.location})</span>
                  </div>
                )}

                {/* STEP 1: Personal Information */}
                {currentStep === 1 && (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
                      01. Personal Information
                    </h3>

                    <FormField
                      label="Candidate Full Name"
                      name="fullName"
                      value={formData.fullName}
                      placeholder="Enter your complete full name"
                      required
                      error={errors.fullName}
                      onChange={handleInputChange}
                    />

                    <FormField
                      label="Father's / Guardian's Name"
                      name="fatherName"
                      value={formData.fatherName}
                      placeholder="Enter father's or husband's name"
                      required
                      error={errors.fatherName}
                      onChange={handleInputChange}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                      <FormField
                        label="Date of Birth"
                        name="dob"
                        type="date"
                        value={formData.dob}
                        onChange={handleInputChange}
                      />

                      <FormField
                        label="Gender"
                        name="gender"
                        type="select"
                        value={formData.gender}
                        options={[
                          { value: 'Male', label: 'Male' },
                          { value: 'Female', label: 'Female' },
                          { value: 'Other', label: 'Other' }
                        ]}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: Job Preference */}
                {currentStep === 2 && (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
                      02. Job Preference & Service Category
                    </h3>

                    <FormField
                      label="Desired Service Category"
                      name="serviceCategory"
                      type="select"
                      value={formData.serviceCategory}
                      options={[
                        { value: 'Job Placement', label: 'Job Placement Consultancy' },
                        { value: 'Labour Supply', label: 'Labour & Industrial Helper Supply' },
                        { value: 'Security Services', label: 'Security Guard Supply' }
                      ]}
                      required
                      onChange={handleInputChange}
                    />

                    <FormField
                      label="Preferred Role / Designation Inquiry"
                      name="preferredJobRole"
                      value={formData.preferredJobRole}
                      placeholder="e.g. Facility Security Guard, Factory Production Helper, Warehouse Associate"
                      required
                      error={errors.preferredJobRole}
                      onChange={handleInputChange}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                      <FormField
                        label="Preferred Operating State"
                        name="preferredState"
                        type="select"
                        value={formData.preferredState}
                        options={[
                          { value: 'Maharashtra', label: 'Maharashtra (Nagpur Region)' },
                          { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
                          { value: 'Chhattisgarh', label: 'Chhattisgarh' }
                        ]}
                        onChange={handleInputChange}
                      />

                      <FormField
                        label="Joining Availability"
                        name="availability"
                        type="select"
                        value={formData.availability}
                        options={[
                          { value: 'Immediate', label: 'Immediate (Within 48 hours)' },
                          { value: 'Within 1 Week', label: 'Within 1 Week' },
                          { value: 'Within 15 Days', label: 'Within 15 Days' }
                        ]}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: Education & Experience */}
                {currentStep === 3 && (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
                      03. Education & Work Background
                    </h3>

                    <FormField
                      label="Highest Qualification"
                      name="qualification"
                      type="select"
                      value={formData.qualification}
                      options={[
                        { value: '8th Pass', label: '8th Standard Pass' },
                        { value: '10th Pass', label: '10th Standard (SSC) Pass' },
                        { value: '12th Pass', label: '12th Standard (HSC) Pass' },
                        { value: 'ITI / Diploma', label: 'ITI Trade Certificate / Diploma' },
                        { value: 'Graduate / Degree', label: 'Graduate / Bachelor Degree' }
                      ]}
                      required
                      onChange={handleInputChange}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                      <FormField
                        label="Total Work Experience"
                        name="experienceYears"
                        type="select"
                        value={formData.experienceYears}
                        options={[
                          { value: 'Fresher (0 Years)', label: 'Fresher (0 Years)' },
                          { value: '6 Months - 1 Year', label: '6 Months - 1 Year' },
                          { value: '1 - 3 Years', label: '1 - 3 Years' },
                          { value: '3+ Years', label: '3+ Years' }
                        ]}
                        onChange={handleInputChange}
                      />

                      <FormField
                        label="Previous Employer / Factory"
                        name="previousCompany"
                        value={formData.previousCompany}
                        placeholder="Company name if experienced"
                        onChange={handleInputChange}
                      />
                    </div>

                    <FormField
                      label="Skills or Relevant Background"
                      name="skills"
                      type="textarea"
                      rows={3}
                      value={formData.skills}
                      placeholder="Mention any machine experience, security training, physical fitness, packaging skills..."
                      onChange={handleInputChange}
                    />
                  </div>
                )}

                {/* STEP 4: Contact Information */}
                {currentStep === 4 && (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
                      04. Contact & Residential Address
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                      <FormField
                        label="Primary Mobile Number"
                        name="mobileNumber"
                        type="tel"
                        value={formData.mobileNumber}
                        placeholder="10-digit mobile number"
                        required
                        error={errors.mobileNumber}
                        onChange={handleInputChange}
                      />

                      <FormField
                        label="Alternate / Family Number"
                        name="alternateNumber"
                        type="tel"
                        value={formData.alternateNumber}
                        placeholder="Family or WhatsApp number"
                        onChange={handleInputChange}
                      />
                    </div>

                    <FormField
                      label="Current Residential Address"
                      name="currentAddress"
                      value={formData.currentAddress}
                      placeholder="Street, area, landmark"
                      required
                      error={errors.currentAddress}
                      onChange={handleInputChange}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                      <FormField
                        label="City / District"
                        name="city"
                        value={formData.city}
                        placeholder="e.g. Nagpur, Raipur, Bhopal"
                        required
                        error={errors.city}
                        onChange={handleInputChange}
                      />

                      <FormField
                        label="State"
                        name="state"
                        type="select"
                        value={formData.state}
                        options={[
                          { value: 'Maharashtra', label: 'Maharashtra' },
                          { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
                          { value: 'Chhattisgarh', label: 'Chhattisgarh' }
                        ]}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Document Declaration Checkbox */}
                    <div style={{
                      marginTop: 'var(--space-4)',
                      background: 'var(--color-pearl-surface)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--color-midnight-navy)' }}>
                        <input
                          type="checkbox"
                          name="hasOriginalDocuments"
                          checked={formData.hasOriginalDocuments}
                          onChange={handleInputChange}
                          style={{ marginTop: '2px', accentColor: 'var(--color-midnight-navy)' }}
                        />
                        <span>
                          I confirm that I possess original identity documents (Aadhaar Card, PAN, Bank Passbook, and Education Marksheets) ready for verification during interview.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 5: Review & Consent */}
                {currentStep === 5 && (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--color-midnight-navy)' }}>
                      05. Review & Official Policy Consent
                    </h3>

                    <div className="review-summary-box">
                      <div className="review-summary-row">
                        <span className="review-summary-label">Full Name</span>
                        <span className="review-summary-value">{formData.fullName}</span>
                      </div>
                      <div className="review-summary-row">
                        <span className="review-summary-label">Father's Name</span>
                        <span className="review-summary-value">{formData.fatherName}</span>
                      </div>
                      <div className="review-summary-row">
                        <span className="review-summary-label">Desired Role</span>
                        <span className="review-summary-value">{formData.preferredJobRole}</span>
                      </div>
                      <div className="review-summary-row">
                        <span className="review-summary-label">Service Category</span>
                        <span className="review-summary-value">{formData.serviceCategory}</span>
                      </div>
                      <div className="review-summary-row">
                        <span className="review-summary-label">Preferred State</span>
                        <span className="review-summary-value">{formData.preferredState}</span>
                      </div>
                      <div className="review-summary-row">
                        <span className="review-summary-label">Qualification</span>
                        <span className="review-summary-value">{formData.qualification}</span>
                      </div>
                      <div className="review-summary-row">
                        <span className="review-summary-label">Mobile Number</span>
                        <span className="review-summary-value">{formData.mobileNumber}</span>
                      </div>
                      <div className="review-summary-row">
                        <span className="review-summary-label">Residential City</span>
                        <span className="review-summary-value">{formData.city}, {formData.state}</span>
                      </div>
                    </div>

                    {/* Official 10-Point Policy Notice */}
                    <div style={{
                      background: 'rgba(247, 215, 148, 0.15)',
                      border: '1px solid rgba(247, 215, 148, 0.6)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-5)',
                      marginBottom: 'var(--space-6)'
                    }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', color: 'var(--color-midnight-navy)', fontWeight: 700, fontSize: '0.9rem' }}>
                        <ShieldCheck size={18} style={{ color: 'var(--color-champagne-dark)' }} />
                        <span>A Tiger Global Official Policy Notice</span>
                      </div>
                      <ul style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem', lineHeight: 1.5 }}>
                        <li>• Consultancy fee of ₹1,000 applies (₹500 at registration; ₹500 coordinated post 1-month salary).</li>
                        <li>• Joining at the referred employer is completely free of charge.</li>
                        <li>• You will be offered a choice of 3 companies during your interview.</li>
                        <li>• Office hours: 11:00 AM to 4:00 PM at Plot No. 440, Behind Royal Club, Subhan Nagar, Nagpur.</li>
                      </ul>
                    </div>

                    {/* Checkbox for terms acceptance */}
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                      <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-midnight-navy)', fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          name="acceptedPolicy"
                          checked={formData.acceptedPolicy}
                          onChange={handleInputChange}
                          style={{ marginTop: '3px', accentColor: 'var(--color-midnight-navy)' }}
                        />
                        <span>
                          I have read, understood, and accept the official 10-point policy terms of A Tiger Global Career Solution & Consultancy.
                        </span>
                      </label>
                      {errors.acceptedPolicy && (
                        <div style={{ color: '#D32F2F', fontSize: 'var(--text-xs)', marginTop: '0.25rem' }}>
                          {errors.acceptedPolicy}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer Navigation Buttons */}
                <div className="wizard-footer-nav">
                  {currentStep > 1 ? (
                    <Button type="button" onClick={handleBack} variant="outline" size="md" icon={<ArrowLeft size={16} />} iconPosition="left">
                      Previous
                    </Button>
                  ) : (
                    <div />
                  )}

                  <Button
                    type="button"
                    onClick={handleNext}
                    variant="primary"
                    size="md"
                    icon={currentStep === 5 ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                  >
                    {currentStep === 5 ? 'Confirm & Submit Enquiry' : 'Continue to Next Step'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
};
