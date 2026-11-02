// Branch-scoped managed Neon Auth adapter for a private, bundled Forum app.
// Loaded only when VITE_NEON_AUTH_URL is configured; no public signup capability.
import {createAuthClient} from "@neon/neon-js/auth";
export function connectForumAuth({baseUrl}){
 if(typeof baseUrl!=="string"||!/^https:\/\//.test(baseUrl))throw Error("AUTH_URL_NOT_CONFIGURED");
 const client=createAuthClient(baseUrl);
 return Object.freeze({
  async signIn(email,password){
   const {data,error}=await client.signIn.email({email,password});
   if(error)throw Error("LOGIN_FAILED");return data;
  },
  async getSession(){
   const {data,error}=await client.getSession();
   if(error)return null;return data?.session?data:null;
  },
  async getAccessToken(){
   const {data,error}=await client.token();
   if(error||!data?.token)throw Error("SIGN_IN_REQUIRED");
   return data.token;
  },
  async signOut(){await client.signOut();}
 });
}
// A real frontend must first configure the staging Auth trusted origin,
// then test sign-in, sign-out, session refresh, rejection and token verification.
// Production registration and public content writes stay disabled.
