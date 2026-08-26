import type { User } from 'firebase/auth';
import type { DocumentData } from 'firebase/firestore';
import type { Role, UserProfile } from './store';
import { normalizePersonName, createStableKey } from './utils';

/**
 * EduSmart domain model: one canonical profile shape is shared by Auth,
 * Firestore, role guards, and school-linking workflows.
 */
export type ProfileStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface CanonicalUserProfile extends UserProfile {
  phoneNumber?: string;
  status?: ProfileStatus;
  parentId?: string;
  classId?: string;
  studentIdentifier?: string;
  linkedAt?: string;
  updatedAt?: string;
  emailVerified?: boolean;
}

export function canonicalizeUserProfile(
  uid: string,
  source: DocumentData | Partial<UserProfile> | null | undefined,
  fallback?: Partial<UserProfile>,
): CanonicalUserProfile {
  const data = { ...(fallback || {}), ...(source || {}) } as Record<string, unknown>;
  const email = String(data.email || '').trim().toLowerCase();
  const name = normalizePersonName(String(data.name || ''));
  const phoneNumber = String(data.phoneNumber || data.phone || '').trim();
  const role = isRole(data.role) ? data.role : undefined;

  return {
    uid,
    email,
    name,
    role: role || 'student',
    phoneNumber: phoneNumber || undefined,
    country: stringOrUndefined(data.country),
    city: stringOrUndefined(data.city),
    gender: stringOrUndefined(data.gender),
    province: stringOrUndefined(data.province),
    school: stringOrUndefined(data.school),
    schoolId: stringOrUndefined(data.schoolId),
    schoolSystem: stringOrUndefined(data.schoolSystem || data.system),
    schoolApprovalStatus: statusValue(data.schoolApprovalStatus),
    schoolStatus: schoolStatusValue(data.schoolStatus),
    nameKey: stringOrUndefined(data.nameKey) || (name ? createStableKey(name) : undefined),
    studentRegistrationKey: stringOrUndefined(data.studentRegistrationKey),
    studentIdentifier: stringOrUndefined(data.studentIdentifier),
    governorateId: stringOrUndefined(data.governorateId),
    governorate: stringOrUndefined(data.governorate || data.city),
    districtId: stringOrUndefined(data.districtId),
    district: stringOrUndefined(data.district),
    specialization: stringOrUndefined(data.specialization),
    grade: stringOrUndefined(data.grade),
    gradeKey: stringOrUndefined(data.gradeKey),
    academicYear: stringOrUndefined(data.academicYear),
    parentId: stringOrUndefined(data.parentId),
    classId: stringOrUndefined(data.classId),
    linkedAt: stringOrUndefined(data.linkedAt),
    status: profileStatusValue(data.status) || (data.schoolStatus === 'active' ? 'active' : 'pending'),
    emailVerified: Boolean(data.emailVerified),
    createdAt: String(data.createdAt || new Date().toISOString()),
    updatedAt: String(data.updatedAt || data.createdAt || new Date().toISOString()),
    needsOnboarding: Boolean(data.needsOnboarding),
  };
}

export function profileFromAuthUser(firebaseUser: User, fallback?: Partial<UserProfile>): CanonicalUserProfile {
  return canonicalizeUserProfile(firebaseUser.uid, {
    ...(fallback || {}),
    uid: firebaseUser.uid,
    email: firebaseUser.email || fallback?.email || '',
    name: firebaseUser.displayName || fallback?.name || '',
    emailVerified: firebaseUser.emailVerified,
  }, fallback);
}

export function profilePayload(profile: Partial<CanonicalUserProfile>, uid: string) {
  const now = new Date().toISOString();
  const normalized = canonicalizeUserProfile(uid, { ...profile, updatedAt: now }, profile);
  return {
    ...normalized,
    uid,
    email: normalized.email,
    name: normalized.name,
    role: normalized.role,
    createdAt: normalized.createdAt || now,
    updatedAt: now,
  };
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'principal' || value === 'teacher' || value === 'student' || value === 'parent';
}

function stringOrUndefined(value: unknown) {
  const result = typeof value === 'string' ? value.trim() : '';
  return result || undefined;
}

function statusValue(value: unknown): UserProfile['schoolApprovalStatus'] {
  return value === 'pending' || value === 'approved' || value === 'rejected' ? value : undefined;
}

function schoolStatusValue(value: unknown): UserProfile['schoolStatus'] {
  return value === 'pending' || value === 'active' || value === 'rejected' || value === 'none' ? value : undefined;
}

function profileStatusValue(value: unknown): ProfileStatus | undefined {
  return value === 'pending' || value === 'active' || value === 'suspended' || value === 'rejected' ? value : undefined;
}
