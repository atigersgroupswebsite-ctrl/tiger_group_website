// ==============================================================================
// File: src/App.tsx
// Description: Master Router Architecture for A TIGER GROUPS
// Routing Architecture:
//   1. Public Admin Auth: /admin/login
//   2. Isolated Protected Admin Subtree: /admin/*
//      - Protected by AdminProtectedRoute (Supabase Auth + admin_profiles validation)
//      - Shared AdminLayout shell (Header + Sidebar + Breadcrumbs)
//      - Dedicated AdminNotFoundPage 404 (prevents fallthrough to public routes)
//   3. Public Website Subtree: / (PublicLayout)
// ==============================================================================

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
import { AdminNotFoundPage } from './pages/admin/AdminNotFoundPage';

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
import { JoiningAccessPage } from './pages/JoiningAccessPage';
import { CandidatePaymentPage } from './pages/CandidatePaymentPage';
import { Policy } from './pages/Policy';

export const App: React.FC = () => {
  return (
    <AdminAuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* 1. Admin Login (Publicly accessible login gateway for administrators) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* 2. Self-Contained Protected Admin Route Tree */}
          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              {/* Core Operations */}
              <Route index element={<AdminDashboardPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="applications/:id" element={<AdminApplicationDetailPage />} />
              <Route path="applications/:id/documents" element={<AdminApplicationDetailPage defaultTab="documents" />} />
              <Route path="applications/:id/joining" element={<AdminApplicationDetailPage defaultTab="joining" />} />
              <Route path="applications/:id/payment" element={<AdminApplicationDetailPage defaultTab="payment" />} />
              <Route path="employer-enquiries" element={<AdminEmployerEnquiriesPage />} />
              <Route path="employer-enquiries/:id" element={<AdminEmployerEnquiriesPage />} />
              <Route path="exports" element={<AdminExportsPage />} />

              {/* Management Suite Modules */}
              <Route path="jobs" element={<AdminPlaceholderPage />} />
              <Route path="jobs/:id" element={<AdminPlaceholderPage />} />
              <Route path="companies" element={<AdminPlaceholderPage />} />
              <Route path="companies/:id" element={<AdminPlaceholderPage />} />
              <Route path="joining" element={<AdminPlaceholderPage />} />
              <Route path="joining/:id" element={<AdminPlaceholderPage />} />
              <Route path="documents" element={<AdminPlaceholderPage />} />
              <Route path="documents/:id" element={<AdminPlaceholderPage />} />
              <Route path="payments" element={<AdminPlaceholderPage />} />
              <Route path="payments/:id" element={<AdminPlaceholderPage />} />
              <Route path="reference-slips" element={<AdminPlaceholderPage />} />
              <Route path="reference-slips/:id" element={<AdminPlaceholderPage />} />
              <Route path="employees" element={<AdminPlaceholderPage />} />
              <Route path="employees/:id" element={<AdminPlaceholderPage />} />
              <Route path="files" element={<AdminPlaceholderPage />} />
              <Route path="files/:id" element={<AdminPlaceholderPage />} />
              <Route path="activity" element={<AdminPlaceholderPage />} />
              <Route path="settings" element={<AdminPlaceholderPage />} />

              {/* Admin 404 Fallback - Keeps all unknown /admin/* paths strictly inside AdminLayout */}
              <Route path="*" element={<AdminNotFoundPage />} />
            </Route>
          </Route>

          {/* 3. Public Website Route Tree */}
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
            <Route path="/joining/access" element={<JoiningAccessPage />} />
            <Route path="/joining/payment" element={<CandidatePaymentPage />} />
            <Route path="/joining" element={<Joining />} />
            <Route path="/policy" element={<Policy />} />

            {/* Public 404 Fallback - Only catches non-admin URLs */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
};

export default App;
