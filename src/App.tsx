import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/common/ScrollToTop';

import { Home } from './pages/Home';
import { About } from './pages/About';
import { Businesses } from './pages/Businesses';
import { Jobs } from './pages/Jobs';
import { JobDetail } from './pages/JobDetail';
import { Enquiry } from './pages/Enquiry';
import { JobSeekerEnquiryPage } from './pages/JobSeekerEnquiryPage';
import { EmployerEnquiryPage } from './pages/EmployerEnquiryPage';
import { Employers } from './pages/Employers';
import { Contact } from './pages/Contact';
import { Joining } from './pages/Joining';
import { Policy } from './pages/Policy';

export const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/businesses" element={<Businesses />} />
            <Route path="/services" element={<Businesses />} />
            <Route path="/careers" element={<Jobs />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:slug" element={<JobDetail />} />
            <Route path="/enquiry" element={<Enquiry />} />
            <Route path="/enquiry/job-seeker" element={<JobSeekerEnquiryPage />} />
            <Route path="/enquiry/employer" element={<EmployerEnquiryPage />} />
            <Route path="/employers" element={<Employers />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/joining" element={<Joining />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
