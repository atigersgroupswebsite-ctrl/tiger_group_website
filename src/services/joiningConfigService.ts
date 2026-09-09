// ==============================================================================
// File: src/services/joiningConfigService.ts
// Description: Joining Form Dynamic Field Configuration Service
// Brand: A TIGER GLOBAL CAREER SOLUTION AND CONSULTANCY
// Architecture:
//   - Manages active Joining Form field definitions, requirements, and ordering
//   - Fallback static configuration guarantee (zero downtime if DB offline)
//   - Full CRUD for SUPER_ADMIN with auditable activity logging
//   - Read-only queries for candidates, coordinators, and document verifiers
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { JoiningFieldConfig, ConfigurableSection, ConfigurableFieldType } from '../types/joining';
import { logActivity } from './activityService';

// Default static field configuration map mirroring the official 14-page Joining Form
export const DEFAULT_FIELD_CONFIGS: JoiningFieldConfig[] = [
  // Step 02: Personal
  {
    id: 'sys-personal-name',
    field_key: 'personal.employeeName',
    section: 'personal',
    label: 'Full Name (as per Aadhaar)',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 1,
    placeholder: 'e.g. Rahul Manohar Patil',
    help_text: 'Enter candidate full legal name as printed on Aadhaar card.'
  },
  {
    id: 'sys-personal-dob',
    field_key: 'personal.dateOfBirth',
    section: 'personal',
    label: 'Date of Birth',
    field_type: 'date',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 2,
    help_text: 'Candidate must be at least 18 years of age.'
  },
  {
    id: 'sys-personal-gender',
    field_key: 'personal.gender',
    section: 'personal',
    label: 'Gender',
    field_type: 'select',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 3,
    options: [
      { label: 'Male', value: 'Male' },
      { label: 'Female', value: 'Female' },
      { label: 'Other', value: 'Other' }
    ]
  },
  {
    id: 'sys-personal-marital',
    field_key: 'personal.maritalStatus',
    section: 'personal',
    label: 'Marital Status',
    field_type: 'select',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 4,
    options: [
      { label: 'Single / Unmarried', value: 'Single' },
      { label: 'Married', value: 'Married' },
      { label: 'Divorced', value: 'Divorced' },
      { label: 'Widowed', value: 'Widowed' }
    ]
  },
  {
    id: 'sys-personal-blood',
    field_key: 'personal.bloodGroup',
    section: 'personal',
    label: 'Blood Group',
    field_type: 'select',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 5,
    options: [
      { label: 'A+', value: 'A+' },
      { label: 'A-', value: 'A-' },
      { label: 'B+', value: 'B+' },
      { label: 'B-', value: 'B-' },
      { label: 'AB+', value: 'AB+' },
      { label: 'AB-', value: 'AB-' },
      { label: 'O+', value: 'O+' },
      { label: 'O-', value: 'O-' }
    ]
  },
  {
    id: 'sys-personal-father',
    field_key: 'personal.fatherName',
    section: 'personal',
    label: "Father's Full Name",
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 6,
    placeholder: "Father's full name",
    help_text: 'Full legal name of candidate father.'
  },
  {
    id: 'sys-personal-mother',
    field_key: 'personal.motherOrHusbandName',
    section: 'personal',
    label: "Mother's / Husband's Name",
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 7,
    placeholder: "Mother's or husband's name"
  },
  {
    id: 'sys-personal-spouse',
    field_key: 'personal.spouseName',
    section: 'personal',
    label: 'Spouse Name',
    field_type: 'text',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 8,
    placeholder: 'Spouse full name',
    conditional_rule: { dependsOn: 'personal.maritalStatus', value: 'Married' }
  },
  {
    id: 'sys-personal-aadhaar',
    field_key: 'personal.aadhaarNumber',
    section: 'personal',
    label: '12-Digit Aadhaar Number',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 9,
    placeholder: '12-digit Aadhaar number'
  },
  {
    id: 'sys-personal-pan',
    field_key: 'personal.panNumber',
    section: 'personal',
    label: '10-Character PAN Number',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 10,
    placeholder: '10-character PAN (e.g. ABCDE1234F)'
  },
  {
    id: 'sys-personal-phone',
    field_key: 'personal.employeeContactNumber',
    section: 'personal',
    label: 'Primary Contact Number',
    field_type: 'phone',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 11,
    placeholder: '10-digit mobile number'
  },
  {
    id: 'sys-personal-other-phone',
    field_key: 'personal.otherContactNumber',
    section: 'personal',
    label: 'Alternate Contact Number',
    field_type: 'phone',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 12,
    placeholder: 'Alternate mobile number'
  },
  {
    id: 'sys-personal-email',
    field_key: 'personal.emailId',
    section: 'personal',
    label: 'Email Address',
    field_type: 'email',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 13,
    placeholder: 'candidate@example.com'
  },

  // Step 03: Address
  {
    id: 'sys-addr-perm-street',
    field_key: 'address.perm_address',
    section: 'address',
    label: 'Permanent Street Address',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 1,
    placeholder: 'House No, Building, Street, Area'
  },
  {
    id: 'sys-addr-perm-city',
    field_key: 'address.perm_city',
    section: 'address',
    label: 'Permanent City / Town',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 2,
    placeholder: 'City or Town'
  },
  {
    id: 'sys-addr-perm-dist',
    field_key: 'address.perm_district',
    section: 'address',
    label: 'Permanent District',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 3,
    placeholder: 'District'
  },
  {
    id: 'sys-addr-perm-state',
    field_key: 'address.perm_state',
    section: 'address',
    label: 'Permanent State',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 4,
    placeholder: 'Select State'
  },
  {
    id: 'sys-addr-perm-pin',
    field_key: 'address.perm_pinCode',
    section: 'address',
    label: 'Permanent PIN Code',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 5,
    placeholder: '6-digit PIN code'
  },
  {
    id: 'sys-addr-curr-street',
    field_key: 'address.curr_address',
    section: 'address',
    label: 'Current Street Address',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 6,
    placeholder: 'House No, Building, Street, Area'
  },
  {
    id: 'sys-addr-curr-city',
    field_key: 'address.curr_city',
    section: 'address',
    label: 'Current City / Town',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 7,
    placeholder: 'City or Town'
  },
  {
    id: 'sys-addr-curr-dist',
    field_key: 'address.curr_district',
    section: 'address',
    label: 'Current District',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 8,
    placeholder: 'District'
  },
  {
    id: 'sys-addr-curr-state',
    field_key: 'address.curr_state',
    section: 'address',
    label: 'Current State',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 9,
    placeholder: 'Select State'
  },
  {
    id: 'sys-addr-curr-pin',
    field_key: 'address.curr_pinCode',
    section: 'address',
    label: 'Current PIN Code',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 10,
    placeholder: '6-digit PIN code'
  },
  {
    id: 'sys-addr-emergency',
    field_key: 'address.emergency',
    section: 'address',
    label: 'Emergency Family Contact',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 11,
    help_text: 'At least one family emergency contact with name, phone, and address.'
  },

  // Step 04: Bank Details
  {
    id: 'sys-bank-holder',
    field_key: 'bank.accountHolderName',
    section: 'bank',
    label: 'Bank Account Holder Name',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 1,
    placeholder: 'Name as in bank records'
  },
  {
    id: 'sys-bank-acc',
    field_key: 'bank.bankAccountNumber',
    section: 'bank',
    label: 'Bank Account Number',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 2,
    placeholder: 'Account Number (9-18 digits)'
  },
  {
    id: 'sys-bank-confirm',
    field_key: 'bank.confirmBankAccountNumber',
    section: 'bank',
    label: 'Confirm Bank Account Number',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 3,
    placeholder: 'Re-enter account number'
  },
  {
    id: 'sys-bank-ifsc',
    field_key: 'bank.ifscCode',
    section: 'bank',
    label: '11-Character IFSC Code',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 4,
    placeholder: 'e.g. SBIN0001234'
  },
  {
    id: 'sys-bank-name',
    field_key: 'bank.bankName',
    section: 'bank',
    label: 'Bank Name',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 5,
    placeholder: 'e.g. State Bank of India'
  },
  {
    id: 'sys-bank-branch',
    field_key: 'bank.branchName',
    section: 'bank',
    label: 'Branch Name',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 6,
    placeholder: 'Branch location'
  },
  {
    id: 'sys-bank-uan',
    field_key: 'bank.uanNumber',
    section: 'bank',
    label: 'Universal Account Number (UAN)',
    field_type: 'text',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 7,
    placeholder: '12-digit UAN (optional)'
  },
  {
    id: 'sys-bank-esic',
    field_key: 'bank.esicNumber',
    section: 'bank',
    label: 'ESIC Insurance Number',
    field_type: 'text',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 8,
    placeholder: '17-digit ESIC (optional)'
  },
  {
    id: 'sys-bank-pt',
    field_key: 'bank.ptNumber',
    section: 'bank',
    label: 'Professional Tax (PT) Number',
    field_type: 'text',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 9,
    placeholder: 'PT Number (optional)'
  },

  // Step 05: Education
  {
    id: 'sys-edu-records',
    field_key: 'education.records',
    section: 'education',
    label: 'Academic Qualifications',
    field_type: 'text',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 1,
    help_text: 'Candidate education qualification history (optional).'
  },

  // Step 06: Family
  {
    id: 'sys-fam-records',
    field_key: 'family.records',
    section: 'family',
    label: 'Family Dependents Records',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 1,
    help_text: 'At least one family member record required for statutory gratuity & PF nominations.'
  },

  // Step 07: Documents (Separate category per requirement)
  {
    id: 'sys-doc-photo',
    field_key: 'documents.PHOTO',
    section: 'documents',
    label: 'Passport Size Photograph',
    field_type: 'file',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 1
  },
  {
    id: 'sys-doc-sig',
    field_key: 'documents.SIGNATURE',
    section: 'documents',
    label: 'Specimen Signature',
    field_type: 'file',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 2
  },
  {
    id: 'sys-doc-aadhaar-front',
    field_key: 'documents.AADHAAR_FRONT',
    section: 'documents',
    label: 'Aadhaar Card (Front Side)',
    field_type: 'file',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 3
  },
  {
    id: 'sys-doc-aadhaar-back',
    field_key: 'documents.AADHAAR_BACK',
    section: 'documents',
    label: 'Aadhaar Card (Back Side)',
    field_type: 'file',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 4
  },
  {
    id: 'sys-doc-pan',
    field_key: 'documents.PAN',
    section: 'documents',
    label: 'PAN Card Copy',
    field_type: 'file',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 5
  },
  {
    id: 'sys-doc-passbook',
    field_key: 'documents.BANK_PASSBOOK',
    section: 'documents',
    label: 'Bank Passbook / Cancelled Cheque',
    field_type: 'file',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 6
  },
  {
    id: 'sys-doc-edu-cert',
    field_key: 'documents.EDUCATION_CERTIFICATE',
    section: 'documents',
    label: 'Academic Certificates',
    field_type: 'file',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 7
  },
  {
    id: 'sys-doc-exp-cert',
    field_key: 'documents.EXPERIENCE_CERTIFICATE',
    section: 'documents',
    label: 'Experience / Relieving Certificates',
    field_type: 'file',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 8
  },

  // Step 08: Declarations
  {
    id: 'sys-decl-undertaking',
    field_key: 'declarations.candidateDeclarationAcknowledged',
    section: 'declarations',
    label: 'Joining Undertaking Acceptance',
    field_type: 'checkbox',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 1
  },
  {
    id: 'sys-decl-conduct',
    field_key: 'declarations.rulesAndConductAccepted',
    section: 'declarations',
    label: 'Code of Conduct Acceptance',
    field_type: 'checkbox',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 2
  },
  {
    id: 'sys-decl-bgv',
    field_key: 'declarations.backgroundVerificationConsent',
    section: 'declarations',
    label: 'Background Verification Consent',
    field_type: 'checkbox',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 3
  },
  {
    id: 'sys-decl-self',
    field_key: 'declarations.selfDeclarationAcknowledged',
    section: 'declarations',
    label: 'Dual Employment & Relieving Formalities',
    field_type: 'checkbox',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 4
  },
  {
    id: 'sys-decl-relative',
    field_key: 'declarations.relativeDeclarationAcknowledged',
    section: 'declarations',
    label: 'Relative Employment Policy Declaration',
    field_type: 'checkbox',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 5
  },
  {
    id: 'sys-decl-women',
    field_key: 'declarations.womenNightShiftConsent',
    section: 'declarations',
    label: 'Women Worker Night Shift Consent (Form L Rule 13)',
    field_type: 'checkbox',
    is_required: false,
    is_enabled: true,
    is_system: true,
    display_order: 6,
    conditional_rule: { dependsOn: 'personal.gender', value: 'Female' }
  },
  {
    id: 'sys-decl-signatory',
    field_key: 'declarations.signatoryName',
    section: 'declarations',
    label: 'Signatory Name',
    field_type: 'text',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 7,
    placeholder: 'Candidate Full Name'
  },
  {
    id: 'sys-decl-date',
    field_key: 'declarations.declarationDate',
    section: 'declarations',
    label: 'Declaration Date',
    field_type: 'date',
    is_required: true,
    is_enabled: true,
    is_system: true,
    display_order: 8
  }
];

