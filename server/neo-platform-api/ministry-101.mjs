export const MINISTRY_SOURCE = 'https://holytemples.org/holy-orders/';
const units=[['Christism','Sutekh'],['Mosesism','Nebthet'],['Muhammadism','Aset'],['Sufism','Asaru'],['Kabalism','Nut'],['Magism','Geb'],['Summerianism','Tefnut'],['Shamanism','Shu'],['Gnosticism','Atum-Re']];
export const MINISTRY_101={
 id:'course:ministry-101',title:'Ministry 101',code:'MINISTRY-101',primary:true,catalogRevision:1,
 description:'The main GISS course: nine Major Lessons of Ministry study. Lessons 1–4 each contain 36 assignments; Lessons 5–9 continue the Assignment 36 pathway.',
 teacher:'Negus Shemsizedek',instructor:'Negus Shemsizedek',category:'Hall of Ministry & Holy Orders',color:'gold',status:'published',free:true,accessCodeRequired:false,style:'Faculty-guided study',timezone:'Learner local time',sourceUrl:MINISTRY_SOURCE,
 completionRule:'Study the nine Major Lessons in order. Assignment entries identify the curriculum sequence; missing faculty instructions remain pending. Classroom completion does not confer ordainment, office, or a degree.',
 lessons:units.map(([tradition,deity],index)=>({
  order:index+1,title:`${tradition} · ${deity}`,
  description:`Ministry 101 — Major Lesson ${index+1}. Study the corresponding Ministry 101 excerpt on Holy Orders and its Temple interpretation. Record the section used, explain its teaching, and prepare your questions for your educator. ${index<4?'Work through this lesson’s 36 assignment entries in sequence.':'Continue the Assignment 36 pathway from Major Lesson 4; retain the same evidence file and follow faculty guidance for this lesson.'} Keep doctrinal interpretation, historical evidence, and your own reasoning distinct.`,
  sourceUrl:MINISTRY_SOURCE,
  ...(index<4?{assignments:Array.from({length:36},(_,i)=>({id:`ministry-l${index+1}-a${i+1}`,number:i+1,degreeNumber:index*36+i+1,title:`Assignment ${i+1}`,status:index===0&&i===0?'source-published':'faculty-instructions-pending',description:index===0&&i===0?'Temple Apprentice: prepare a cited 500–700 word essay on the cross within Christism. Consult the published degree record for its complete requirements.':'Consult the corresponding degree record in Holy Orders. Follow its published assignment instructions. Where the assignment field is blank, request the brief from your educator before submitting assessed work.'}))}:{continuationOf:{lessonOrder:4,assignmentNumber:36},continuationDescription:'Continue the evidence and study established at Assignment 36. This Major Lesson extends that pathway; it does not create another block of 36 assignments.'})
 }))
};
