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
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { AdminJoiningListPage } from './pages/admin/AdminJoiningListPage';
import { AdminJoiningDetailPage } from './pages/admin/AdminJoiningDetailPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminCompaniesPage } from './pages/admin/AdminCompaniesPage';
import { AdminCompanyDetailPage } from './pages/admin/AdminCompanyDetailPage';
import { AdminJobsPage } from './pages/admin/AdminJobsPage';
import { AdminJobDetailPage } from './pages/admin/AdminJobDetailPage';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';
import { AdminDocumentDetailPage } from './pages/admin/AdminDocumentDetailPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminPaymentDetailPage } from './pages/admin/AdminPaymentDetailPage';
import { AdminReferenceSlipsPage } from './pages/admin/AdminReferenceSlipsPage';
import { AdminReferenceSlipDetailPage } from './pages/admin/AdminReferenceSlipDetailPage';
import { AdminEmployeesPage } from './pages/admin/AdminEmployeesPage';
import { AdminEmployeeDetailPage } from './pages/admin/AdminEmployeeDetailPage';
import { AdminFilesPage } from './pages/admin/AdminFilesPage';
import { AdminFileDetailPage } from './pages/admin/AdminFileDetailPage';
import { AdminActivityPage } from './pages/admin/AdminActivityPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminJoiningSettingsPage } from './pages/admin/AdminJoiningSettingsPage';
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
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { CandidatePaymentPage } from './pages/CandidatePaymentPage';
import { TermsAndConditionsPage } from './pages/TermsAndConditionsPage';
import { ConsultancyPolicyPage } from './pages/ConsultancyPolicyPage';
import { LegalDocumentsPage } from './pages/LegalDocumentsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { EmployeeVerificationPage } from './pages/EmployeeVerificationPage';

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
              <Route path="joining" element={<AdminJoiningListPage />} />
              <Route path="joining/:id" element={<AdminJoiningDetailPage />} />
              <Route path="admin-users" element={<AdminUsersPage />} />
              <Route path="settings/admin-users" element={<AdminUsersPage />} />
              <Route path="exports" element={<AdminExportsPage />} />

              {/* Management Suite Modules */}
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="jobs/:id" element={<AdminJobDetailPage />} />
              <Route path="companies" element={<AdminCompaniesPage />} />
              <Route path="companies/:id" element={<AdminCompanyDetailPage />} />
              <Route path="documents" element={<AdminDocumentsPage />} />
              <Route path="documents/:id" element={<AdminDocumentDetailPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="payments/:id" element={<AdminPaymentDetailPage />} />
              <Route path="reference-slips" element={<AdminReferenceSlipsPage />} />
              <Route path="reference-slips/:id" element={<AdminReferenceSlipDetailPage />} />
              <Route path="employees" element={<AdminEmployeesPage />} />
              <Route path="employees/:id" element={<AdminEmployeeDetailPage />} />
              <Route path="files" element={<AdminFilesPage />} />
              <Route path="files/:id" element={<AdminFileDetailPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="joining-form-settings" element={<AdminJoiningSettingsPage />} />

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
            <Route path="/for-employers" element={<Employers />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/joining/access" element={<Navigate to="/joining" replace />} />
            <Route path="/joining/payment" element={<CandidatePaymentPage />} />
            <Route path="/joining" element={<Joining />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/consultancy-policy" element={<ConsultancyPolicyPage />} />
            <Route path="/legal-documents" element={<LegalDocumentsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/policy" element={<TermsAndConditionsPage />} />
            <Route path="/verify/employee/:token" element={<EmployeeVerificationPage />} />
            <Route path="/verify/employee" element={<EmployeeVerificationPage />} />

            {/* Public 404 Fallback - Only catches non-admin URLs */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
};

export default App;
