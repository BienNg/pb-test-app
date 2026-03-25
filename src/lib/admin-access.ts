const ALLOWED_ADMIN_EMAIL = 'bien-nguyen@outlook.com';

export function isAllowedAdminEmail(
  email: string | undefined | null
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ALLOWED_ADMIN_EMAIL.toLowerCase();
}
