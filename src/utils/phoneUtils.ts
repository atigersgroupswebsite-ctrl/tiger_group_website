// ==============================================================================
// File: src/utils/phoneUtils.ts
// Description: Authoritative Indian Phone Number Normalization, Validation & Formatting
// Features:
//   1. Canonical storage representation: +91XXXXXXXXXX (where XXXXXXXXXX = 10 digits)
//   2. Preserves legitimate 10-digit numbers starting with 91 (e.g. 9123456789 -> +919123456789)
//   3. Normalizes 12-digit country-code inputs (e.g. 918349353946 -> +918349353946)
//   4. Normalizes trunk 0 (e.g. 08349353946 -> +918349353946)
//   5. Normalizes dial-out 0091 (e.g. 0091 8349353946 -> +918349353946)
//   6. Strips accidental double +9191 prefixes (e.g. +91918349353946 -> +918349353946)
//   7. Provides display formatting (+91 83493 53946 or +91 8349353946)
// ==============================================================================

export interface PhoneNormalizationResult {
  isValid: boolean;
  raw: string;
  normalized: string; // Canonical "+91XXXXXXXXXX"
  displayDigits: string; // 10-digit number without country prefix "XXXXXXXXXX"
  formatted: string; // Formatted display e.g. "+91 83493 53946"
  error?: string;
}

/**
 * Normalizes and validates Indian mobile phone numbers into the canonical format:
 * +91XXXXXXXXXX (where XXXXXXXXXX is exactly 10 digits).
 * 
 * Rules:
 * A. Exactly 10 digits:
 *    Treated as a local Indian number (even if starting with 91, e.g. 9123456789 -> +919123456789).
 * B. Exactly 12 digits starting with 91:
 *    Treated as country code 91 + remaining 10 digits (e.g. 918349353946 -> +918349353946).
 * C. +91 followed by 10 digits:
 *    Valid international form (e.g. +918349353946 -> +918349353946).
 * D. Accidental double prefix (+9191... with 12 digits after +):
 *    Normalized cleanly to +91XXXXXXXXXX without creating +9191XXXXXXXXXX.
 * E. Trunk 0 (11 digits starting with 0):
 *    Leading 0 stripped (e.g. 08349353946 -> +918349353946).
 * F. International dial-out (14 digits starting with 0091):
 *    Leading 0091 stripped (e.g. 00918349353946 -> +918349353946).
 */
