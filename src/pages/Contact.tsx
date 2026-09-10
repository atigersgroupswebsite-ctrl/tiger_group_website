import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Container } from '../components/common/Container';
import { FormField } from '../components/common/FormField';
import { Button } from '../components/common/Button';
import { ScrollReveal } from '../components/common/ScrollReveal';

export const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setErrorMessage(json.error || 'Failed to submit contact message. Please try again.');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error submitting inquiry.');
      setLoading(false);
    }
  };

  return (
    <main style={{ paddingTop: 'calc(var(--header-height) + 2rem)', minHeight: '85vh' }}>
      {/* Header */}
      <section className="section-sm section-pearl" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <Container size="xl">
          <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
            <span className="eyebrow">Connect With Us</span>
            <h1 style={{ fontSize: 'clamp(2rem, 3.8vw, 3rem)', marginBottom: 'var(--space-2)' }}>
              CONTACT A TIGER GLOBAL
            </h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
              Visit our registered headquarters in Nagpur or get in touch directly via phone, email, or WhatsApp.
            </p>
          </div>
        </Container>
      </section>

      {/* Main Grid: Contact Info + Form */}
      <section className="section">
        <Container size="xl">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--space-12)',
            alignItems: 'start'
          }} className="contact-main-grid">
            <style>{`
              @media (min-width: 992px) {
                .contact-main-grid {
                  grid-template-columns: 1fr 1.1fr !important;
                }
              }
            `}</style>

            {/* Left: Contact Details Cards & Direct Action Buttons */}
            <ScrollReveal direction="left">
              <div>
                <div style={{ marginBottom: 'var(--space-8)' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>
                    Nagpur Headquarters
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                    Our office is conveniently located in Subhan Nagar, Nagpur, serving as the central coordination hub for candidates and partner employers across Maharashtra, MP, and Chhattisgarh.
                  </p>
                </div>

                {/* Info Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                  {/* Address */}
                  <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--color-champagne-light)', color: 'var(--color-midnight-navy)' }}>
                      <MapPin size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>Registered Address</h4>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        PLOT NO 440, BEHIND ROYAL CLUB,<br />
                        SUBHAN NAGAR, NAGPUR,<br />
                        MAHARASHTRA — 440035
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--color-champagne-light)', color: 'var(--color-midnight-navy)' }}>
                      <Phone size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>Direct Helpline</h4>
                      <a
                        href="tel:+918349353946"
                        style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}
                      >
                        +91 8349353946
                      </a>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        Available for candidate inquiries & corporate requirements
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--color-champagne-light)', color: 'var(--color-midnight-navy)' }}>
                      <Mail size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>Official Email</h4>
                      <a
                        href="mailto:atigerglobal@gmail.com"
                        style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-midnight-navy)' }}
                      >
                        atigerglobal@gmail.com
                      </a>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--color-champagne-light)', color: 'var(--color-midnight-navy)' }}>
                      <Clock size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>Official Office Hours</h4>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-midnight-navy)', fontWeight: 600, margin: 0 }}>
                        11:00 AM to 4:00 PM
                      </p>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        In-person registration & document verification timing
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <a
                    href="https://wa.me/918349353946?text=Hello%20A%20Tiger%20Global,%20I%20would%20like%20to%20inquire%20about%20workforce%20services."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <MessageSquare size={16} />
                    <span>Chat on WhatsApp</span>
                  </a>
                  <a
                    href="tel:+918349353946"
                    className="btn btn-navy"
                  >
                    <Phone size={16} />
                    <span>Call Desk</span>
                  </a>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: Contact Form */}
            <ScrollReveal direction="right">
              <div style={{
                background: 'var(--color-pearl-white)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--color-border)',
                padding: 'clamp(2rem, 4vw, 3rem)',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-2)' }}>
                  Send a Direct Message
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                  Fill out the form below and our recruitment coordinator will respond promptly.
                </p>

                {submitted ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                    <CheckCircle2 size={48} style={{ color: 'var(--color-champagne-dark)', margin: '0 auto var(--space-4)' }} />
                    <h4>Message Received</h4>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                      Thank you for contacting A Tiger Global. We will reach out to you shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <FormField
                      label="Your Name"
                      name="name"
                      value={formData.name}
                      placeholder="Enter your name"
                      required
                      onChange={handleChange}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                      <FormField
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        placeholder="10-digit phone"
                        required
                        onChange={handleChange}
                      />

                      <FormField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        placeholder="name@email.com"
                        onChange={handleChange}
                      />
                    </div>

                    <FormField
                      label="Subject"
                      name="subject"
                      type="select"
                      value={formData.subject}
                      options={[
                        { value: 'General Inquiry', label: 'General Inquiry' },
                        { value: 'Job Seeker Placement', label: 'Job Seeker Placement' },
                        { value: 'Corporate Manpower Supply', label: 'Corporate Manpower Supply' },
                        { value: 'Security Guard Supply', label: 'Security Guard Supply' }
                      ]}
                      required
                      onChange={handleChange}
                    />

                    <FormField
                      label="Your Message"
                      name="message"
                      type="textarea"
                      rows={4}
                      value={formData.message}
                      placeholder="How can our team assist you?"
                      required
                      onChange={handleChange}
                    />

                    {errorMessage && (
                      <div style={{
                        padding: '10px 14px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #F87171',
                        borderRadius: 'var(--radius-md)',
                        color: '#991B1B',
                        fontSize: 'var(--text-sm)',
                        marginBottom: 'var(--space-4)'
                      }}>
                        {errorMessage}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      style={{ width: '100%' }}
                      disabled={loading}
                      icon={<Send size={16} />}
                    >
                      {loading ? 'SENDING INQUIRY...' : 'SEND MESSAGE'}
                    </Button>
                  </form>
                )}
              </div>
            </ScrollReveal>
          </div>
        </Container>
      </section>

      {/* Interactive Map Placeholder */}
      <section className="section-sm section-pearl" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Container size="xl">
          <div style={{
            background: 'var(--color-pearl-white)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: 'var(--space-8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <MapPin size={36} style={{ color: 'var(--color-midnight-navy)', marginBottom: 'var(--space-3)' }} />
            <h4 style={{ fontSize: '1.2rem', marginBottom: '0.3rem' }}>Nagpur Office Location</h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '520px', marginBottom: 'var(--space-6)' }}>
              Plot No. 440, Behind Royal Club, Subhan Nagar, Nagpur, Maharashtra — 440035.<br />
              (Close proximity to central transport routes in Nagpur)
            </p>

            <a
              href="https://maps.google.com/?q=Plot+No+440+Behind+Royal+Club+Subhan+Nagar+Nagpur+440035"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Open in Google Maps
            </a>
          </div>
        </Container>
      </section>
    </main>
  );
};