export interface CreateCustomFieldInput {
  label: string;
  field_key: string;
  section: ConfigurableSection | string;
  field_type: ConfigurableFieldType;
  is_required: boolean;
  is_enabled?: boolean;
  display_order?: number;
  placeholder?: string;
  help_text?: string;
  options?: { label: string; value: string }[];
}

// In-memory runtime cache
let memoryConfigsCache: JoiningFieldConfig[] | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

/**
 * Retrieves all joining field configurations.
 * If includeDisabled is false, only active/enabled fields are returned.
 */
export async function getJoiningFieldConfigs(
  includeDisabled: boolean = false
): Promise<JoiningFieldConfig[]> {
  const now = Date.now();
  if (memoryConfigsCache && now - lastCacheFetchTime < CACHE_TTL_MS) {
    return includeDisabled
      ? memoryConfigsCache
      : memoryConfigsCache.filter((f) => f.is_enabled);
  }

  if (!isSupabaseConfigured) {
    memoryConfigsCache = DEFAULT_FIELD_CONFIGS;
    lastCacheFetchTime = now;
    return includeDisabled
      ? DEFAULT_FIELD_CONFIGS
      : DEFAULT_FIELD_CONFIGS.filter((f) => f.is_enabled);
  }

  try {
    const query = supabase
      .from('joining_form_field_configs')
      .select('*')
      .order('section', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!includeDisabled) {
      query.eq('is_enabled', true);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      console.warn('Falling back to default joining field configurations:', error?.message);
      return includeDisabled
        ? DEFAULT_FIELD_CONFIGS
        : DEFAULT_FIELD_CONFIGS.filter((f) => f.is_enabled);
    }

    // Cache the full list if all configs were fetched
    if (includeDisabled) {
      memoryConfigsCache = data as JoiningFieldConfig[];
      lastCacheFetchTime = now;
    }

    return data as JoiningFieldConfig[];
  } catch (err) {
    console.error('Failed to fetch joining field configs:', err);
    return includeDisabled
      ? DEFAULT_FIELD_CONFIGS
      : DEFAULT_FIELD_CONFIGS.filter((f) => f.is_enabled);
  }
}

