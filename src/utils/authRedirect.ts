// ==============================================================================
// File: src/utils/authRedirect.ts
// Description: Canonical Authentication Redirect & Magic Link URL Resolver
// Brand: A TIGER GROUPS — A TIGER GLOBAL Career Solution & Consultancy
// Security:
//   - Strictly derives production redirects from VITE_SITE_URL (or valid production HTTPS origin)
//   - Never silently permits localhost redirects in production builds
//   - Fails explicitly with informative diagnostic errors if production URL is missing
//   - Maintains seamless local development (http://localhost:5173) without code changes
// ==============================================================================

/**
 * Resolves the canonical base site URL for authentication redirects.
 *
 * Rules:
 * 1. Production Mode (`import.meta.env.PROD`):
 *    - Must resolve to a valid non-localhost web URL.
 *    - Checks `VITE_SITE_URL` first.
 *    - Falls back to `window.location.origin` if running in browser on a production domain.
 *    - If missing or resolving to `localhost`/`127.0.0.1`, throws an explicit configuration error.
 *
 * 2. Development Mode (`import.meta.env.DEV`):
 *    - Uses `VITE_SITE_URL` if defined, otherwise `window.location.origin` or `http://localhost:5173`.
 */
export function getSiteUrl(): string {
  const rawSiteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  const isProd = import.meta.env.PROD;

  if (isProd) {
    // 1. Explicit VITE_SITE_URL configured in build / deployment environment
    if (rawSiteUrl) {
      const sanitized = rawSiteUrl.replace(/\/+$/, '');
      if (sanitized.includes('localhost') || sanitized.includes('127.0.0.1')) {
        throw new Error(
          'Production configuration error: VITE_SITE_URL is set to localhost in a production build. Please configure your production domain (e.g., https://your-domain.com) in Vercel environment variables.'
        );
      }
      return sanitized;
    }

    // 2. Runtime browser fallback on deployed non-localhost origin
    if (
      typeof window !== 'undefined' &&
      window.location?.origin &&
      !window.location.origin.includes('localhost') &&
      !window.location.origin.includes('127.0.0.1')
    ) {
      return window.location.origin.replace(/\/+$/, '');
    }

    // 3. Fail clearly rather than silently generating localhost
    throw new Error(
      'Production configuration error: VITE_SITE_URL is missing in the production environment. Please configure VITE_SITE_URL with your production domain in Vercel project settings.'
    );
  }

  // Development mode: local development
  if (rawSiteUrl) {
    return rawSiteUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'http://localhost:5173';
}

/**
 * Constructs the canonical Supabase Magic Link callback redirect URL:
 * ${getSiteUrl()}/auth/callback?next=${safeNext}
 *
 * Preserves existing safe next parameter protection (defaults to /joining).
 */
export function getAuthRedirectUrl(nextPath: string = '/joining'): string {
  const siteUrl = getSiteUrl();
  const safeNext = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  return `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
