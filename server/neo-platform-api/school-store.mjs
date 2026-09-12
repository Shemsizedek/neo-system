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

const CIVICS_101_DESCRIPTION = `Civics or civic education is the study of the theoretical, political and practical aspects of citizenship, as well as its rights and duties. It includes the study of civil law and civil code, and the study of government with attention to the role of world citizens as opposed to external factors in the operation of government.

Within a given political or ethical tradition, civics can refer to educating citizens. The course places the history of civic thought in a broad ancient and global context and develops the idea of global civics as a social contract among world citizens in an age of interdependence and interaction. It examines both objections to global-civics implementation and the role of universities in preparing future generations for life in an interdependent world.

Global citizenship is treated as the idea that people have rights and civic responsibilities arising from membership in humanity as a whole, while retaining local and national identities.`;

const CIVICS_101_LESSON_DESCRIPTION = `These degrees taught by the World Chaplin Negus H.I.M.N.E.O., learned in principle by all scholars, if you want you can go on to take degrees with a provision for the World Holy Temple with some of the world’s greatest instructors.`;

const CIVICS_101_MONTHS = [
  { month: 1, weeks: [1,2,3,4] },
  { month: 2, weeks: [1,2,3,4] },
  { month: 3, weeks: [1,2,3,4] }
];

export const SCHOOL_SEED = [
  {
    id:'course:civics-101',
    title:'Civics 101',
    code:'CIVIL',
    description:CIVICS_101_DESCRIPTION,
    teacher:'Negus Shemsizedek',
    instructor:'Negus Shemsizedek',
    category:'Ministry',
    credits:100,
    style:'Blended',
    semester:1,
    timezone:'Central Time (US & Canada)',
    startDate:'2019-09-23',
    endDate:'2020-06-25',
    completionRule:'Lessons and their sections must be completed in order.',
    accessCodeRequired:false,
    color:'gold',
    status:'published',
    lessons:[
      { order:1, title:'Civics 101 Lesson 1', description:CIVICS_101_LESSON_DESCRIPTION, personalized:true, schedule:CIVICS_101_MONTHS },
      { order:2, title:'Civics 101 Lesson 2', description:CIVICS_101_LESSON_DESCRIPTION, personalized:true, schedule:CIVICS_101_MONTHS },
      { order:3, title:'Civics 101 Lesson 3', description:CIVICS_101_LESSON_DESCRIPTION, personalized:false, schedule:CIVICS_101_MONTHS }
    ],
    meetingSchedule:[
      { day:'Friday', start:'11:00 pm', end:'3:35 pm', scope:'Global' },
      { day:'Sunday', start:'11:00 am', end:'3:35 pm', scope:'Global' }
    ],
    legacy:{
      platform:'EDU20 / NEO LMS',
      catalogClassId:'933232',
      sourceUrl:'https://nu-university.edu20.org/visitor_catalog_class/show/933232',
      archiveCatalogUrl:'https://web.archive.org/web/20200922005241/https://nu-university.edu20.org/visitor_catalog_class/show/920252',
      archiveIndex:'https://web.archive.org/web/*/https://nu-university.edu20.org/*',
      policyArchives:[
        'https://web.archive.org/web/20220626054619/https://nu-university.edu20.org/policy/index/500?popup=true',
        'https://web.archive.org/web/20220626043824/https://nu-university.edu20.org/policy/index/502?popup=true'
      ],
      captureRange:'2019-12-10 to 2024-07-31'
    }
  },
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