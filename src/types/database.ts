// ==============================================================================
// File: src/types/database.ts
// Description: Supabase Database TypeScript Definitions
// Auto-generated & typed for A TIGER GROUPS / A TIGER GLOBAL Schema
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ApplicationStatus =
  | 'NEW_ENQUIRY'
  | 'SCREENING'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_SELECTED'
  | 'JOINING_ACCESS_GRANTED'
  | 'JOINING_SUBMITTED'
  | 'DOCUMENT_VERIFIED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESSFUL'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED_ACTIVE'
  | 'REJECTED'
  | 'ARCHIVED';

export type PaymentPurpose = 'REGISTRATION' | 'CONSULTANCY' | 'OTHER';


export type EmployerEnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'IN_REVIEW'
  | 'CONTRACTED'
  | 'CLOSED';

export type CompanyType = 'GROUP_BUSINESS' | 'EMPLOYER_PARTNER' | 'OTHER';

export type JobStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export type JoiningSubmissionStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'REUPLOAD_REQUIRED'
  | 'RESUBMITTED'
  | 'VERIFIED'
  | 'APPROVED'
  | 'REJECTED';

export type DocumentType =
  | 'PHOTO'
  | 'SIGNATURE'
  | 'AADHAAR'
  | 'PAN'
  | 'BANK_PASSBOOK'
  | 'EDUCATION_CERTIFICATE'
  | 'ADDRESS_PROOF'
  | 'EXPERIENCE_CERTIFICATE'
  | 'OTHER';

export type DocumentSide = 'FRONT' | 'BACK' | 'SINGLE' | null;

export type DocumentVerificationStatus =
  | 'UPLOADED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'PENDING';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'OFFLINE';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'PROBATION'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'ON_LEAVE';

export type GeneratedFileType =
  | 'JOINING_PACKET_PDF'
  | 'REFERENCE_SLIP_PDF'
  | 'ID_CARD_PDF'
  | 'RECEIPT_PDF'
  | 'EXCEL_EXPORT';

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'COORDINATOR'
  | 'DOCUMENT_VERIFIER'
  | 'ACCOUNTANT';

export type NotificationType =
  | 'NEW_JOB_ENQUIRY'
  | 'NEW_EMPLOYER_ENQUIRY'
  | 'PAYMENT_SUCCESS'
  | 'DOCUMENT_UPLOADED'
  | 'JOINING_FORM_SUBMITTED';

