// ==============================================================================
// File: src/pages/admin/AdminExportsPage.tsx
// Description: Official Data Export Management for A TIGER GROUPS
// Features: Job Seeker & Employer enquiries export in CSV and Excel (XLSX) formats,
//           filter-aware query execution, and secure client-side download.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { ApplicationRow, EmployerEnquiryRow, CompanyRow, ApplicationStatus, EmployerEnquiryStatus } from '../../types/database';
import { ExportCard } from '../../components/admin/ExportCard';
import { ExportButton } from '../../components/admin/ExportButton';
import {
  generateCsv,
  downloadCsv,
  downloadXlsx,
  getExportDateStamp
} from '../../utils/exportUtils';
import {
  Users,
  Building2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const JOB_SEEKER_CSV_HEADERS = [
  { key: 'srNo', label: 'Sr. No.' },
  { key: 'application_number', label: 'Application Number' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'mobile', label: 'Mobile Number' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'desired_company', label: 'Company You Want To Work For' },
  { key: 'designation', label: 'Designation / Job Position' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'joining_access', label: 'Joining Access' },
  { key: 'created_date', label: 'Created Date' },
  { key: 'updated_date', label: 'Updated Date' }
];

const EMPLOYER_CSV_HEADERS = [
  { key: 'srNo', label: 'Sr. No.' },
  { key: 'company_name', label: 'Company Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'address', label: 'Address' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'employees_required', label: 'Employees Required' },
  { key: 'job_role', label: 'Job Role / Nature of Work' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'created_date', label: 'Created Date' },
  { key: 'updated_date', label: 'Updated Date' }
];

export const AdminExportsPage: React.FC = () => {
  // Feedback states
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Available Companies for filtering
  const [companies, setCompanies] = useState<CompanyRow[]>([]);

  // Job Seeker Filters
  const [jsStatusFilter, setJsStatusFilter] = useState<string>('ALL');
  const [jsCompanyFilter, setJsCompanyFilter] = useState<string>('ALL');
  const [jsStartDate, setJsStartDate] = useState<string>('');
  const [jsEndDate, setJsEndDate] = useState<string>('');

  // Employer Filters
  const [empStatusFilter, setEmpStatusFilter] = useState<string>('ALL');
  const [empStartDate, setEmpStartDate] = useState<string>('');
  const [empEndDate, setEmpEndDate] = useState<string>('');

  // Counts for display
  const [jobSeekerTotal, setJobSeekerTotal] = useState<number | null>(null);
  const [employerTotal, setEmployerTotal] = useState<number | null>(null);

  useEffect(() => {
    // Fetch active companies
    supabase
      .from('companies')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setCompanies(data as CompanyRow[]);
      });

    // Fetch counts
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setJobSeekerTotal(count ?? 0));

    supabase
      .from('employer_enquiries')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setEmployerTotal(count ?? 0));
  }, []);

  // Fetch Job Seeker enquiries from database with filters
  const fetchFilteredJobSeekers = async (applyFilters = true): Promise<Record<string, unknown>[]> => {
    let query = supabase.from('applications').select('*');

    if (applyFilters) {
      if (jsStatusFilter !== 'ALL') {
        query = query.eq('status', jsStatusFilter as ApplicationStatus);
      }
      if (jsCompanyFilter !== 'ALL') {
        query = query.eq('desired_company', jsCompanyFilter);
      }
      if (jsStartDate) {
        query = query.gte('created_at', new Date(jsStartDate).toISOString());
      }
      if (jsEndDate) {
        // Include full day of end date
        const end = new Date(jsEndDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to query job seeker records: ${error.message}`);
    }

    const apps = (data as ApplicationRow[]) || [];
    return apps.map((app, index) => ({
      srNo: index + 1,
      application_number: app.application_number,
      full_name: app.full_name,
      father_name: app.father_name || '',
      mobile: app.mobile,
      email: app.email,
      address: app.address || '',
      desired_company: app.desired_company || '',
      designation: app.designation || '',
      description: app.description || '',
      status: app.status,
      joining_access: app.joining_access_enabled ? 'ENABLED' : 'LOCKED',
      created_date: new Date(app.created_at).toLocaleString('en-IN'),
      updated_date: new Date(app.updated_at).toLocaleString('en-IN')
    }));
  };

  // Fetch Employer enquiries from database with filters
  const fetchFilteredEmployers = async (applyFilters = true): Promise<Record<string, unknown>[]> => {
    let query = supabase.from('employer_enquiries').select('*');

    if (applyFilters) {
      if (empStatusFilter !== 'ALL') {
        query = query.eq('status', empStatusFilter as EmployerEnquiryStatus);
      }
      if (empStartDate) {
        query = query.gte('created_at', new Date(empStartDate).toISOString());
      }
      if (empEndDate) {
        const end = new Date(empEndDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to query employer records: ${error.message}`);
    }

    const enqs = (data as EmployerEnquiryRow[]) || [];
    return enqs.map((enq, index) => ({
      srNo: index + 1,
      company_name: enq.company_name,
      email: enq.email,
      phone: enq.phone,
      address: enq.address,
      district: enq.district,
      state: enq.state,
      employees_required: enq.employees_required,
      job_role: enq.job_role,
      description: enq.description || '',
      status: enq.status,
      created_date: new Date(enq.created_at).toLocaleString('en-IN'),
      updated_date: new Date(enq.updated_at).toLocaleString('en-IN')
    }));
  };

  // Job Seeker Export Handlers
  const handleExportJobSeekerCsv = async (all = false) => {
    const typeKey = all ? 'js-csv-all' : 'js-csv';
    setLoadingType(typeKey);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const records = await fetchFilteredJobSeekers(!all);
      if (records.length === 0) {
        setErrorNotice('No matching job seeker records found to export.');
        return;
      }
      const csv = generateCsv(records, JOB_SEEKER_CSV_HEADERS);
      const filename = `ATG_Job_Seeker_Enquiries_${getExportDateStamp()}.csv`;
      downloadCsv(csv, filename);
      setSuccessNotice(`Successfully exported ${records.length} Job Seeker records to ${filename}`);
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : 'Job seeker CSV export failed.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportJobSeekerXlsx = async (all = false) => {
    const typeKey = all ? 'js-xlsx-all' : 'js-xlsx';
    setLoadingType(typeKey);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const records = await fetchFilteredJobSeekers(!all);
      if (records.length === 0) {
        setErrorNotice('No matching job seeker records found to export.');
        return;
      }
      const filename = `ATG_Job_Seeker_Enquiries_${getExportDateStamp()}.xlsx`;
      downloadXlsx(records, filename, 'Job Seeker Enquiries');
      setSuccessNotice(`Successfully exported ${records.length} Job Seeker records to ${filename}`);
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : 'Job seeker Excel export failed.');
    } finally {
      setLoadingType(null);
    }
  };

  // Employer Export Handlers
  const handleExportEmployerCsv = async (all = false) => {
    const typeKey = all ? 'emp-csv-all' : 'emp-csv';
    setLoadingType(typeKey);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const records = await fetchFilteredEmployers(!all);
      if (records.length === 0) {
        setErrorNotice('No matching employer records found to export.');
        return;
      }
      const csv = generateCsv(records, EMPLOYER_CSV_HEADERS);
      const filename = `ATG_Employer_Enquiries_${getExportDateStamp()}.csv`;
      downloadCsv(csv, filename);
      setSuccessNotice(`Successfully exported ${records.length} Employer records to ${filename}`);
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : 'Employer CSV export failed.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportEmployerXlsx = async (all = false) => {
    const typeKey = all ? 'emp-xlsx-all' : 'emp-xlsx';
    setLoadingType(typeKey);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const records = await fetchFilteredEmployers(!all);
      if (records.length === 0) {
        setErrorNotice('No matching employer records found to export.');
        return;
      }
      const filename = `ATG_Employer_Enquiries_${getExportDateStamp()}.xlsx`;
      downloadXlsx(records, filename, 'Employer Enquiries');
      setSuccessNotice(`Successfully exported ${records.length} Employer records to ${filename}`);
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : 'Employer Excel export failed.');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div>
      {/* Top Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#192A56',
            letterSpacing: '-0.02em',
            margin: '0 0 0.25rem 0'
          }}
        >
          Data & Enquiry Exports
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748B', margin: 0 }}>
          Export registered job seeker applications and employer corporate manpower requests to CSV or Excel (XLSX)
        </p>
      </div>

      {/* Notices */}
      {errorNotice && (
        <div
          style={{
            backgroundColor: '#FBF0EF',
            border: '1px solid #EDA6A3',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={20} color="#C9726F" />
          <span style={{ fontSize: '0.875rem', color: '#C9726F', fontWeight: 600 }}>{errorNotice}</span>
        </div>
      )}

      {successNotice && (
        <div
          style={{
            backgroundColor: '#E8F5E9',
            border: '1px solid #A5D6A7',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <CheckCircle2 size={20} color="#2E7D32" />
          <span style={{ fontSize: '0.875rem', color: '#2E7D32', fontWeight: 600 }}>{successNotice}</span>
        </div>
      )}

      {/* Two Main Export Sections */}
      <div className="admin-exports-grid">
        {/* Section 1: JOB SEEKER ENQUIRIES */}
        <ExportCard
          title="JOB SEEKER ENQUIRIES"
          description="Export candidate enquiries registered through the website and careers portal. Includes contact details, desired company, designation, status, and registration timestamp."
          recordCountText={jobSeekerTotal !== null ? `Total Records: ${jobSeekerTotal}` : undefined}
          icon={Users}
          filtersSlot={
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {/* Status filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#192A56', marginBottom: '3px' }}>
                  Status Filter
                </label>
                <select
                  value={jsStatusFilter}
                  onChange={(e) => setJsStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#192A56',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW_ENQUIRY">New Enquiry</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEW_SELECTED">Selected</option>
                  <option value="JOINING_SUBMITTED">Joining Submitted</option>
                  <option value="VERIFIED_ACTIVE">Verified Active</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Company filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#192A56', marginBottom: '3px' }}>
                  Company Filter
                </label>
                <select
                  value={jsCompanyFilter}
                  onChange={(e) => setJsCompanyFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#192A56',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#192A56', marginBottom: '3px' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={jsStartDate}
                  onChange={(e) => setJsStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.45rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#192A56',
                    outline: 'none'
                  }}
                />
              </div>

              {/* End Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#192A56', marginBottom: '3px' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={jsEndDate}
                  onChange={(e) => setJsEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.45rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#192A56',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          }
          actionsSlot={
            <>
              <ExportButton
                format="csv"
                onClick={() => handleExportJobSeekerCsv(false)}
                loading={loadingType === 'js-csv'}
                label="Export Filtered CSV"
              />
              <ExportButton
                format="xlsx"
                onClick={() => handleExportJobSeekerXlsx(false)}
                loading={loadingType === 'js-xlsx'}
                label="Export Filtered Excel"
              />
              <ExportButton
                format="all"
                onClick={() => handleExportJobSeekerXlsx(true)}
                loading={loadingType === 'js-xlsx-all'}
                label="Export All (Excel)"
              />
            </>
          }
        />

        {/* Section 2: EMPLOYER ENQUIRIES */}
        <ExportCard
          title="EMPLOYER ENQUIRIES"
          description="Export corporate manpower and staffing requests submitted by businesses. Includes corporate contact person, required head count, job role description, location, and enquiry status."
          recordCountText={employerTotal !== null ? `Total Records: ${employerTotal}` : undefined}
          icon={Building2}
          filtersSlot={
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {/* Status filter */}
              <div className="admin-col-span-2">
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#192A56', marginBottom: '3px' }}>
                  Enquiry Status
                </label>
                <select
                  value={empStatusFilter}
                  onChange={(e) => setEmpStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#192A56',
                    outline: 'none'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="CONTRACTED">Contracted</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#192A56', marginBottom: '3px' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={empStartDate}
                  onChange={(e) => setEmpStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.45rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#192A56',
                    outline: 'none'
                  }}
                />
              </div>

              {/* End Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#192A56', marginBottom: '3px' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={empEndDate}
                  onChange={(e) => setEmpEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.45rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D2CECE',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#192A56',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          }
          actionsSlot={
            <>
              <ExportButton
                format="csv"
                onClick={() => handleExportEmployerCsv(false)}
                loading={loadingType === 'emp-csv'}
                label="Export Filtered CSV"
              />
              <ExportButton
                format="xlsx"
                onClick={() => handleExportEmployerXlsx(false)}
                loading={loadingType === 'emp-xlsx'}
                label="Export Filtered Excel"
              />
              <ExportButton
                format="all"
                onClick={() => handleExportEmployerXlsx(true)}
                loading={loadingType === 'emp-xlsx-all'}
                label="Export All (Excel)"
              />
            </>
          }
        />
      </div>

      {/* Security & Confidentiality Notice */}
      <div
        style={{
          marginTop: '2.5rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          border: '1px solid #E2DFD8',
          fontSize: '0.8rem',
          color: '#64748B',
          lineHeight: 1.5
        }}
      >
        <strong style={{ color: '#192A56', display: 'block', marginBottom: '0.25rem' }}>
          Confidential Business Data Protection:
        </strong>
        Enquiry export files contain candidate contact details and business requirements. Only authorized
        personnel of TIGER GROUPS are permitted to download and process these files. Candidate KYC documents,
        Aadhaar, PAN, and banking information are strictly excluded from basic enquiry exports.
      </div>
    </div>
  );
};
