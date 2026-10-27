/**
 * Generates simple, clean, collision-free usernames for POS staff:
 *   e.g. "Amit" -> "amit"
 *   2nd "Amit"  -> "amit1"
 *   3rd "Amit"  -> "amit2"
 *
 * All usernames are local, memorable, and fully editable by the user.
 */

/** Slugify any string → lowercase, no spaces/special chars */
export function slugify(text: string): string {
    return text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Extract only the first name from a full name and slugify it */
export function getFirstName(fullName: string): string {
    return (fullName.trim().split(/\s+/)[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Generate a random 4-digit numeric code (kept for backward compat) */
export function generateLoginCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Generates a clean, simple, collision-free username:
 * 1st Amit -> "amit"
 * 2nd Amit -> "amit1"
 * 3rd Amit -> "amit2"
 */
export function generateUniqueUsername(
    name: string,
    existingUsernames: string[] = []
): string {
    const base = getFirstName(name) || 'user';
    const taken = new Set(existingUsernames.filter(Boolean).map(u => u.trim().toLowerCase()));

    if (!taken.has(base)) {
        return base;
    }

    let counter = 1;
    while (taken.has(`${base}${counter}`)) {
        counter++;
    }
    return `${base}${counter}`;
}

/**
 * Check if a username is already taken by someone else
 */
export function isUsernameTaken(
    username: string,
    existingUsernames: string[] = []
): boolean {
    const clean = username.trim().toLowerCase();
    if (!clean) return false;
    return existingUsernames.some(u => u && u.trim().toLowerCase() === clean);
}

/**
 * Build the employee's login handle (super simple clean slug, without venue clutter)
 * @param _venueName  kept for backward API compatibility
 * @param employeeName  e.g. "Rahul Arora" -> "rahul"
 * @param _code  legacy param — kept for API compat
 * @param suffix  optional numeric suffix (e.g. 1 -> "rahul1")
 */
export function buildUsername(
    _venueName?: string,
    employeeName: string = '',
    _code?: string,
    suffix?: number
): string {
    const first = getFirstName(employeeName);
    if (!first) return '';
    return suffix && suffix >= 1 ? `${first}${suffix}` : first;
}

/** Keep legacy initials helper for any components that still use it */
export function getInitials(name: string, limit = 3): string {
    return (
        name.trim().split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('').slice(0, limit) || 'XX'
    );
}
