/**
 * Generates a memorable username for a POS employee:
 *   firstname@venueslug
 *
 * Examples:
 *   Employee "Rahul Arora" at "Grand Hotel" → "rahul@grandhotel"
 *   Employee "Ali Khan"    at "The Cafe"    → "ali@thecafe"
 *
 * Collision handling: if two employees share the same first name,
 * append a number on the second one (ali2@thecafe).
 */

/** Slugify any string → lowercase, no spaces/special chars */
export function slugify(text: string): string {
    return text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Extract only the first name from a full name */
export function getFirstName(fullName: string): string {
    return (fullName.trim().split(/\s+/)[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Generate a random 4-digit numeric code (kept for backward compat) */
export function generateLoginCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Build the employee's login handle: firstname@venueslug
 * @param venueName  e.g. "Grand Hotel"
 * @param employeeName  e.g. "Rahul Arora"
 * @param _code  legacy param — no longer used in the handle, kept for API compat
 * @param suffix  optional numeric suffix for collision handling (e.g. 2 → "ali2@venue")
 */
export function buildUsername(
    venueName: string,
    employeeName: string,
    _code?: string,
    suffix?: number
): string {
    const venue = slugify(venueName) || 'venue';
    const first = getFirstName(employeeName);
    const name = suffix && suffix > 1 ? `${first}${suffix}` : first;
    return `${name}@${venue}`;   // e.g. "rahul@grandhotel"
}

/** Keep legacy initials helper for any components that still use it */
export function getInitials(name: string, limit = 3): string {
    return (
        name.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('').slice(0, limit) || 'XX'
    );
}