/**
 * Returns a fast lookup map of field_key -> JoiningFieldConfig.
 */
export async function getJoiningFieldConfigMap(
  includeDisabled: boolean = false
): Promise<Record<string, JoiningFieldConfig>> {
  const list = await getJoiningFieldConfigs(includeDisabled);
  const map: Record<string, JoiningFieldConfig> = {};
  for (const item of list) {
    map[item.field_key] = item;
  }
  return map;
}

/**
 * Invalidates the configuration cache.
 */
export function invalidateJoiningConfigCache(): void {
  memoryConfigsCache = null;
  lastCacheFetchTime = 0;
}

/**
 * Updates a field requirement state (REQUIRED vs OPTIONAL).
 * Restricted to SUPER_ADMIN.
 */
export async function updateFieldRequirement(
  id: string,
  isRequired: boolean,
  fieldLabel: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { error } = await supabase
      .from('joining_form_field_configs')
      .update({
        is_required: isRequired,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    invalidateJoiningConfigCache();

    await logActivity({
      entityType: 'SETTINGS',
      entityId: id,
      action: 'JOINING_FIELD_REQUIREMENT_CHANGED',
      description: `Field "${fieldLabel}" requirement changed to ${isRequired ? 'REQUIRED' : 'OPTIONAL'}.`,
      metadata: { field_id: id, is_required: isRequired }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error updating field requirement:', err);
    return { success: false, error: err.message || 'Failed to update field requirement.' };
  }
}

/**
 * Toggles a field active/enabled state.
 * Restricted to SUPER_ADMIN.
 */
export async function toggleFieldEnabled(
  id: string,
  isEnabled: boolean,
  fieldLabel: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { error } = await supabase
      .from('joining_form_field_configs')
      .update({
        is_enabled: isEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    invalidateJoiningConfigCache();

    await logActivity({
      entityType: 'SETTINGS',
      entityId: id,
      action: 'JOINING_FIELD_STATUS_TOGGLED',
      description: `Field "${fieldLabel}" ${isEnabled ? 'ENABLED' : 'DISABLED'}.`,
      metadata: { field_id: id, is_enabled: isEnabled }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error toggling field enabled state:', err);
    return { success: false, error: err.message || 'Failed to toggle field state.' };
  }
}

/**
 * Updates full field configuration properties (label, placeholder, order, etc.).
 * Restricted to SUPER_ADMIN.
 */
export async function updateFieldConfig(
  id: string,
  updates: Partial<JoiningFieldConfig>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    const { id: _id, conditional_rule, ...rest } = updates;
    const safeUpdates: any = {
      ...rest,
      ...(conditional_rule !== undefined ? { conditional_rules: conditional_rule, conditional_rule } : {}),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('joining_form_field_configs')
      .update(safeUpdates)
      .eq('id', id);

    if (error) throw error;

    invalidateJoiningConfigCache();

    await logActivity({
      entityType: 'SETTINGS',
      entityId: id,
      action: 'JOINING_FIELD_CONFIG_UPDATED',
      description: `Updated configuration for field "${updates.label || id}".`,
      metadata: { field_id: id, updates: safeUpdates }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error updating field config:', err);
    return { success: false, error: err.message || 'Failed to update field configuration.' };
  }
}

/**
 * Creates a new custom Joining Form field.
 * Restricted to SUPER_ADMIN.
 */
export async function createCustomField(
  input: CreateCustomFieldInput
): Promise<{ success: boolean; error?: string; data?: JoiningFieldConfig }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    // Sanitize internal field key
    const sanitizedKey = input.field_key.startsWith('custom.')
      ? input.field_key
      : `custom.${input.field_key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;

    // Validate unique key
    const { data: existing } = await supabase
      .from('joining_form_field_configs')
      .select('id')
      .eq('field_key', sanitizedKey)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Field key "${sanitizedKey}" already exists. Please choose a unique key.` };
    }

    const newField = {
      field_key: sanitizedKey,
      section: input.section,
      label: input.label.trim(),
      field_type: input.field_type,
      is_required: Boolean(input.is_required),
      is_enabled: input.is_enabled ?? true,
      is_system: false,
      display_order: input.display_order ?? 99,
      placeholder: input.placeholder?.trim() || null,
      help_text: input.help_text?.trim() || null,
      options: input.options || null
    };

    const { data, error } = await supabase
      .from('joining_form_field_configs')
      .insert(newField)
      .select()
      .single();

    if (error) throw error;

    invalidateJoiningConfigCache();

    await logActivity({
      entityType: 'SETTINGS',
      entityId: data.id,
      action: 'JOINING_CUSTOM_FIELD_CREATED',
      description: `Added custom Joining Form field "${data.label}" (${data.field_key}) in section "${data.section}".`,
      metadata: { field: data }
    });

    return { success: true, data: data as JoiningFieldConfig };
  } catch (err: any) {
    console.error('Error creating custom field:', err);
    return { success: false, error: err.message || 'Failed to create custom field.' };
  }
}

/**
 * Deletes or archives a custom field.
 * System fields are protected against deletion.
 * Restricted to SUPER_ADMIN.
 */
export async function deleteCustomField(
  id: string,
  fieldLabel: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Database is not configured.' };
  }

  try {
    // Verify it is not a system field
    const { data: field, error: fetchErr } = await supabase
      .from('joining_form_field_configs')
      .select('is_system, field_key')
      .eq('id', id)
      .single();

    if (fetchErr || !field) {
      return { success: false, error: 'Field not found.' };
    }

    if (field.is_system) {
      return { success: false, error: 'System standard fields cannot be deleted. You can disable them instead.' };
    }

    const { error } = await supabase
      .from('joining_form_field_configs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    invalidateJoiningConfigCache();

    await logActivity({
      entityType: 'SETTINGS',
      entityId: id,
      action: 'JOINING_CUSTOM_FIELD_DELETED',
      description: `Deleted custom field "${fieldLabel}" (${field.field_key}).`,
      metadata: { field_id: id, field_key: field.field_key }
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting custom field:', err);
    return { success: false, error: err.message || 'Failed to delete custom field.' };
  }
}