export interface Database {
  public: {
    Tables: {
      candidate_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      applications: {
        Row: {
          id: string;
          application_number: string;
          job_id: string | null;
          full_name: string;
          father_name: string;
          mobile: string;
          email: string;
          address: string;
          desired_company: string;
          designation: string;
          description: string | null;
          status: ApplicationStatus;
          joining_access_enabled: boolean;
          joining_access_enabled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_number?: string;
          job_id?: string | null;
          full_name: string;
          father_name: string;
          mobile: string;
          email: string;
          address: string;
          desired_company: string;
          designation: string;
          description?: string | null;
          status?: ApplicationStatus;
          joining_access_enabled?: boolean;
          joining_access_enabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_number?: string;
          job_id?: string | null;
          full_name?: string;
          father_name?: string;
          mobile?: string;
          email?: string;
          address?: string;
          desired_company?: string;
          designation?: string;
          description?: string | null;
          status?: ApplicationStatus;
          joining_access_enabled?: boolean;
          joining_access_enabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      employer_enquiries: {
        Row: {
          id: string;
          enquiry_number: string;
          company_name: string;
          email: string;
          phone: string;
          address: string;
          district: string;
          state: string;
          employees_required: number;
          job_role: string;
          description: string | null;
          status: EmployerEnquiryStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          enquiry_number?: string | null;
          company_name: string;
          email: string;
          phone: string;
          address: string;
          district: string;
          state: string;
          employees_required: number;
          job_role: string;
          description?: string | null;
          status?: EmployerEnquiryStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          enquiry_number?: string | null;
          company_name?: string;
          email?: string;
          phone?: string;
          address?: string;
          district?: string;
          state?: string;
          employees_required?: number;
          job_role?: string;
          description?: string | null;
          status?: EmployerEnquiryStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      companies: {
        Row: {
          id: string;
          name: string;
          company_type: CompanyType;
          address: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company_type: CompanyType;
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company_type?: CompanyType;
          address?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      jobs: {
        Row: {
          id: string;
          company_id: string | null;
          title: string;
          department: string | null;
          location: string;
          employment_type: string;
          salary_range: string | null;
          vacancies: number;
          experience_level: string | null;
          description: string | null;
          responsibilities: string | null;
          requirements: string | null;
          status: JobStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          title: string;
          department?: string | null;
          location: string;
          employment_type: string;
          salary_range?: string | null;
          vacancies?: number;
          experience_level?: string | null;
          description?: string | null;
          responsibilities?: string | null;
          requirements?: string | null;
          status?: JobStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          title?: string;
          department?: string | null;
          location?: string;
          employment_type?: string;
          salary_range?: string | null;
          vacancies?: number;
          experience_level?: string | null;
          description?: string | null;
          responsibilities?: string | null;
          requirements?: string | null;
          status?: JobStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      joining_forms: {
        Row: {
          id: string;
          application_id: string | null;
          user_id: string | null;
          candidate_name: string | null;
          joining_reference: string | null;
          company_id: string | null;
          unit: string | null;
          company_address: string | null;
          employee_code: string | null;
          department: string | null;
          sub_department: string | null;
          designation: string | null;
          location: string | null;
          date_of_joining: string | null;
          gross_salary: number | null;
          date_of_birth: string | null;
          gender: string | null;
          mother_or_husband_name: string | null;
          marital_status: string | null;
          spouse_name: string | null;
          blood_group: string | null;
          aadhaar_number: string | null;
          pan_number: string | null;
          employee_contact_number: string | null;
          other_contact_number: string | null;
          email: string | null;
          permanent_address: string | null;
          permanent_city: string | null;
          permanent_district: string | null;
          permanent_state: string | null;
          permanent_country: string | null;
          permanent_pin_code: string | null;
          current_address: string | null;
          current_city: string | null;
          current_district: string | null;
          current_state: string | null;
          current_country: string | null;
          current_pin_code: string | null;
          same_as_permanent: boolean;
          bank_account_holder: string | null;
          bank_account_number: string | null;
          ifsc_code: string | null;
          bank_name: string | null;
          branch_name: string | null;
          uan: string | null;
          esic_number: string | null;
          pt_number: string | null;
          candidate_signature_path: string | null;
          photo_path: string | null;
          father_name: string | null;
          candidate_auth_user_id: string | null;
          field_corrections: Record<string, any>;
          custom_fields: Record<string, any>;
          submission_status: JoiningSubmissionStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          user_id?: string | null;
          candidate_auth_user_id?: string | null;
          field_corrections?: Record<string, any>;
          candidate_name?: string | null;
          joining_reference?: string | null;
          company_id?: string | null;
          unit?: string | null;
          company_address?: string | null;
          employee_code?: string | null;
          department?: string | null;
          sub_department?: string | null;
          designation?: string | null;
          location?: string | null;
          date_of_joining?: string | null;
          gross_salary?: number | null;
          date_of_birth?: string | null;
          gender?: string | null;
          mother_or_husband_name?: string | null;
          marital_status?: string | null;
          spouse_name?: string | null;
          blood_group?: string | null;
          aadhaar_number?: string | null;
          pan_number?: string | null;
          employee_contact_number?: string | null;
          other_contact_number?: string | null;
          email?: string | null;
          permanent_address?: string | null;
          permanent_city?: string | null;
          permanent_district?: string | null;
          permanent_state?: string | null;
          permanent_country?: string | null;
          permanent_pin_code?: string | null;
          current_address?: string | null;
          current_city?: string | null;
          current_district?: string | null;
          current_state?: string | null;
          current_country?: string | null;
          current_pin_code?: string | null;
          same_as_permanent?: boolean;
          bank_account_holder?: string | null;
          bank_account_number?: string | null;
          ifsc_code?: string | null;
          bank_name?: string | null;
          branch_name?: string | null;
          uan?: string | null;
          esic_number?: string | null;
          pt_number?: string | null;
          candidate_signature_path?: string | null;
          photo_path?: string | null;
          father_name?: string | null;
          custom_fields?: Record<string, any>;
          submission_status?: JoiningSubmissionStatus;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          user_id?: string | null;
          candidate_auth_user_id?: string | null;
          field_corrections?: Record<string, any>;
          candidate_name?: string | null;
          joining_reference?: string | null;
          company_id?: string | null;
          unit?: string | null;
          company_address?: string | null;
          employee_code?: string | null;
          department?: string | null;
          sub_department?: string | null;
          designation?: string | null;
          location?: string | null;
          date_of_joining?: string | null;
          gross_salary?: number | null;
          date_of_birth?: string | null;
          gender?: string | null;
          mother_or_husband_name?: string | null;
          marital_status?: string | null;
          spouse_name?: string | null;
          blood_group?: string | null;
          aadhaar_number?: string | null;
          pan_number?: string | null;
          employee_contact_number?: string | null;
          other_contact_number?: string | null;
          email?: string | null;
          permanent_address?: string | null;
          permanent_city?: string | null;
          permanent_district?: string | null;
          permanent_state?: string | null;
          permanent_country?: string | null;
          permanent_pin_code?: string | null;
          current_address?: string | null;
          current_city?: string | null;
          current_district?: string | null;
          current_state?: string | null;
          current_country?: string | null;
          current_pin_code?: string | null;
          same_as_permanent?: boolean;
          bank_account_holder?: string | null;
          bank_account_number?: string | null;
          ifsc_code?: string | null;
          bank_name?: string | null;
          branch_name?: string | null;
          uan?: string | null;
          esic_number?: string | null;
          pt_number?: string | null;
          candidate_signature_path?: string | null;
          photo_path?: string | null;
          father_name?: string | null;
          custom_fields?: Record<string, any>;
          submission_status?: JoiningSubmissionStatus;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      emergency_contacts: {
        Row: {
          id: string;
          joining_form_id: string;
          name: string;
          contact_number: string;
          relation: string;
          address: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          joining_form_id: string;
          name: string;
          contact_number: string;
          relation: string;
          address?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          joining_form_id?: string;
          name?: string;
          contact_number?: string;
          relation?: string;
          address?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };

      education_records: {
        Row: {
          id: string;
          joining_form_id: string;
          qualification: string;
          board_university: string | null;
          year: number | null;
          percentage_or_grade: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          joining_form_id: string;
          qualification: string;
          board_university?: string | null;
          year?: number | null;
          percentage_or_grade?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          joining_form_id?: string;
          qualification?: string;
          board_university?: string | null;
          year?: number | null;
          percentage_or_grade?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };

      family_details: {
        Row: {
          id: string;
          joining_form_id: string;
          name: string;
          age_or_date_of_birth: string | null;
          relation: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          joining_form_id: string;
          name: string;
          age_or_date_of_birth?: string | null;
          relation: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          joining_form_id?: string;
          name?: string;
          age_or_date_of_birth?: string | null;
          relation?: string;
          sort_order?: number;
        };
        Relationships: [];
      };

      joining_form_field_configs: {
        Row: {
          id: string;
          field_key: string;
          section: string;
          label: string;
          field_type: string;
          is_required: boolean;
          is_enabled: boolean;
          is_system: boolean;
          display_order: number;
          placeholder: string | null;
          help_text: string | null;
          options: any[] | null;
          validation_rules: Record<string, any> | null;
          conditional_rules: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          field_key: string;
          section: string;
          label: string;
          field_type: string;
          is_required?: boolean;
          is_enabled?: boolean;
          is_system?: boolean;
          display_order?: number;
          placeholder?: string | null;
          help_text?: string | null;
          options?: any[] | null;
          validation_rules?: Record<string, any> | null;
          conditional_rules?: Record<string, any> | null;
          conditional_rule?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          field_key?: string;
          section?: string;
          label?: string;
          field_type?: string;
          is_required?: boolean;
          is_enabled?: boolean;
          is_system?: boolean;
          display_order?: number;
          placeholder?: string | null;
          help_text?: string | null;
          options?: any[] | null;
          validation_rules?: Record<string, any> | null;
          conditional_rules?: Record<string, any> | null;
          conditional_rule?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      documents: {
        Row: {
          id: string;
          application_id: string | null;
          joining_form_id: string | null;
          document_type: DocumentType;
          document_side: DocumentSide;
          storage_path: string | null;
          original_file_name: string | null;
          mime_type: string | null;
          file_size: number | null;
          verification_status: DocumentVerificationStatus;
          rejection_reason: string | null;
          uploaded_at: string;
          verified_at: string | null;
          verified_by: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          is_current: boolean;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          document_type: DocumentType;
          document_side?: DocumentSide;
          storage_path?: string | null;
          original_file_name?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          verification_status?: DocumentVerificationStatus;
          rejection_reason?: string | null;
          uploaded_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          is_current?: boolean;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          document_type?: DocumentType;
          document_side?: DocumentSide;
          storage_path?: string | null;
          original_file_name?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          verification_status?: DocumentVerificationStatus;
          rejection_reason?: string | null;
          uploaded_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          is_current?: boolean;
        };
        Relationships: [];
      };

      declarations: {
        Row: {
          id: string;
          joining_form_id: string;
          candidate_acceptance: boolean;
          background_check_consent: boolean | null;
          code_of_conduct_acceptance: boolean | null;
          signatory_name: string | null;
          declaration_date: string | null;
          candidate_signature_path: string | null;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          joining_form_id: string;
          candidate_acceptance?: boolean;
          background_check_consent?: boolean | null;
          code_of_conduct_acceptance?: boolean | null;
          signatory_name?: string | null;
          declaration_date?: string | null;
          candidate_signature_path?: string | null;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          joining_form_id?: string;
          candidate_acceptance?: boolean;
          background_check_consent?: boolean | null;
          code_of_conduct_acceptance?: boolean | null;
          signatory_name?: string | null;
          declaration_date?: string | null;
          candidate_signature_path?: string | null;
          accepted_at?: string | null;
        };
        Relationships: [];
      };

      payments: {
        Row: {
          id: string;
          application_id: string | null;
          joining_form_id: string | null;
          payment_reference: string;
          amount: number;
          currency: string;
          purpose: string;
          payment_method: string | null;
          gateway: string | null;
          gateway_order_id: string | null;
          gateway_payment_id: string | null;
          status: PaymentStatus;
          paid_at: string | null;
          receipt_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          payment_reference: string;
          amount: number;
          currency?: string;
          purpose: string;
          payment_method?: string | null;
          gateway?: string | null;
          gateway_order_id?: string | null;
          gateway_payment_id?: string | null;
          status?: PaymentStatus;
          paid_at?: string | null;
          receipt_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          payment_reference?: string;
          amount?: number;
          currency?: string;
          purpose?: string;
          payment_method?: string | null;
          gateway?: string | null;
          gateway_order_id?: string | null;
          gateway_payment_id?: string | null;
          status?: PaymentStatus;
          paid_at?: string | null;
          receipt_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      reference_slips: {
        Row: {
          id: string;
          application_id: string | null;
          joining_form_id: string | null;
          company_id: string | null;
          company_name: string | null;
          reference_number: string;
          date: string;
          interview_date: string | null;
          reporting_date: string | null;
          reporting_time: string | null;
          department: string | null;
          designation: string | null;
          salary_ctc: number | null;
          interview_conducted_by: string | null;
          interview_result: string | null;
          selected_designation: string | null;
          joining_date: string | null;
          remarks: string | null;
          candidate_signature_path: string | null;
          authorized_signature_path: string | null;
          company_signature_path: string | null;
          company_seal_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          company_id?: string | null;
          company_name?: string | null;
          reference_number: string;
          date?: string;
          interview_date?: string | null;
          reporting_date?: string | null;
          reporting_time?: string | null;
          department?: string | null;
          designation?: string | null;
          salary_ctc?: number | null;
          interview_conducted_by?: string | null;
          interview_result?: string | null;
          selected_designation?: string | null;
          joining_date?: string | null;
          remarks?: string | null;
          candidate_signature_path?: string | null;
          authorized_signature_path?: string | null;
          company_signature_path?: string | null;
          company_seal_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          company_id?: string | null;
          company_name?: string | null;
          reference_number?: string;
          date?: string;
          interview_date?: string | null;
          reporting_date?: string | null;
          reporting_time?: string | null;
          department?: string | null;
          designation?: string | null;
          salary_ctc?: number | null;
          interview_conducted_by?: string | null;
          interview_result?: string | null;
          selected_designation?: string | null;
          joining_date?: string | null;
          remarks?: string | null;
          candidate_signature_path?: string | null;
          authorized_signature_path?: string | null;
          company_signature_path?: string | null;
          company_seal_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      consultancy_returns: {
        Row: {
          id: string;
          application_id: string | null;
          joining_form_id: string | null;
          candidate_acceptance: boolean;
          candidate_signature_path: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          candidate_acceptance?: boolean;
          candidate_signature_path?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          candidate_acceptance?: boolean;
          candidate_signature_path?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      employees: {
        Row: {
          id: string;
          application_id: string | null;
          joining_form_id: string | null;
          company_id: string | null;
          employee_code: string;
          candidate_name: string | null;
          mobile: string | null;
          email: string | null;
          joining_reference: string | null;
          designation: string | null;
          department: string | null;
          location: string | null;
          joining_date: string | null;
          employment_status: EmploymentStatus;
          id_card_number: string | null;
          verification_token: string | null;
          verification_enabled: boolean;
          id_card_issued_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          company_id?: string | null;
          employee_code: string;
          candidate_name?: string | null;
          mobile?: string | null;
          email?: string | null;
          joining_reference?: string | null;
          designation?: string | null;
          department?: string | null;
          location?: string | null;
          joining_date?: string | null;
          employment_status?: EmploymentStatus;
          id_card_number?: string | null;
          verification_token?: string | null;
          verification_enabled?: boolean;
          id_card_issued_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          company_id?: string | null;
          employee_code?: string;
          candidate_name?: string | null;
          mobile?: string | null;
          email?: string | null;
          joining_reference?: string | null;
          designation?: string | null;
          department?: string | null;
          location?: string | null;
          joining_date?: string | null;
          employment_status?: EmploymentStatus;
          id_card_number?: string | null;
          verification_token?: string | null;
          verification_enabled?: boolean;
          id_card_issued_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      generated_files: {
        Row: {
          id: string;
          application_id: string | null;
          joining_form_id: string | null;
          file_type: GeneratedFileType;
          storage_path: string;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          version: number;
          generated_at: string;
          generated_by: string | null;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          file_type: GeneratedFileType;
          storage_path: string;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          version?: number;
          generated_at?: string;
          generated_by?: string | null;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          joining_form_id?: string | null;
          file_type?: GeneratedFileType;
          storage_path?: string;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          version?: number;
          generated_at?: string;
          generated_by?: string | null;
        };
        Relationships: [];
      };

      activity_logs: {
        Row: {
          id: string;
          application_id: string | null;
          entity_type: string | null;
          entity_id: string | null;
          admin_user_id: string | null;
          action: string;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          admin_user_id?: string | null;
          action: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          admin_user_id?: string | null;
          action?: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };

      system_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          category: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          description?: string | null;
          category?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          category?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      admin_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: AdminRole;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: AdminRole;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: AdminRole;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          admin_user_id: string | null;
          type: NotificationType;
          title: string;
          message: string;
          application_id: string | null;
          employer_enquiry_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id?: string | null;
          type: NotificationType;
          title: string;
          message: string;
          application_id?: string | null;
          employer_enquiry_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_user_id?: string | null;
          type?: NotificationType;
          title?: string;
          message?: string;
          application_id?: string | null;
          employer_enquiry_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_application_permanently: {
        Args: {
          target_app_id: string;
        };
        Returns: Json;
      };
      delete_employer_enquiry_permanently: {
        Args: {
          target_enquiry_id: string;
        };
        Returns: Json;
      };
      delete_job_permanently: {
        Args: {
          target_job_id: string;
        };
        Returns: Json;
      };
      delete_company_permanently: {
        Args: {
          target_company_id: string;
        };
        Returns: Json;
      };
      check_joining_access_status: {
        Args: {
          candidate_email: string;
        };
        Returns: Json;
      };
      save_joining_draft_bundle: {
        Args: {
          payload: Json;
        };
        Returns: Json;
      };
      submit_joining_form_bundle: {
        Args: {
          payload: Json;
        };
        Returns: Json;
      };
      admin_verify_document: {
        Args: {
          p_doc_id: string;
        };
        Returns: Json;
      };
      admin_reject_document: {
        Args: {
          p_doc_id: string;
          p_reason: string;
        };
        Returns: Json;
      };
      create_or_get_pending_payment: {
        Args: {
          p_app_id?: string | null;
          p_purpose?: string;
          p_amount?: number;
          p_joining_form_id?: string | null;
        };
        Returns: Json;
      };
      complete_verified_payment: {
        Args: {
          p_payment_id: string;
          p_gateway_order_id: string;
          p_gateway_payment_id: string;
          p_payment_method?: string;
        };
        Returns: Json;
      };
      mark_payment_failed: {
        Args: {
          p_payment_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
      record_offline_payment: {
        Args: {
          p_app_id: string;
          p_purpose: string;
          p_amount: number;
          p_received_by: string;
          p_notes?: string;
        };
        Returns: Json;
      };
      is_active_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      manage_company_signature: {
        Args: {
          p_action: string;
          p_payload?: Json;
        };
        Returns: {
          success: boolean;
          setting?: Json;
          error?: string;
        };
      };
      get_candidate_joining_dossiers: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      candidate_reupload_document: {
        Args: {
          p_doc_id: string;
          p_storage_path: string;
          p_original_file_name: string;
          p_mime_type: string;
          p_file_size: number;
        };
        Returns: Json;
      };
      candidate_resubmit_joining_form: {
        Args: {
          p_form_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ==============================================================================
// Convenience Row Type Aliases
// ==============================================================================
export type ApplicationRow = Database['public']['Tables']['applications']['Row'];
export type ApplicationInsert = Database['public']['Tables']['applications']['Insert'];
export type ApplicationUpdate = Database['public']['Tables']['applications']['Update'];

export type AdminProfileRow = Database['public']['Tables']['admin_profiles']['Row'];
export type AdminProfileInsert = Database['public']['Tables']['admin_profiles']['Insert'];
export type AdminProfileUpdate = Database['public']['Tables']['admin_profiles']['Update'];

export type CompanyRow = Database['public']['Tables']['companies']['Row'];
export type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
export type CompanyUpdate = Database['public']['Tables']['companies']['Update'];


export type JobRow = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];
export type JoiningFormRow = Database['public']['Tables']['joining_forms']['Row'];
export type JoiningFormInsert = Database['public']['Tables']['joining_forms']['Insert'];
export type JoiningFormUpdate = Database['public']['Tables']['joining_forms']['Update'];

export type DocumentRow = Database['public']['Tables']['documents']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
export type ReferenceSlipRow = Database['public']['Tables']['reference_slips']['Row'];
export type ReferenceSlipInsert = Database['public']['Tables']['reference_slips']['Insert'];
export type ReferenceSlipUpdate = Database['public']['Tables']['reference_slips']['Update'];

export type ConsultancyReturnRow = Database['public']['Tables']['consultancy_returns']['Row'];
export type ConsultancyReturnInsert = Database['public']['Tables']['consultancy_returns']['Insert'];
export type ConsultancyReturnUpdate = Database['public']['Tables']['consultancy_returns']['Update'];

export type EmployerEnquiryRow = Database['public']['Tables']['employer_enquiries']['Row'];

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type EducationRecordRow = Database['public']['Tables']['education_records']['Row'];
export type FamilyDetailRow = Database['public']['Tables']['family_details']['Row'];
export type EmergencyContactRow = Database['public']['Tables']['emergency_contacts']['Row'];
export type DeclarationRow = Database['public']['Tables']['declarations']['Row'];

export type GeneratedFileRow = Database['public']['Tables']['generated_files']['Row'];
export type GeneratedFileInsert = Database['public']['Tables']['generated_files']['Insert'];
export type GeneratedFileUpdate = Database['public']['Tables']['generated_files']['Update'];

export type SystemSettingRow = Database['public']['Tables']['system_settings']['Row'];
export type SystemSettingInsert = Database['public']['Tables']['system_settings']['Insert'];
export type SystemSettingUpdate = Database['public']['Tables']['system_settings']['Update'];