export function normalizeIndianPhoneNumber(
  input: string | null | undefined
): PhoneNormalizationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      raw: '',
      normalized: '',
      displayDigits: '',
      formatted: '',
      error: 'Phone number is required.'
    };
  }

  const rawTrimmed = input.trim();
  if (!rawTrimmed) {
    return {
      isValid: false,
      raw: rawTrimmed,
      normalized: '',
      displayDigits: '',
      formatted: '',
      error: 'Phone number is required.'
    };
  }

  // Remove spaces, hyphens, parentheses, dots, and slashes
  const sanitized = rawTrimmed.replace(/[\s\-\(\)\.\/]+/g, '');

  // 1. Check for explicit international prefix starting with '+'
  if (sanitized.startsWith('+')) {
    if (!sanitized.startsWith('+91')) {
      return {
        isValid: false,
        raw: rawTrimmed,
        normalized: '',
        displayDigits: '',
        formatted: '',
        error: 'Only Indian (+91) phone numbers are accepted.'
      };
    }

    let rem = sanitized.slice(3).replace(/\D/g, '');

    // Handle trunk 0 after +91 (e.g. +91 08349353946)
    if (rem.length === 11 && rem.startsWith('0')) {
      rem = rem.slice(1);
    }

    // Handle accidental double country code (e.g. +91918349353946 -> 12 digits starting with 91)
    if (rem.length === 12 && rem.startsWith('91')) {
      const candidateLocal = rem.slice(2);
      if (/^[6-9]\d{9}$/.test(candidateLocal)) {
        rem = candidateLocal;
      }
    }

    if (rem.length === 10) {
      if (/^[6-9]\d{9}$/.test(rem)) {
        return {
          isValid: true,
          raw: rawTrimmed,
          normalized: `+91${rem}`,
          displayDigits: rem,
          formatted: `+91 ${rem.slice(0, 5)} ${rem.slice(5)}`
        };
      }
      return {
        isValid: false,
        raw: rawTrimmed,
        normalized: '',
        displayDigits: '',
        formatted: '',
        error: 'Indian mobile numbers must start with 6, 7, 8, or 9.'
      };
    }

    return {
      isValid: false,
      raw: rawTrimmed,
      normalized: '',
      displayDigits: '',
      formatted: '',
      error: 'Please enter a valid 10-digit Indian mobile number.'
    };
  }

  // 2. Check for international dial-out prefix starting with '0091'
  let allDigits = sanitized.replace(/\D/g, '');
  if (allDigits.startsWith('0091') && allDigits.length >= 14) {
    let rem = allDigits.slice(4);
    if (rem.length === 11 && rem.startsWith('0')) {
      rem = rem.slice(1);
    }
    if (rem.length === 10 && /^[6-9]\d{9}$/.test(rem)) {
      return {
        isValid: true,
        raw: rawTrimmed,
        normalized: `+91${rem}`,
        displayDigits: rem,
        formatted: `+91 ${rem.slice(0, 5)} ${rem.slice(5)}`
      };
    }
  }

  // 3. Pure digits handling
  // Case A: 11 digits starting with trunk 0 (e.g. 08349353946 or 09123456789)
  if (allDigits.length === 11 && allDigits.startsWith('0')) {
    allDigits = allDigits.slice(1);
  }

  // Case B: Exactly 12 digits starting with country code 91 (e.g. 918349353946 or 919123456789)
  if (allDigits.length === 12 && allDigits.startsWith('91')) {
    const localDigits = allDigits.slice(2);
    if (/^[6-9]\d{9}$/.test(localDigits)) {
      return {
        isValid: true,
        raw: rawTrimmed,
        normalized: `+91${localDigits}`,
        displayDigits: localDigits,
        formatted: `+91 ${localDigits.slice(0, 5)} ${localDigits.slice(5)}`
      };
    }
  }

  // Case C: Exactly 10 digits (e.g. 8349353946 OR edge case 9123456789)
  // CRITICAL: A 10-digit number starting with 91 MUST NOT have its 91 stripped!
  if (allDigits.length === 10) {
    if (/^[6-9]\d{9}$/.test(allDigits)) {
      return {
        isValid: true,
        raw: rawTrimmed,
        normalized: `+91${allDigits}`,
        displayDigits: allDigits,
        formatted: `+91 ${allDigits.slice(0, 5)} ${allDigits.slice(5)}`
      };
    }
    return {
      isValid: false,
      raw: rawTrimmed,
      normalized: '',
      displayDigits: '',
      formatted: '',
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9.'
    };
  }

  // Case D: Invalid length
  return {
    isValid: false,
    raw: rawTrimmed,
    normalized: '',
    displayDigits: '',
    formatted: '',
    error: 'Please enter a valid 10-digit Indian mobile number.'
  };
}

/**
 * Backward compatible alias for normalizeIndianPhoneNumber
 */
export const normalizeIndianMobile = normalizeIndianPhoneNumber;

/**
 * Fast boolean validation check
 */
export function isValidIndianPhoneNumber(input: string | null | undefined): boolean {
  return normalizeIndianPhoneNumber(input).isValid;
}

/**
 * Returns clean 10-digit display representation without country code (e.g. "8349353946")
 */
export function getIndianPhoneDisplayDigits(input: string | null | undefined): string {
  const res = normalizeIndianPhoneNumber(input);
  if (res.isValid) {
    return res.displayDigits;
  }
  // Fallback: strip non-digits and return up to 10
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(0, 10);
}

/**
 * Formats an Indian phone number for user interface display
 * e.g. "+91 83493 53946" or "+91 8349353946"
 */
export function formatIndianPhoneNumber(
  input: string | null | undefined,
  style: 'spaced' | 'compact' = 'spaced'
): string {
  if (!input) return '';
  const norm = normalizeIndianPhoneNumber(input);
  if (!norm.isValid) {
    return String(input).trim();
  }
  if (style === 'compact') {
    return `+91 ${norm.displayDigits}`;
  }
  return norm.formatted;
}
