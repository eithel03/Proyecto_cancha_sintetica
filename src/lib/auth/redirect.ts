/**
 * SECURITY: central validation of redirect destinations to prevent open-redirect
 * attacks. Any user-controlled value passed to `redirect()` must go through this
 * helper first. Only same-origin relative paths are allowed.
 */

// SECURITY: whitelist of allowed redirect destination prefixes.
// '/' is included so any same-origin relative path is accepted once it passes
// the format checks below.
const ALLOWED_REDIRECT_PREFIXES: readonly string[] = ['/cliente', '/dashboard', '/onboarding', '/']

/**
 * SECURITY: validates a redirect target and returns a safe internal path.
 *
 * Rejects (by returning the fallback instead):
 * - absolute URLs (anything not starting with `/`)
 * - protocol-relative URLs (`//evil.com`)
 * - backslash smuggling (`/\evil.com`)
 * - URLs containing userinfo `@` (e.g. `/@evil.com`)
 * - paths outside the whitelist
 */
export function safeRedirect(path: string | null | undefined, fallback = '/'): string {
  if (typeof path !== 'string' || path.length === 0) {
    return fallback
  }

  // SECURITY: reject anything that is not a same-origin relative path.
  // Covers absolute URLs (https://evil.com) and schemes (javascript:).
  if (!path.startsWith('/')) {
    return fallback
  }

  // SECURITY: reject protocol-relative URLs (//evil.com) and
  // backslash variants used to smuggle absolute URLs (/\evil.com).
  if (path.startsWith('//') || path.includes('\\')) {
    return fallback
  }

  // SECURITY: reject targets containing '@' (userinfo credentials form).
  if (path.includes('@')) {
    return fallback
  }

  // SECURITY: whitelist of allowed destination prefixes.
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix))
  return isAllowed ? path : fallback
}
