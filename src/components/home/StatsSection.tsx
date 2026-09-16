import React from 'react';
import { Container } from '../common/Container';
import { StatCounter } from '../common/StatCounter';

export const StatsSection: React.FC = () => {
  return (
    <section className="stats-section" aria-label="Company scale statistics">
      <Container size="xl">
        <div className="stats-grid stats-grid-two">
          <StatCounter
            value={1500}
            suffix="+"
            label="People Placed"
            duration={1.8}
          />
          <StatCounter
            value={700}
            suffix="+"
            label="Active Employees"
            duration={1.8}
          />
        </div>
      </Container>
    </section>
  );
};
