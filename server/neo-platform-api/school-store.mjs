import { randomUUID } from 'node:crypto';

export class SchoolStoreError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);
const slug = value => clean(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function normalizeCourse(input = {}, existing = null) {
  const title = clean(input.title || existing?.title, 120);
  if (!title) throw new SchoolStoreError('course_title_required');
  return {
    title,
    code: clean(input.code ?? existing?.code, 30).toUpperCase(),
    description: clean(input.description ?? existing?.description, 800),
    teacher: clean(input.teacher ?? existing?.teacher, 100),
    color: ['gold','green','plum','blue'].includes(input.color) ? input.color : (existing?.color || 'gold'),
    status: ['draft','published','archived'].includes(input.status) ? input.status : (existing?.status || 'draft'),
    slug: slug(input.slug || title)
  };
}

export function normalizeAssignment(input = {}, existing = null) {
  const title = clean(input.title || existing?.title, 120);
  const courseId = clean(input.courseId || existing?.courseId, 120);
  if (!title) throw new SchoolStoreError('assignment_title_required');
  if (!courseId) throw new SchoolStoreError('assignment_course_required');
  return { title, courseId, instructions: clean(input.instructions ?? existing?.instructions, 1200), dueDate: clean(input.dueDate ?? existing?.dueDate, 40), points: Math.max(0, Math.min(10000, Number(input.points ?? existing?.points ?? 100) || 0)), status: ['draft','published','closed'].includes(input.status) ? input.status : (existing?.status || 'draft') };
}

export const SCHOOL_SEED = [
  { id:'course:giss-foundations', title:'GISS Foundations', code:'GISS-101', description:'Orientation to Temple learning, sacred citizenship, and the Nous learning path.', teacher:'World Education', color:'gold', status:'published' },
  { id:'course:holy-tablets', title:'Holy Tablets', code:'GISS-120', description:'Guided study of the Holy Tablets with readings, reflections, and discussion.', teacher:'World Education', color:'green', status:'published' },
  { id:'course:temple-governance', title:'Temple Governance', code:'GISS-210', description:'Institutions, public service, councils, and the responsibilities of Temple citizenship.', teacher:'Holy See Global District', color:'blue', status:'published' }
];

export function createInMemorySchoolStore({ now=()=>new Date().toISOString(), id=()=>randomUUID() }={}) {
  const courses=new Map(), assignments=new Map();
  return {
    async ensureSeed(items=SCHOOL_SEED){ for(const item of items){ if(!courses.has(item.id)) courses.set(item.id,{...item,createdAt:now(),updatedAt:now()}); } },
    async dashboard(){ return { courses:[...courses.values()].filter(x=>x.status!=='archived'), assignments:[...assignments.values()].filter(x=>x.status!=='closed'), students:[], teachers:[] }; },
    async createCourse(input, actor){ const value={id:id(),...normalizeCourse(input),createdBy:actor,createdAt:now(),updatedAt:now()}; courses.set(value.id,value); return structuredClone(value); },
    async createAssignment(input, actor){ if(!courses.has(clean(input.courseId,120))) throw new SchoolStoreError('course_not_found',404); const value={id:id(),...normalizeAssignment(input),createdBy:actor,createdAt:now(),updatedAt:now()}; assignments.set(value.id,value); return structuredClone(value); }
  };
}
