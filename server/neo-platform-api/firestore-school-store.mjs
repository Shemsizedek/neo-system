import { randomUUID } from 'node:crypto';
import { normalizeAssignment, normalizeCourse, SchoolStoreError, SCHOOL_SEED } from './school-store.mjs';

export function createFirestoreSchoolStore({ db, now=()=>new Date().toISOString(), id=()=>randomUUID() }={}) {
  if(!db?.collection) throw new Error('firestore_db_required');
  const courses=db.collection('neoSchoolCourses'), assignments=db.collection('neoSchoolAssignments'), students=db.collection('neoSchoolStudents'), teachers=db.collection('neoSchoolTeachers');
  return {
    async ensureSeed(items=SCHOOL_SEED){ for(const item of items){ const ref=courses.doc(item.id), doc=await ref.get(); if(!doc.exists) await ref.create({...item,createdAt:now(),updatedAt:now()}); } },
    async dashboard(){ const [c,a,s,t]=await Promise.all([courses.limit(100).get(),assignments.limit(100).get(),students.limit(500).get(),teachers.limit(100).get()]); const values=x=>x.docs.map(d=>({id:d.id,...d.data()})); return {courses:values(c).filter(x=>x.status!=='archived'),assignments:values(a).filter(x=>x.status!=='closed'),students:values(s),teachers:values(t)}; },
    async createCourse(input,actor){ const value={id:id(),...normalizeCourse(input),createdBy:actor,createdAt:now(),updatedAt:now()}; await courses.doc(value.id).create(value); return value; },
    async createAssignment(input,actor){ const courseId=String(input.courseId||''); if(!(await courses.doc(courseId).get()).exists) throw new SchoolStoreError('course_not_found',404); const value={id:id(),...normalizeAssignment(input),createdBy:actor,createdAt:now(),updatedAt:now()}; await assignments.doc(value.id).create(value); return value; }
  };
}
