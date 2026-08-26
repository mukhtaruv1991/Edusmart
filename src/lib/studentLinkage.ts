import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { createStableKey, normalizePersonName } from './utils';

/**
 * EduSmart interaction style: linkage is explicit, reviewable, and reversible;
 * every state change is represented in Firestore instead of simulated locally.
 */
export type LinkRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StudentLinkRequest {
  id: string;
  uid: string;
  identifier: string;
  studentName: string;
  nameKey: string;
  gradeKey: string;
  schoolId: string;
  schoolName: string;
  status: LinkRequestStatus;
  requestedAt: string;
  requestedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export async function submitStudentLinkRequest(input: {
  identifier: string;
  studentName: string;
  gradeKey: string;
  uid?: string;
}): Promise<StudentLinkRequest> {
  const uid = input.uid || auth.currentUser?.uid;
  if (!uid) throw new Error('AUTH_REQUIRED');
  const identifier = input.identifier.trim().toUpperCase();
  const studentName = normalizePersonName(input.studentName);
  if (!identifier || !studentName || !input.gradeKey) throw new Error('LINK_FIELDS_REQUIRED');

  const idSnapshot = await getDoc(doc(db, 'studentIds', identifier));
  if (!idSnapshot.exists()) throw new Error('INVALID_STUDENT_IDENTIFIER');
  const idData = idSnapshot.data();
  if (idData.status !== 'available') throw new Error('USED_STUDENT_IDENTIFIER');
  if ((idData.nameKey || createStableKey(String(idData.studentName || ''))) !== createStableKey(studentName)) {
    throw new Error('STUDENT_IDENTIFIER_NAME_MISMATCH');
  }
  if (String(idData.gradeKey || '') !== input.gradeKey) throw new Error('STUDENT_IDENTIFIER_GRADE_MISMATCH');

  const existing = await getDocs(query(
    collection(db, 'studentLinkRequests'),
    where('uid', '==', uid),
    where('identifier', '==', identifier),
    where('status', '==', 'pending'),
  ));
  if (!existing.empty) return { id: existing.docs[0].id, ...existing.docs[0].data() } as StudentLinkRequest;

  const requestedAt = new Date().toISOString();
  const result = await addDoc(collection(db, 'studentLinkRequests'), {
    uid,
    identifier,
    studentName,
    nameKey: idData.nameKey || createStableKey(studentName),
    gradeKey: String(idData.gradeKey),
    schoolId: String(idData.schoolId || ''),
    schoolName: String(idData.schoolName || idData.school || ''),
    status: 'pending' as const,
    requestedAt,
    requestedBy: uid,
  });
  return {
    id: result.id,
    uid,
    identifier,
    studentName,
    nameKey: String(idData.nameKey || createStableKey(studentName)),
    gradeKey: String(idData.gradeKey),
    schoolId: String(idData.schoolId || ''),
    schoolName: String(idData.schoolName || idData.school || ''),
    status: 'pending',
    requestedAt,
    requestedBy: uid,
  };
}

export async function listStudentLinkRequests(options?: { schoolId?: string; status?: LinkRequestStatus }) {
  const constraints = [];
  if (options?.schoolId) constraints.push(where('schoolId', '==', options.schoolId));
  if (options?.status) constraints.push(where('status', '==', options.status));
  const snapshot = await getDocs(query(collection(db, 'studentLinkRequests'), ...constraints));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StudentLinkRequest));
}

export async function approveStudentLinkRequest(requestId: string, reviewerId?: string) {
  const reviewer = reviewerId || auth.currentUser?.uid;
  if (!reviewer) throw new Error('AUTH_REQUIRED');
  const now = new Date().toISOString();
  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, 'studentLinkRequests', requestId);
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) throw new Error('LINK_REQUEST_NOT_FOUND');
    const requestData = requestSnapshot.data();
    if (requestData.status !== 'pending') throw new Error('LINK_REQUEST_ALREADY_REVIEWED');

    const identifierRef = doc(db, 'studentIds', String(requestData.identifier));
    const userRef = doc(db, 'users', String(requestData.uid));
    const identifierSnapshot = await transaction.get(identifierRef);
    const userSnapshot = await transaction.get(userRef);
    if (!identifierSnapshot.exists() || !userSnapshot.exists()) throw new Error('LINK_RECORD_NOT_FOUND');
    const identifierData = identifierSnapshot.data();
    if (identifierData.status !== 'available') throw new Error('USED_STUDENT_IDENTIFIER');

    transaction.update(identifierRef, {
      status: 'assigned',
      linkedUserId: requestData.uid,
      linkedAt: now,
      parentId: userSnapshot.data().parentId || null,
      updatedAt: now,
    });
    transaction.update(userRef, {
      schoolId: requestData.schoolId,
      school: requestData.schoolName,
      gradeKey: requestData.gradeKey,
      grade: userSnapshot.data().grade || requestData.gradeKey,
      studentIdentifier: requestData.identifier,
      studentRegistrationKey: requestData.identifier,
      schoolApprovalStatus: 'approved',
      schoolStatus: 'active',
      status: 'active',
      needsOnboarding: false,
      linkedAt: now,
      updatedAt: now,
    });
    transaction.update(requestRef, { status: 'approved', reviewedAt: now, reviewedBy: reviewer });
    transaction.set(doc(collection(db, 'auditLogs')), {
      action: 'approve_student_link',
      entityType: 'studentLinkRequest',
      entityId: requestId,
      actorId: reviewer,
      before: { status: 'pending', uid: requestData.uid, identifier: requestData.identifier },
      after: { status: 'approved', schoolId: requestData.schoolId, identifier: requestData.identifier },
      createdAt: now,
    });
  });
}

export async function rejectStudentLinkRequest(requestId: string, reviewNote = '', reviewerId?: string) {
  const reviewer = reviewerId || auth.currentUser?.uid;
  if (!reviewer) throw new Error('AUTH_REQUIRED');
  await updateDoc(doc(db, 'studentLinkRequests', requestId), {
    status: 'rejected',
    reviewNote: reviewNote.trim().slice(0, 500),
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewer,
  });
}

export async function cancelStudentLinkRequest(requestId: string, uid?: string) {
  const owner = uid || auth.currentUser?.uid;
  if (!owner) throw new Error('AUTH_REQUIRED');
  const requestRef = doc(db, 'studentLinkRequests', requestId);
  const snapshot = await getDoc(requestRef);
  if (!snapshot.exists()) throw new Error('LINK_REQUEST_NOT_FOUND');
  if (snapshot.data().uid !== owner) throw new Error('FORBIDDEN');
  await updateDoc(requestRef, { status: 'cancelled', reviewedAt: new Date().toISOString(), reviewedBy: owner });
}
