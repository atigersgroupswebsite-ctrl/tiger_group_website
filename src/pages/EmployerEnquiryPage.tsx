import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Users, PhoneCall, AlertCircle } from 'lucide-react';
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
import { OPERATING_STATES, type EmployerEnquiry } from '../types/enquiry';
import { createEmployerEnquiry } from '../services/enquiryService';

export const EmployerEnquiryPage: React.FC = () => {
  useEffect(() => {
    document.title = "Employer Manpower Enquiry | A TIGER GLOBAL";
  }, []);

  const [formData, setFormData] = useState<EmployerEnquiry>({
    companyName: '',
    email: '',
    phoneNumber: '',
    address: '',
    district: '',
    state: 'Maharashtra',
    employeesRequired: '',
    jobRole: '',
    description: '',
    acknowledgedAccurate: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [demoId, setDemoId] = useState('');

  const handleTextChange = (field: keyof EmployerEnquiry, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

    if (!formData.companyName.trim()) errs.companyName = 'Firm / Company name is required.';
    
    if (!formData.email.trim()) {
      errs.email = 'Official corporate email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please provide a valid official email address.';
    }

    if (!formData.phoneNumber.trim()) {
      errs.phoneNumber = 'Official contact phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(formData.phoneNumber)) {
      errs.phoneNumber = 'Please enter a valid 10-digit phone number.';
    }

    if (!formData.address.trim()) errs.address = 'Facility / Office address is required.';
    if (!formData.district.trim()) errs.district = 'District / City is required.';
    if (!formData.state) errs.state = 'Please select your state.';

    if (formData.employeesRequired === '' || Number(formData.employeesRequired) <= 0) {
      errs.employeesRequired = 'Please specify the number of personnel required (minimum 1).';
    }

    if (!formData.jobRole.trim()) {
      errs.jobRole = 'Job role / nature of work is required.';
    }

    if (!formData.acknowledgedAccurate) {
      errs.acknowledgedAccurate = 'Please confirm that the submitted requirements are accurate.';
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
      const result = await createEmployerEnquiry({
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phoneNumber,
        address: formData.address,
        district: formData.district,
        state: formData.state,
        employeesRequired: Number(formData.employeesRequired) || 1,
        jobRole: formData.jobRole,
        description: formData.description
      });

      setIsSubmitting(false);

      if (result.success && (result.enquiryNumber || result.enquiryId)) {
        setDemoId(result.enquiryNumber || result.enquiryId || '');
        setIsSubmitted(true);
        // Clear form state only on server confirmation
        setFormData({
          companyName: '',
          email: '',
          phoneNumber: '',
          address: '',
          district: '',
          state: 'Maharashtra',
          employeesRequired: '',
          jobRole: '',
          description: '',
          acknowledgedAccurate: false
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Display real database/server error — NEVER show fake success
        setErrors((prev) => ({
          ...prev,
          general: result.error || 'Failed to submit employer enquiry. Please check your information and try again.'
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
      companyName: '',
      email: '',
      phoneNumber: '',
      address: '',
      district: '',
      state: 'Maharashtra',
      employeesRequired: '',
      jobRole: '',
      description: '',
      acknowledgedAccurate: false
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
              <span className="form-sidebar-badge">Enterprise Procurement</span>
              <h1 className="form-sidebar-heading">BUILD YOUR WORKFORCE.</h1>
              <p className="form-sidebar-subtext">
                Tell us about your manpower requirement and our team will get in touch with you. We specialize in industrial labor, manufacturing helpers, and certified security squads.
              </p>

              <div className="form-sidebar-meta-list">
                <div className="form-sidebar-meta-item">
                  <ShieldCheck size={18} className="form-sidebar-meta-icon" />
                  <div>
                    <strong>100% Statutory Compliance</strong>
                    <br />Full ESIC, PF, and contractual labor law compliance handled end-to-end.
                  </div>
                </div>
                <div className="form-sidebar-meta-item">
                  <Users size={18} className="form-sidebar-meta-icon" />
                  <div>
                    <strong>Rapid Deployment Fleet</strong>
                    <br />Capacity to deploy vetted industrial workers and security guards across Central India.
                  </div>
                </div>
                <div className="form-sidebar-meta-item">
                  <PhoneCall size={18} className="form-sidebar-meta-icon" />
                  <div>
                    <strong>Dedicated Account Manager</strong>
                    <br />Direct coordination, shift monitoring, and workforce supervision.
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
                  copy="Thank you for sharing your manpower requirement. Our corporate recruitment team will review your request and contact you shortly."
                  referenceLabel="Employer Reference Number"
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

                  {/* SECTION A — COMPANY DETAILS */}
                  <FormSection
                    tag="SECTION A"
                    title="COMPANY DETAILS"
                  />

                  <FormField
                    id="companyName"
                    label="FIRM / COMPANY NAME"
                    required
                    error={errors.companyName}
                  >
                    <TextInput
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleTextChange('companyName', e.target.value)}
                      placeholder="e.g. Apex Industries Pvt. Ltd."
                      hasError={Boolean(errors.companyName)}
                    />
                  </FormField>

                  <div className="form-grid-2">
                    <FormField
                      id="email"
                      label="OFFICIAL EMAIL"
                      required
                      error={errors.email}
                      hint="Work email for formal proposal & rate quotes"
                    >
                      <TextInput
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleTextChange('email', e.target.value)}
                        placeholder="e.g. hr@apexindustries.com"
                        hasError={Boolean(errors.email)}
                        autoComplete="email"
                      />
                    </FormField>

                    <FormField
                      id="phoneNumber"
                      label="PHONE NUMBER"
                      required
                      error={errors.phoneNumber}
                      hint="Direct contact / authorized manager"
                    >
                      <PhoneInput
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(val) => handleTextChange('phoneNumber', val)}
                        hasError={Boolean(errors.phoneNumber)}
                      />
                    </FormField>
                  </div>

                  {/* SECTION B — LOCATION */}
                  <div style={{ marginTop: '2rem' }}>
                    <FormSection
                      tag="SECTION B"
                      title="LOCATION"
                    />
                  </div>

                  <FormField
                    id="address"
                    label="ADDRESS"
                    required
                    error={errors.address}
                    hint="Factory / facility / work site address where staff will be deployed"
                  >
                    <Textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => handleTextChange('address', e.target.value)}
                      placeholder="e.g. Plot B-12, MIDC Industrial Area, Butibori"
                      hasError={Boolean(errors.address)}
                    />
                  </FormField>

                  <div className="form-grid-2">
                    <FormField
                      id="district"
                      label="DISTRICT"
                      required
                      error={errors.district}
                    >
                      <TextInput
                        id="district"
                        name="district"
                        value={formData.district}
                        onChange={(e) => handleTextChange('district', e.target.value)}
                        placeholder="e.g. Nagpur"
                        hasError={Boolean(errors.district)}
                      />
                    </FormField>

                    <FormField
                      id="state"
                      label="STATE"
                      required
                      error={errors.state}
                    >
                      <SelectInput
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={(e) => handleTextChange('state', e.target.value)}
                        placeholder="-- Select State --"
                        options={[...OPERATING_STATES]}
                        hasError={Boolean(errors.state)}
                      />
                    </FormField>
                  </div>

                  {/* SECTION C — MANPOWER REQUIREMENT */}
                  <div style={{ marginTop: '2rem' }}>
                    <FormSection
                      tag="SECTION C"
                      title="MANPOWER REQUIREMENT"
                    />
                  </div>

                  <div className="form-grid-2">
                    <FormField
                      id="employeesRequired"
                      label="NUMBER OF EMPLOYEES REQUIRED"
                      required
                      error={errors.employeesRequired}
                    >
                      <TextInput
                        id="employeesRequired"
                        name="employeesRequired"
                        type="number"
                        min="1"
                        step="1"
                        value={formData.employeesRequired}
                        onChange={(e) => handleTextChange('employeesRequired', e.target.value ? parseInt(e.target.value, 10) : '')}
                        placeholder="e.g. 15"
                        hasError={Boolean(errors.employeesRequired)}
                      />
                    </FormField>

                    <FormField
                      id="jobRole"
                      label="JOB ROLE / NATURE OF WORK"
                      required
                      error={errors.jobRole}
                    >
                      <TextInput
                        id="jobRole"
                        name="jobRole"
                        value={formData.jobRole}
                        onChange={(e) => handleTextChange('jobRole', e.target.value)}
                        placeholder="e.g. Security Guard, Factory Worker, Loader, Machine Operator"
                        hasError={Boolean(errors.jobRole)}
                      />
                    </FormField>
                  </div>

                  <FormField
                    id="description"
                    label="DESCRIPTION / ADDITIONAL REQUIREMENTS"
                    hint="Optional details regarding shift timings, skill certifications, uniforms, or tenure"
                  >
                    <Textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description || ''}
                      onChange={(e) => handleTextChange('description', e.target.value)}
                      placeholder="Describe the workforce, experience, shift, location, or any other requirements."
                    />
                  </FormField>

                  {/* Acknowledgment Box */}
                  <div className="form-acknowledgement-box">
                    <label className="form-checkbox-label">
                      <input
                        type="checkbox"
                        className="form-checkbox-input"
                        checked={formData.acknowledgedAccurate}
                        onChange={(e) => handleTextChange('acknowledgedAccurate', e.target.checked as unknown as string)}
                      />
                      <span>
                        I confirm that the information provided by me is accurate. <span className="field-required-star">*</span>
                      </span>
                    </label>
                    {errors.acknowledgedAccurate && (
                      <span className="field-error-msg">{errors.acknowledgedAccurate}</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <SubmitButton
                    label="SUBMIT MANPOWER REQUIREMENT →"
                    isLoading={isSubmitting}
                  />
                </form>
              )}
            </motion.div>

            {/* Bottom Alternative Link */}
            <div className="form-bottom-alternative">
              <p className="form-bottom-alt-text">Looking for something else?</p>
              <Link to="/enquiry/job-seeker" className="form-bottom-alt-link">
                <span>I'M LOOKING FOR A JOB →</span>
              </Link>
            </div>
          </main>
        </div>
      </Container>
    </div>
  );
};
