import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, ShieldCheck, MapPin, FileText, AlertCircle } from 'lucide-react';
import { Container } from '../components/common/Container';
import {
  FormField,
  TextInput,
  PhoneInput,
  Textarea,
  SelectInput,
  FormSection,
  SubmitButton,
  SuccessState
} from '../components/forms';
import { KNOWN_EMPLOYERS, type JobSeekerEnquiry } from '../types/enquiry';
import { createJobSeekerApplication } from '../services/enquiryService';
import { getPublicJobBySlugOrId } from '../services/jobService';
import type { Job } from '../types';
import { normalizeIndianMobile } from '../utils/phoneUtils';

export const JobSeekerEnquiryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const jobSlug = searchParams.get('job');
  const [matchedJob, setMatchedJob] = useState<Job | null>(null);

  useEffect(() => {
    if (jobSlug) {
      getPublicJobBySlugOrId(jobSlug).then((job) => {
        if (job) setMatchedJob(job);
      });
    }
  }, [jobSlug]);

  useEffect(() => {
    document.title = "Job Seeker Enquiry | A TIGER GLOBAL";
  }, []);

  const [formData, setFormData] = useState<JobSeekerEnquiry>({
    fullName: '',
    fatherName: '',
    mobileNumber: '',
    email: '',
    address: '',
    desiredCompany: '',
    designation: '',
    description: '',
    acknowledgedAccurate: false,
    acknowledgedTerms: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [demoId, setDemoId] = useState('');

  // Pre-fill from matched job if arrived via "Apply Now"
  useEffect(() => {
    if (matchedJob) {
      setFormData((prev) => ({
        ...prev,
        designation: prev.designation || matchedJob.title,
        // If the job title mentions Haldiram's, Signet, or Geeta, auto-suggest
        desiredCompany: prev.desiredCompany || (
          matchedJob.title.toLowerCase().includes('haldiram') ? "Haldiram's" :
          matchedJob.title.toLowerCase().includes('signet') ? "Signet Group" :
          matchedJob.title.toLowerCase().includes('geeta') ? "Geeta Glass" : ''
        )
      }));
    }
  }, [matchedJob]);

  const handleTextChange = (field: keyof JobSeekerEnquiry, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCheckboxChange = (field: 'acknowledgedAccurate' | 'acknowledgedTerms', checked: boolean) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required.';
    if (!formData.fatherName.trim()) errs.fatherName = "Father's Name is required.";

    const mobileNorm = normalizeIndianMobile(formData.mobileNumber);
    if (!formData.mobileNumber.trim()) {
      errs.mobileNumber = 'Mobile number is required.';
    } else if (!mobileNorm.isValid) {
      errs.mobileNumber = mobileNorm.error || 'Please enter a valid 10-digit Indian mobile number.';
    }

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errs.email = 'Email Address is required for candidate registration and updates.';
    } else if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmedEmail)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.address.trim()) errs.address = 'Residential / permanent address is required.';
    if (!formData.desiredCompany) errs.desiredCompany = 'Please select a company preference.';
    if (!formData.designation.trim()) errs.designation = 'Designation / job position is required.';

    if (!formData.acknowledgedAccurate) {
      errs.acknowledgedAccurate = 'Please confirm that the information provided is accurate.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createJobSeekerApplication({
        jobId: matchedJob?.id || null,
        fullName: formData.fullName,
        fatherName: formData.fatherName,
        mobile: formData.mobileNumber,
        email: formData.email,
        address: formData.address,
        desiredCompany: formData.desiredCompany,
        designation: formData.designation,
        description: formData.description
      });

      setIsSubmitting(false);

      if (result.success && result.applicationNumber) {
        setDemoId(result.applicationNumber);
        setIsSubmitted(true);
        // Clear form state only on server success
        setFormData({
          fullName: '',
          fatherName: '',
          mobileNumber: '',
          email: '',
          address: '',
          desiredCompany: '',
          designation: '',
          description: '',
          acknowledgedAccurate: false,
          acknowledgedTerms: false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Display real database/server error — NEVER show fake success
        setErrors((prev) => ({
          ...prev,
          general: result.error || 'Failed to submit application. Please check your details and try again.'
        }));
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      setErrors((prev) => ({
        ...prev,
        general: err instanceof Error ? err.message : 'An unexpected error occurred during submission. Please try again.'
      }));
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      fatherName: '',
      mobileNumber: '',
      email: '',
      address: '',
      desiredCompany: '',
      designation: '',
      description: '',
      acknowledgedAccurate: false,
      acknowledgedTerms: false
    });
    setErrors({});
    setIsSubmitted(false);
  };

  return (
    <div className="form-page-container">
      <Container>
        {/* Back Navigation */}
        <div className="form-back-nav">
          <Link to="/enquiry" className="form-back-link">
            <ArrowLeft size={14} />
            <span>BACK TO ENQUIRY OPTIONS</span>
          </Link>
        </div>

        <div className="form-layout-grid">
          {/* Left Column: Context & Guarantees */}
          <aside className="form-sidebar">
            <motion.div
              className="form-sidebar-card"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="form-sidebar-badge">Candidate Application</span>
              <h1 className="form-sidebar-heading">FIND YOUR NEXT OPPORTUNITY.</h1>
              <p className="form-sidebar-subtext">
                Tell us a little about yourself and the kind of opportunity you're looking for. Our team matches candidate profiles with certified regional employers.
              </p>

              {matchedJob && (
                <div className="form-context-pill">
                  <Briefcase size={16} style={{ color: 'var(--color-midnight-navy)', flexShrink: 0 }} />
                  <div>
                    Applying for: <strong>{matchedJob.title}</strong>
                  </div>
                </div>
              )}

              <div className="form-sidebar-meta-list">
                <div className="form-sidebar-meta-item">
                  <ShieldCheck size={18} className="form-sidebar-meta-icon" />
                  <div>
                    <strong>Direct Employer Placement</strong>
                    <br />Positions with established industrial leaders and corporate firms.
                  </div>
                </div>
                <div className="form-sidebar-meta-item">
                  <MapPin size={18} className="form-sidebar-meta-icon" />
                  <div>
                    <strong>Central India Network</strong>
                    <br />Opportunities across Nagpur, Maharashtra, MP, and Chhattisgarh.
                  </div>
                </div>
                <div className="form-sidebar-meta-item">
                  <FileText size={18} className="form-sidebar-meta-icon" />
                  <div>
                    <strong>Prompt Candidate Review</strong>
                    <br />Our recruitment officers will contact you to verify documentation.
                  </div>
                </div>
              </div>
            </motion.div>
          </aside>

          {/* Right Column: Interactive Form */}
          <main>
            <motion.div
              className="form-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              {isSubmitted ? (
                <SuccessState
                  title="ENQUIRY RECEIVED"
                  copy="Thank you for contacting A Tiger Global. Our team will review your details and get in touch regarding suitable opportunities."
                  referenceLabel="Application Number"
                  referenceId={demoId}
                  onReset={handleReset}
                />
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {errors.general && (
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        marginBottom: '1.5rem',
                        backgroundColor: 'rgba(237, 166, 163, 0.15)',
                        border: '1px solid #EDA6A3',
                        borderRadius: '8px',
                        color: '#EDA6A3',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      role="alert"
                    >
                      <AlertCircle size={18} style={{ flexShrink: 0 }} />
                      <span>{errors.general}</span>
                    </div>
                  )}

                  {/* SECTION A — PERSONAL DETAILS */}
                  <FormSection
                    tag="SECTION A"
                    title="PERSONAL DETAILS"
                  />

                  <div className="form-grid-2">
                    <FormField
                      id="fullName"
                      label="FULL NAME"
                      required
                      error={errors.fullName}
                    >
                      <TextInput
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleTextChange('fullName', e.target.value)}
                        placeholder="e.g. Rameshwar Sharma"
                        hasError={Boolean(errors.fullName)}
                        autoComplete="name"
                      />
                    </FormField>

                    <FormField
                      id="fatherName"
                      label="FATHER'S NAME"
                      required
                      error={errors.fatherName}
                    >
                      <TextInput
                        id="fatherName"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={(e) => handleTextChange('fatherName', e.target.value)}
                        placeholder="e.g. Anand Sharma"
                        hasError={Boolean(errors.fatherName)}
                      />
                    </FormField>
                  </div>

                  <div className="form-grid-2">
                    <FormField
                      id="mobileNumber"
                      label="MOBILE NUMBER"
                      required
                      error={errors.mobileNumber}
                      hint="10-digit Indian mobile number for interview communication"
                    >
                      <PhoneInput
                        id="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={(val) => handleTextChange('mobileNumber', val)}
                        hasError={Boolean(errors.mobileNumber)}
                      />
                    </FormField>

                    <FormField
                      id="email"
                      label="EMAIL ADDRESS"
                      required
                      error={errors.email}
                      hint="Required for candidate registration and official updates"
                    >
                      <TextInput
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleTextChange('email', e.target.value)}
                        placeholder="e.g. candidate@example.com"
                        hasError={Boolean(errors.email)}
                        autoComplete="email"
                      />
                    </FormField>
                  </div>

                  <FormField
                    id="address"
                    label="ADDRESS"
                    required
                    error={errors.address}
                    hint="Enter your current village / town, area, and city"
                  >
                    <Textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => handleTextChange('address', e.target.value)}
                      placeholder="e.g. Plot No 24, Near Hanuman Mandir, Hingna Road, Nagpur - 440028"
                      hasError={Boolean(errors.address)}
                    />
                  </FormField>

                  {/* SECTION B — JOB PREFERENCE */}
                  <div style={{ marginTop: '2rem' }}>
                    <FormSection
                      tag="SECTION B"
                      title="JOB PREFERENCE"
                    />
                  </div>

                  <FormField
                    id="desiredCompany"
                    label="Company You Want To Work For"
                    required
                    error={errors.desiredCompany}
                    hint="Select an employer partner or choose 'Other / Not Listed'"
                  >
                    <SelectInput
                      id="desiredCompany"
                      name="desiredCompany"
                      value={formData.desiredCompany}
                      onChange={(e) => handleTextChange('desiredCompany', e.target.value)}
                      placeholder="-- Select Organization --"
                      options={[...KNOWN_EMPLOYERS]}
                      hasError={Boolean(errors.desiredCompany)}
                    />
                  </FormField>

                  <FormField
                    id="designation"
                    label="DESIGNATION / JOB POSITION"
                    required
                    error={errors.designation}
                  >
                    <TextInput
                      id="designation"
                      name="designation"
                      value={formData.designation}
                      onChange={(e) => handleTextChange('designation', e.target.value)}
                      placeholder="e.g. Security Guard, Helper, Machine Operator"
                      hasError={Boolean(errors.designation)}
                    />
                  </FormField>

                  <FormField
                    id="description"
                    label="DESCRIPTION / ADDITIONAL REQUIREMENTS"
                    hint="Optional details regarding shifts, previous experience, or certificates"
                  >
                    <Textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description || ''}
                      onChange={(e) => handleTextChange('description', e.target.value)}
                      placeholder="Tell us anything else you'd like us to know..."
                    />
                  </FormField>

                  {/* Acknowledgment Box */}
                  <div className="form-acknowledgement-box">
                    <label className="form-checkbox-label">
                      <input
                        type="checkbox"
                        className="form-checkbox-input"
                        checked={formData.acknowledgedAccurate}
                        onChange={(e) => handleCheckboxChange('acknowledgedAccurate', e.target.checked)}
                      />
                      <span>
                        I confirm that the information provided by me is accurate. <span className="field-required-star">*</span>
                      </span>
                    </label>
                    {errors.acknowledgedAccurate && (
                      <span className="field-error-msg">{errors.acknowledgedAccurate}</span>
                    )}

                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      By submitting this enquiry, you acknowledge that the information provided will be used for recruitment and consultancy purposes.
                    </div>

                    <div>
                      <Link to="/terms-and-conditions" className="form-terms-link" target="_blank" rel="noopener noreferrer">
                        <span>View Consultancy Terms & Conditions →</span>
                      </Link>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <SubmitButton
                    label="SUBMIT JOB ENQUIRY →"
                    isLoading={isSubmitting}
                  />
                </form>
              )}
            </motion.div>

            {/* Bottom Alternative Link */}
            <div className="form-bottom-alternative">
              <p className="form-bottom-alt-text">Looking for something else?</p>
              <Link to="/enquiry/employer" className="form-bottom-alt-link">
                <span>I NEED MANPOWER →</span>
              </Link>
            </div>
          </main>
        </div>
      </Container>
    </div>
  );
};
