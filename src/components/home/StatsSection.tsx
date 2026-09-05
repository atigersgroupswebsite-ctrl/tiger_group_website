import React from 'react';
import { Container } from '../common/Container';
import { StatCounter } from '../common/StatCounter';

export const StatsSection: React.FC = () => {
  return (
    <section className="stats-section" aria-label="Company scale statistics">
      <Container size="xl">
        <div className="stats-grid">
          <StatCounter
            value={800}
            suffix="+"
            label="People Placed"
            duration={1.8}
          />
          <StatCounter
            value={400}
            suffix="+"
            label="Active Employees"
            duration={1.8}
          />
          <StatCounter
            value={3}
            label="States Served"
            duration={1.2}
          />
          <StatCounter
            value={3}
            suffix="+"
            label="Major Employer Relationships"
            duration={1.2}
          />
        </div>
      </Container>
    </section>
  );
};
