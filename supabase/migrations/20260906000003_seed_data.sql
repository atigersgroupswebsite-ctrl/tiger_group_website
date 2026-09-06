-- ==============================================================================
-- Migration: 20260906000003_seed_data.sql
-- Description: Development Seed Data for A TIGER GROUPS & Known Employer Partners
-- IMPORTANT:
--   - Marked as DEVELOPMENT SEED DATA ONLY.
--   - Contains only the authorized A Tiger Group business entities and the three
--     explicitly approved client employers: Haldiram's, Signet Group, Geeta Glass.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. A Tiger Groups Businesses (GROUP_BUSINESS)
-- ------------------------------------------------------------------------------
INSERT INTO public.companies (id, name, company_type, address, contact_email, contact_phone, active)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'A TIGER GLOBAL Career Solution & Consultancy',
    'GROUP_BUSINESS',
    'Plot No 14, Sector 18, Industrial Area, Gurugram, Haryana 122015',
    'careers@atigergroups.com',
    '+91 98765 43210',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'A TIGER GLOBAL Safety & Security Services',
    'GROUP_BUSINESS',
    'Corporate Security Division, Sector 18, Gurugram, Haryana 122015',
    'security@atigergroups.com',
    '+91 98765 43211',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'A TIGER GLOBAL Logistics & Supply Chain',
    'GROUP_BUSINESS',
    'Logistics Hub, Bilaspur Industrial Corridor, Manesar, Haryana',
    'logistics@atigergroups.com',
    '+91 98765 43212',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'A TIGER GLOBAL Properties & Infrastructure',
    'GROUP_BUSINESS',
    'Infrastructure Wing, Golf Course Extension, Gurugram, Haryana',
    'properties@atigergroups.com',
    '+91 98765 43213',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'A TIGER GLOBAL Footwear & Manufacturing',
    'GROUP_BUSINESS',
    'Manufacturing Unit 4, Footwear Park, Bahadurgarh, Haryana',
    'footwear@atigergroups.com',
    '+91 98765 43214',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  company_type = EXCLUDED.company_type,
  address = EXCLUDED.address,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  active = EXCLUDED.active;

-- ------------------------------------------------------------------------------
-- 2. Approved Known Employer Partners (EMPLOYER_PARTNER)
-- ------------------------------------------------------------------------------
INSERT INTO public.companies (id, name, company_type, address, contact_email, contact_phone, active)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    'Haldiram''s',
    'EMPLOYER_PARTNER',
    'Haldiram Snacks Pvt. Ltd., Plot No 68, Sector 68, IMT Manesar, Gurugram, Haryana',
    'hr.manesar@haldirams.com',
    '+91 124 4567890',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    'Signet Group',
    'EMPLOYER_PARTNER',
    'Signet Industries Limited, Pithampur Industrial Area, Sector 3, Dhar, MP',
    'corporate.hr@signet.com',
    '+91 7292 400100',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'Geeta Glass India Private Limited',
    'EMPLOYER_PARTNER',
    'Geeta Glass Plant, RIICO Industrial Area, Chopanki, Bhiwadi, Rajasthan',
    'plant.recruitment@geetaglass.com',
    '+91 1493 250011',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  company_type = EXCLUDED.company_type,
  address = EXCLUDED.address,
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  active = EXCLUDED.active;

-- ------------------------------------------------------------------------------
-- 3. Sample Baseline Openings at Approved Employers (Development Seed Only)
-- ------------------------------------------------------------------------------
INSERT INTO public.jobs (id, company_id, title, location, employment_type, description, responsibilities, requirements, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000010', -- Haldiram's
    'Production Line Associate / Machine Operator',
    'IMT Manesar, Gurugram',
    'Full Time (Rotational Shift)',
    'Oversee FMCG snack packaging line, ensure hygiene standards and machine throughput.',
    'Monitor packaging conveyors, inspect seals, execute clean-in-place protocols.',
    '10th / 12th Pass or ITI, minimum 18 years of age, physical fitness.',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000011', -- Signet Group
    'Industrial Maintenance Technician',
    'Pithampur, Dhar',
    'Full Time (Permanent)',
    'Mechanical and electrical maintenance of industrial machinery.',
    'Preventive maintenance, hydraulic diagnostics, tooling adjustments.',
    'Diploma or ITI in Mechanical / Electrical, 1+ year industrial plant experience.',
    'ACTIVE'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000012', -- Geeta Glass
    'Glass Fabrication & Quality Inspector',
    'Chopanki, Bhiwadi',
    'Full Time (Day Shift)',
    'Inspect architectural glass panels for edge defects, optical clarity, and dimensional tolerances.',
    'Micrometer measurements, surface defect logging, dispatch packaging verification.',
    '12th Pass or ITI, keen visual inspection skills.',
    'ACTIVE'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  location = EXCLUDED.location,
  employment_type = EXCLUDED.employment_type,
  description = EXCLUDED.description,
  responsibilities = EXCLUDED.responsibilities,
  requirements = EXCLUDED.requirements,
  status = EXCLUDED.status;
