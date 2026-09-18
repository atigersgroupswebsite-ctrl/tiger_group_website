import React from 'react';
import { Container } from '../common/Container';
import { StatCounter } from '../common/StatCounter';

export const StatsSection: React.FC = () => {
  return (
    <section className="stats-section" aria-label="Company scale statistics">
      <Container size="xl">
        <div className="stats-grid stats-grid-three">
          <StatCounter
            value={1500}
            suffix="+"
            label="People Placed"
            duration={1.8}
          />
          <StatCounter
            value={7}
            label="States Served"
            duration={1.2}
          />
          <StatCounter
            value={3}
            label="States Currently Serving"
            duration={1.2}
          />
        </div>
      </Container>
    </section>
  );
};
