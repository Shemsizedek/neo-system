import {readFile} from 'node:fs/promises';
import {createMetadataServer} from './server.mjs';
const store={get:async asset=>{try{return JSON.parse(await readFile(`/records/${asset}.json`,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}};
createMetadataServer({store}).listen(8796,'0.0.0.0');