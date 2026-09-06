// ==============================================================================
// File: src/utils/phoneUtils.ts
// Description: Authoritative Indian Mobile Number Normalization & Validation
// Features: Canonical storage formatting (+91XXXXXXXXXX), handling 10-digit
//           numbers starting with 91, international prefixes (+91), spaces, hyphens.
// ==============================================================================

export interface PhoneNormalizationResult {
  isValid: boolean;
  raw: string;
  normalized: string; // Canonical "+91XXXXXXXXXX"
  displayDigits: string; // 10-digit number without country prefix "XXXXXXXXXX"
  error?: string;
}

/**
 * Normalizes and validates Indian mobile phone numbers.
 * 
 * Rules:
 * 1. An Indian mobile number consists of 10 digits starting with 6, 7, 8, or 9.
 * 2. If a 10-digit number begins with 91 (e.g. 9130552710), it is a VALID 10-digit
 *    mobile number, NOT an 8-digit number with a country code prefix!
 * 3. Supports formats:
 *    - 9130552710       -> +919130552710
 *    - +919130552710    -> +919130552710
 *    - +91 9130552710   -> +919130552710
 *    - +91-9130552710   -> +919130552710
 *    - 09130552710      -> +919130552710 (leading trunk 0)
 *    - 919130552710     -> +919130552710 (12 digits with explicit 91 prefix)
 * 4. Rejects:
 *    - Numbers shorter or longer than valid specifications
 *    - Numbers starting with invalid digits (0-5 after prefix resolution)
 *    - Non-Indian international country prefixes
 */
export function normalizeIndianMobile(input: string | null | undefined): PhoneNormalizationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      raw: '',
      normalized: '',
      displayDigits: '',
      error: 'Mobile number is required.'
    };
  }

  const rawTrimmed = input.trim();
  if (!rawTrimmed) {
    return {
      isValid: false,
      raw: rawTrimmed,
      normalized: '',
      displayDigits: '',
      error: 'Mobile number is required.'
    };
  }

  // Remove spaces, hyphens, parentheses, and dots
  const sanitized = rawTrimmed.replace(/[\s\-\(\)\.]+/g, '');

  // Check for explicit foreign international prefix (e.g., +1, +44)
  if (sanitized.startsWith('+')) {
    if (!sanitized.startsWith('+91')) {
      return {
        isValid: false,
        raw: rawTrimmed,
        normalized: '',
        displayDigits: '',
        error: 'Only Indian (+91) phone numbers are accepted.'
      };
    }

    const remainingDigits = sanitized.slice(3).replace(/\D/g, '');
    if (remainingDigits.length === 10 && /^[6-9]\d{9}$/.test(remainingDigits)) {
      return {
        isValid: true,
        raw: rawTrimmed,
        normalized: `+91${remainingDigits}`,
        displayDigits: remainingDigits
      };
    }

    return {
      isValid: false,
      raw: rawTrimmed,
      normalized: '',
      displayDigits: '',
      error: 'Please enter a valid 10-digit Indian mobile number.'
    };
  }

  // Pure digits
  let allDigits = sanitized.replace(/\D/g, '');

  // Case A: 11 digits starting with 0 (e.g. 09130552710 or 09823012345)
  if (allDigits.length === 11 && allDigits.startsWith('0')) {
    allDigits = allDigits.slice(1);
  }

  // Case B: 12 digits starting with 91 (e.g. 919130552710 or 919823012345)
  if (allDigits.length === 12 && allDigits.startsWith('91')) {
    const candidateDigits = allDigits.slice(2);
    if (/^[6-9]\d{9}$/.test(candidateDigits)) {
      return {
        isValid: true,
        raw: rawTrimmed,
        normalized: `+91${candidateDigits}`,
        displayDigits: candidateDigits
      };
    }
  }

  // Case C: Exactly 10 digits
  if (allDigits.length === 10) {
    if (/^[6-9]\d{9}$/.test(allDigits)) {
      return {
        isValid: true,
        raw: rawTrimmed,
        normalized: `+91${allDigits}`,
        displayDigits: allDigits
      };
    }

    return {
      isValid: false,
      raw: rawTrimmed,
      normalized: '',
      displayDigits: '',
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9.'
    };
  }

  // Invalid length or formatting
  return {
    isValid: false,
    raw: rawTrimmed,
    normalized: '',
    displayDigits: '',
    error: 'Please enter a valid 10-digit Indian mobile number.'
  };
}
