// Private invited-member test UI. Must be bundled with official Neon Auth SDK before deploy.
// No sign-up, token logging, browser storage or forum write routes.
import {connectForumAuth} from "./auth-sdk.mjs";
import {createForumSession} from "./member-session.mjs";
const authBase=import.meta.env?.VITE_NEON_AUTH_URL;
const apiBase=import.meta.env?.VITE_FORUM_API_URL;
const form=document.getElementById("member-login");
const status=document.getElementById("status");
const signout=document.getElementById("sign-out");
function message(text,type="neutral"){status.textContent=text;status.dataset.type=type;}
if(!authBase||!apiBase){
 form.hidden=true;signout.hidden=true;message("Member sign-in is not configured for this test environment.");
}else{
 const auth=connectForumAuth({baseUrl:authBase});
 const member=createForumSession({auth,apiBase});
 async function sync(){
  try{
   const r=await member.getStatus();
   form.hidden=r.authenticated;signout.hidden=!r.authenticated;
   message(r.authenticated?"Identity verified. Forum posting remains closed.":"Sign in with an invited test account.");
  }catch{message("Unable to verify the member session. Try again later.","error")}
 }
 form.addEventListener("submit",async e=>{
  e.preventDefault();const button=form.querySelector("button[type=submit]");
  button.disabled=true;const email=form.elements.email.value,password=form.elements.password.value;
  form.elements.password.value="";
  try{
   const r=await member.signIn(email,password);
   if(!r.authenticated)throw Error("NOT_AUTHENTICATED");
   form.hidden=true;signout.hidden=false;message("Test sign-in verified. Posting remains closed.","success");
  }catch{message("Sign-in could not be verified. Check your invited account.","error")}
  finally{button.disabled=false}
 });
 signout.addEventListener("click",async()=>{
  try{await member.signOut()}finally{form.hidden=false;signout.hidden=true;message("Signed out of the private alpha.")}
 });
 sync();
}
