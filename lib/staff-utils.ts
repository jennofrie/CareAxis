export type CredentialStatus = 'valid' | 'expiring' | 'expired' | 'missing';
export type StaffRole = 'Support Worker' | 'Team Leader' | 'Coordinator' | 'Admin';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Casual' | 'Contractor';
export type StaffStatus = 'Active' | 'Inactive' | 'On Leave';

export interface Credential {
  number: string;
  expiryDate: string;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  employmentType: EmploymentType;
  status: StaffStatus;
  phone: string;
  email: string;
  ndisScreening: Credential;
  wwcCheck: Credential;
  firstAid: { provider: string; expiryDate: string };
  policeCheck: { date: string; expiryDate: string };
}

export function getDaysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return 0;
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getCredentialStatus(expiryDate: string | null): CredentialStatus {
  if (!expiryDate) return 'missing';
  const days = getDaysUntilExpiry(expiryDate);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
}

export function getOverallComplianceScore(staff: StaffMember): number {
  const dates = [
    staff.ndisScreening.expiryDate,
    staff.wwcCheck.expiryDate,
    staff.firstAid.expiryDate,
    staff.policeCheck.expiryDate,
  ];
  const validCount = dates.filter(d => getCredentialStatus(d || null) === 'valid').length;
  return Math.round((validCount / 4) * 100);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
