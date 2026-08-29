import {hashOperatorPassword,OPERATOR_ROLES} from './operatorAuth.mjs'

const role=String(process.env.NEO_BOOTSTRAP_OPERATOR_ROLE||'ADMIN').toUpperCase()
const id=String(process.env.NEO_BOOTSTRAP_OPERATOR_ID||'').trim()
const displayName=String(process.env.NEO_BOOTSTRAP_OPERATOR_NAME||id).trim()
const password=String(process.env.NEO_BOOTSTRAP_PASSWORD||'')

if(!id){console.error('NEO_BOOTSTRAP_OPERATOR_ID_REQUIRED');process.exit(1)}
if(!Object.values(OPERATOR_ROLES).includes(role)){console.error('NEO_BOOTSTRAP_OPERATOR_ROLE_INVALID');process.exit(1)}
if(password.length<16){console.error('NEO_BOOTSTRAP_PASSWORD_TOO_SHORT');process.exit(1)}

const account={id,displayName,role,passwordHash:hashOperatorPassword(password)}
process.stdout.write(`${JSON.stringify(account)}\n`)
