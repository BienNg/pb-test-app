const ALLOWED_ADMIN_EMAILS = new Set(
  ['bien-nguyen@outlook.com', 'hang.chris.lam@gmail.com'].map((e) =>
    e.toLowerCase()
  )
);

export function isAllowedAdminEmail(
  email: string | undefined | null
): boolean {
  if (!email) return false;
  return ALLOWED_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
