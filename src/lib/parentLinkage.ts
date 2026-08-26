import { arrayUnion, doc, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * EduSmart interaction style: family relationships are explicit, reviewable,
 * and changed atomically so a parent never sees a partially linked student.
 */
export async function linkParentToStudent(input: {
  parentId: string;
  studentId?: string;
  studentIdentifier?: string;
  actorId?: string;
}) {
  const actorId = input.actorId || auth.currentUser?.uid;
  if (!actorId) throw new Error('AUTH_REQUIRED');
  if (!input.parentId || (!input.studentId && !input.studentIdentifier)) throw new Error('LINK_FIELDS_REQUIRED');

  const now = new Date().toISOString();
  let linkedStudentId = '';

  await runTransaction(db, async (transaction) => {
    const parentRef = doc(db, 'users', input.parentId);
    const parentSnapshot = await transaction.get(parentRef);
    if (!parentSnapshot.exists()) throw new Error('PARENT_NOT_FOUND');
    const parent = parentSnapshot.data();
    if (parent.role !== 'parent') throw new Error('TARGET_IS_NOT_PARENT');

    const studentRef = input.studentId
      ? doc(db, 'users', input.studentId)
      : doc(db, 'studentIds', String(input.studentIdentifier).trim().toUpperCase());
    const studentLookup = await transaction.get(studentRef);
    if (!studentLookup.exists()) throw new Error(input.studentId ? 'STUDENT_NOT_FOUND' : 'INVALID_STUDENT_IDENTIFIER');

    let studentRefForUpdate = studentRef;
    let studentSnapshot = studentLookup;
    if (!input.studentId) {
      const studentIdData = studentLookup.data();
      if (!studentIdData.linkedUserId) throw new Error('STUDENT_NOT_LINKED');
      studentRefForUpdate = doc(db, 'users', String(studentIdData.linkedUserId));
      studentSnapshot = await transaction.get(studentRefForUpdate);
      if (!studentSnapshot.exists()) throw new Error('STUDENT_NOT_FOUND');
    }

    const student = studentSnapshot.data();
    if (student.role !== 'student') throw new Error('TARGET_IS_NOT_STUDENT');
    if (parent.schoolId && student.schoolId && parent.schoolId !== student.schoolId) throw new Error('SCHOOL_MISMATCH');
    if (student.parentId && student.parentId !== input.parentId) throw new Error('STUDENT_ALREADY_LINKED');

    linkedStudentId = studentSnapshot.id;
    transaction.update(studentRefForUpdate, {
      parentId: input.parentId,
      parentName: parent.name || parent.email || '',
      parentLinkedAt: now,
      updatedAt: now,
    });
    transaction.update(parentRef, {
      childIds: arrayUnion(linkedStudentId),
      updatedAt: now,
    });
    transaction.set(doc(db, 'auditLogs', `${now.replace(/[^0-9]/g, '')}_${actorId.slice(0, 12)}`), {
      action: 'link_parent_student',
      entityType: 'userRelationship',
      entityId: `${input.parentId}_${linkedStudentId}`,
      actorId,
      before: { parentId: input.parentId, studentId: linkedStudentId, parentIdOnStudent: student.parentId || null },
      after: { parentId: input.parentId, studentId: linkedStudentId, linkedAt: now },
      createdAt: now,
    });
  });

  return { parentId: input.parentId, studentId: linkedStudentId, linkedAt: now };
}

export async function unlinkParentFromStudent(input: { parentId: string; studentId: string; actorId?: string }) {
  const actorId = input.actorId || auth.currentUser?.uid;
  if (!actorId) throw new Error('AUTH_REQUIRED');
  const now = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const parentRef = doc(db, 'users', input.parentId);
    const studentRef = doc(db, 'users', input.studentId);
    const [parentSnapshot, studentSnapshot] = await Promise.all([
      transaction.get(parentRef),
      transaction.get(studentRef),
    ]);
    if (!parentSnapshot.exists() || !studentSnapshot.exists()) throw new Error('LINK_RECORD_NOT_FOUND');
    const student = studentSnapshot.data();
    if (student.parentId !== input.parentId) throw new Error('LINK_NOT_FOUND');

    transaction.update(studentRef, { parentId: null, parentName: null, parentLinkedAt: null, updatedAt: now });
    transaction.set(doc(db, 'auditLogs', `${now.replace(/[^0-9]/g, '')}_${actorId.slice(0, 12)}`), {
      action: 'unlink_parent_student',
      entityType: 'userRelationship',
      entityId: `${input.parentId}_${input.studentId}`,
      actorId,
      before: { parentId: input.parentId, studentId: input.studentId },
      after: { parentId: null, studentId: input.studentId, unlinkedAt: now },
      createdAt: now,
    });
  });
}
