// Neon-only staging function; connection URL injected by the provider.
import pg from "pg";
import {attachDatabasePool} from "@neon/functions";
import {createForumDataHandler} from "./handler.mjs";
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2,idleTimeoutMillis:15000,connectionTimeoutMillis:5000,statement_timeout:5000,ssl:{rejectUnauthorized:true}});
attachDatabasePool(pool);
export default createForumDataHandler({pool,env:process.env});