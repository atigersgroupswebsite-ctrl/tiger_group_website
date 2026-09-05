import React from 'react';
import { Hero } from '../components/home/Hero';
import { StatsSection } from '../components/home/StatsSection';
import { TrustedEmployers } from '../components/home/TrustedEmployers';
import { ServicesOverview } from '../components/home/ServicesOverview';
import { TwoAudienceSection } from '../components/home/TwoAudienceSection';
import { RegionalPresence } from '../components/home/RegionalPresence';
import { HowItWorksSection } from '../components/home/HowItWorksSection';
import { AboutPreview } from '../components/home/AboutPreview';
import { OpportunitiesPreview } from '../components/home/OpportunitiesPreview';
import { EmployerCTA } from '../components/home/EmployerCTA';
import { FinalCTA } from '../components/home/FinalCTA';

export const Home: React.FC = () => {
  return (
    <main>
      <Hero />
      <StatsSection />
      <TrustedEmployers />
      <ServicesOverview />
      <TwoAudienceSection />
      <RegionalPresence />
      <HowItWorksSection />
      <AboutPreview />
      <OpportunitiesPreview />
      <EmployerCTA />
      <FinalCTA />
    </main>
  );
};
