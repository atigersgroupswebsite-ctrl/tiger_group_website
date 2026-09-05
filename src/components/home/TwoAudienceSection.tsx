import { ArrowRight, Building2 } from 'lucide-react';
import { Container } from '../common/Container';
import { Button } from '../common/Button';
import { ScrollReveal } from '../common/ScrollReveal';

export const TwoAudienceSection: React.FC = () => {
  return (
    <section className="section section-pearl">
      <Container size="xl">
        <div className="split-audience-grid">
          {/* Candidate Card (Navy High-Contrast) */}
          <ScrollReveal direction="left" delay={0.1}>
            <div className="split-audience-card split-audience-seeker">
              <div>
                <span className="split-audience-badge">
                  For Job Seekers
                </span>
                <h3 className="split-audience-title">
                  LOOKING FOR A JOB?
                </h3>
                <p className="split-audience-desc">
                  Find relevant opportunities and begin your employment journey with A Tiger Global. We offer structured interviews with top employers, verified KYC joining, and reliable career steps.
                </p>
              </div>

              <div>
                <Button to="/jobs" variant="primary" size="lg" icon={<ArrowRight size={18} />}>
                  EXPLORE JOBS
                </Button>
              </div>
            </div>
          </ScrollReveal>

          {/* Employer Card (Pearl / Navy Inverted) */}
          <ScrollReveal direction="right" delay={0.2}>
            <div className="split-audience-card split-audience-employer">
              <div>
                <span className="split-audience-badge">
                  For Enterprises & Plants
                </span>
                <h3 className="split-audience-title">
                  LOOKING FOR MANPOWER?
                </h3>
                <p className="split-audience-desc">
                  Tell us about your workforce requirements and connect with our team. We supply vetted industrial labour, factory line assistants, and security personnel with prompt compliance handling.
                </p>
              </div>

              <div>
                <Button to="/employers" variant="navy" size="lg" icon={<Building2 size={18} />}>
                  HIRE MANPOWER
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </section>
  );
};
