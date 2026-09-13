import { SchoolStoreError } from './school-store.mjs';

function redirect(res,location){res.writeHead(303,{location});res.end();}
async function parseForm(req,limit=12000){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>limit)throw new SchoolStoreError('request_too_large',413);}return Object.fromEntries(new URLSearchParams(raw));}

export function createSchoolActionHandler({schoolStore,subjectResolver}={}){
  return async function handleSchoolAction(req,res,url){
    if(req.method!=='POST'||!['/portal/school/enroll','/portal/school/lesson-complete'].includes(url.pathname))return false;
    if(req.headers['sec-fetch-site']==='cross-site'){redirect(res,'/portal/school?error=Cross-site+request+blocked');return true;}
    const subject=subjectResolver(req);
    if(!subject){res.writeHead(302,{location:'/?session=expired'});res.end();return true;}
    try{
      const body=await parseForm(req), courseId=String(body.courseId||'');
      if(!courseId)throw new SchoolStoreError('course_required');
      if(url.pathname.endsWith('/enroll')){
        await schoolStore.enroll(courseId,subject);
        redirect(res,`/portal/school?saved=${encodeURIComponent('Enrollment active. Lesson 1 is unlocked.')}#course-${courseId.replace(/[^a-z0-9-]/gi,'-')}`);
      }else{
        await schoolStore.completeLesson(courseId,body.lessonOrder,subject);
        redirect(res,`/portal/school?saved=${encodeURIComponent(`Lesson ${Number(body.lessonOrder)||''} completed. Progress saved.`)}#course-${courseId.replace(/[^a-z0-9-]/gi,'-')}`);
      }
    }catch(error){
      const code=error?.code||'school_progress_save_failed';
      redirect(res,`/portal/school?error=${encodeURIComponent(code.replaceAll('_',' '))}`);
    }
    return true;
  };
}
