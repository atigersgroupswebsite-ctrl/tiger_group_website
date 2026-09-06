import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { ScrollToTop } from './components/common/ScrollToTop';

// Admin Context & Components
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { AdminProtectedRoute } from './components/admin/AdminProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';
import { AdminApplicationDetailPage } from './pages/admin/AdminApplicationDetailPage';
import { AdminEmployerEnquiriesPage } from './pages/admin/AdminEmployerEnquiriesPage';
import { AdminExportsPage } from './pages/admin/AdminExportsPage';
import { AdminPlaceholderPage } from './pages/admin/AdminPlaceholderPage';

// Public Pages
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
    <AdminAuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Admin Login (Publicly accessible to administrators) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="applications/:id" element={<AdminApplicationDetailPage />} />
              <Route path="employer-enquiries" element={<AdminEmployerEnquiriesPage />} />
              <Route path="exports" element={<AdminExportsPage />} />
              {/* Prepared Future Module Routes */}
              <Route path="jobs" element={<AdminPlaceholderPage />} />
              <Route path="companies" element={<AdminPlaceholderPage />} />
              <Route path="joining" element={<AdminPlaceholderPage />} />
              <Route path="documents" element={<AdminPlaceholderPage />} />
              <Route path="payments" element={<AdminPlaceholderPage />} />
              <Route path="reference-slips" element={<AdminPlaceholderPage />} />
              <Route path="employees" element={<AdminPlaceholderPage />} />
              <Route path="files" element={<AdminPlaceholderPage />} />
              <Route path="activity" element={<AdminPlaceholderPage />} />
              <Route path="settings" element={<AdminPlaceholderPage />} />
            </Route>
          </Route>

          {/* Public Website Routes */}
          <Route element={<PublicLayout />}>
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
          </Route>
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
};

export default App;
