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
  | 'VERIFICATION_PENDING'
  | 'VERIFIED_ACTIVE'
  | 'REJECTED'
  | 'ARCHIVED';

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
  | 'VERIFIED'
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
      applications: {
        Row: {
          id: string;
          application_number: string;
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
          location: string;
          employment_type: string;
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
          location: string;
          employment_type: string;
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
          location?: string;
          employment_type?: string;
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
          application_id: string;
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
          submission_status: JoiningSubmissionStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
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
          submission_status?: JoiningSubmissionStatus;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
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

      documents: {
        Row: {
          id: string;
          application_id: string;
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
        };
        Insert: {
          id?: string;
          application_id: string;
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
        };
        Update: {
          id?: string;
          application_id?: string;
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
          application_id: string;
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
          application_id: string;
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
          application_id?: string;
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
          application_id: string;
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
          application_id: string;
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
          application_id?: string;
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
          application_id: string;
          candidate_acceptance: boolean;
          candidate_signature_path: string | null;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          candidate_acceptance?: boolean;
          candidate_signature_path?: string | null;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
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
          application_id: string;
          company_id: string | null;
          employee_code: string;
          designation: string | null;
          department: string | null;
          location: string | null;
          joining_date: string | null;
          employment_status: EmploymentStatus;
          id_card_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          company_id?: string | null;
          employee_code: string;
          designation?: string | null;
          department?: string | null;
          location?: string | null;
          joining_date?: string | null;
          employment_status?: EmploymentStatus;
          id_card_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          company_id?: string | null;
          employee_code?: string;
          designation?: string | null;
          department?: string | null;
          location?: string | null;
          joining_date?: string | null;
          employment_status?: EmploymentStatus;
          id_card_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      generated_files: {
        Row: {
          id: string;
          application_id: string;
          file_type: GeneratedFileType;
          storage_path: string;
          file_name: string;
          version: number;
          generated_at: string;
          generated_by: string | null;
        };
        Insert: {
          id?: string;
          application_id: string;
          file_type: GeneratedFileType;
          storage_path: string;
          file_name: string;
          version?: number;
          generated_at?: string;
          generated_by?: string | null;
        };
        Update: {
          id?: string;
          application_id?: string;
          file_type?: GeneratedFileType;
          storage_path?: string;
          file_name?: string;
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
          admin_user_id: string | null;
          action: string;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          admin_user_id?: string | null;
          action: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          admin_user_id?: string | null;
          action?: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
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
      is_active_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
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

export type JobRow = Database['public']['Tables']['jobs']['Row'];
export type JoiningFormRow = Database['public']['Tables']['joining_forms']['Row'];
export type JoiningFormInsert = Database['public']['Tables']['joining_forms']['Insert'];
export type JoiningFormUpdate = Database['public']['Tables']['joining_forms']['Update'];

export type DocumentRow = Database['public']['Tables']['documents']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
export type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];
export type ReferenceSlipRow = Database['public']['Tables']['reference_slips']['Row'];
export type EmployerEnquiryRow = Database['public']['Tables']['employer_enquiries']['Row'];

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type EducationRecordRow = Database['public']['Tables']['education_records']['Row'];
export type FamilyDetailRow = Database['public']['Tables']['family_details']['Row'];
export type EmergencyContactRow = Database['public']['Tables']['emergency_contacts']['Row'];
export type DeclarationRow = Database['public']['Tables']['declarations']['Row'];
