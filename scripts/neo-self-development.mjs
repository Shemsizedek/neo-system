import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

const ROOT=process.cwd()
export const POLICY_PATH='architecture/neo-self-development-policy.json'
export const PROGRAM_PATH='architecture/neo-implementation-program.json'

const readJson=(root,p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
const marker=id=>`<!-- neo-selfdev:${id} -->`

export function loadPolicy(root=ROOT){return readJson(root,POLICY_PATH)}
export function loadProgram(root=ROOT){return readJson(root,PROGRAM_PATH)}

export function deriveWorkPackages(program,policy){
  const allowedPriorities=new Set(policy.autonomy.auto_issue_priorities||[])
  const allowedStatuses=new Set(policy.autonomy.auto_issue_statuses||[])
  return (program.requirements||[])
    .filter(r=>allowedPriorities.has(r.priority)&&allowedStatuses.has(r.status))
    .map(r=>({
      work_package_id:`SELFDEV-${r.requirement_id}`,
      requirement_id:r.requirement_id,
      source_gate:program.source_gate,
      section:r.section,
      title:r.title,
      priority:r.priority,
      implementation_status:r.status,
      evidence:r.evidence||[],
      acceptance_criteria:[
        `Implement or complete ${r.requirement_id}: ${r.title}.`,
        'Add or update automated tests that prove the intended behavior and negative/safety path.',
        'Link code, test, deployment, and runtime evidence back to the Gate 101 implementation registry.',
        'Do not mark VALIDATED until acceptance evidence exists.'
      ],
      test_plan:[
        'Run the narrow component test suite.',
        'Run Gate 101 implementation-truth tests.',
        'Run relevant Gate 102/103/104 regression tests when the change touches inventory, runtime, or recovery.'
      ],
      protected_actions:['merge','production_deploy'],
      issue_marker:marker(r.requirement_id)
    }))
    .sort((a,b)=>a.priority.localeCompare(b.priority)||a.requirement_id.localeCompare(b.requirement_id))
}

export function renderIssue(pkg){
  const evidence=(pkg.evidence||[]).length?pkg.evidence.map(x=>`- \`${x}\``).join('\n'):'- No implementation evidence currently registered.'
  const acceptance=pkg.acceptance_criteria.map(x=>`- [ ] ${x}`).join('\n')
  const tests=pkg.test_plan.map(x=>`- [ ] ${x}`).join('\n')
  return {
    title:`[${pkg.priority}] ${pkg.requirement_id} — ${pkg.title}`,
    body:`${pkg.issue_marker}
## NEO self-development work package

**Requirement:** \`${pkg.requirement_id}\`  
**Architecture section:** \`${pkg.section||'unknown'}\`  
**Current implementation state:** \`${pkg.implementation_status}\`

### Current evidence
${evidence}

### Acceptance criteria
${acceptance}

### Validation plan
${tests}

### Autonomy boundary
NEO generated this engineering issue from evidence in the Gate 101 implementation registry. Issue creation is autonomous; code merge and production deployment remain separately governed.
`,
    labels:['neo-self-development','implementation-gap',pkg.priority.toLowerCase()]
  }
}

export function buildSelfDevelopmentReport(program,policy){
  const packages=deriveWorkPackages(program,policy)
  return {
    gate:105,
    generated_at:new Date().toISOString(),
    summary:{work_packages:packages.length,auto_issue_candidates:packages.length},
    work_packages:packages
  }
}

async function githubRequest(url,{method='GET',body,token=process.env.GITHUB_TOKEN}={}){
  if(!token) throw new Error('github_token_required')
  const response=await fetch(url,{
    method,
    headers:{
      accept:'application/vnd.github+json',
      authorization:`Bearer ${token}`,
      'x-github-api-version':'2022-11-28',
      'user-agent':'NEO-G105-Self-Development/1.0',
      ...(body?{'content-type':'application/json'}:{})
    },
    body:body?JSON.stringify(body):undefined
  })
  const text=await response.text()
  let json=null
  try{json=JSON.parse(text)}catch{}
  if(!response.ok) throw new Error(`github_${response.status}:${json?.message||text}`)
  return json
}

export async function publishIssues(report,{repo=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN}={}){
  if(!repo) throw new Error('github_repository_required')
  const [owner,name]=repo.split('/')
  if(!owner||!name) throw new Error('invalid_github_repository')
  const existing=await githubRequest(`https://api.github.com/repos/${owner}/${name}/issues?state=open&per_page=100`,{token})
  const results=[]
  for(const pkg of report.work_packages){
    const rendered=renderIssue(pkg)
    const found=(existing||[]).find(i=>!i.pull_request&&String(i.body||'').includes(pkg.issue_marker))
    if(found){
      if(found.title!==rendered.title||found.body!==rendered.body){
        const updated=await githubRequest(`https://api.github.com/repos/${owner}/${name}/issues/${found.number}`,{method:'PATCH',token,body:{title:rendered.title,body:rendered.body}})
        results.push({requirement_id:pkg.requirement_id,action:'refreshed',issue_number:updated.number,html_url:updated.html_url})
      }else results.push({requirement_id:pkg.requirement_id,action:'unchanged',issue_number:found.number,html_url:found.html_url})
      continue
    }
    const created=await githubRequest(`https://api.github.com/repos/${owner}/${name}/issues`,{method:'POST',token,body:{title:rendered.title,body:rendered.body,labels:rendered.labels}})
    results.push({requirement_id:pkg.requirement_id,action:'created',issue_number:created.number,html_url:created.html_url})
  }
  return results
}

export function writeReport(report,output='artifacts/implementation/gate-105-self-development.json',root=ROOT){
  const target=path.join(root,output)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n')
  return target
}

async function main(){
  const args=new Set(process.argv.slice(2))
  const policy=loadPolicy()
  const program=loadProgram()
  const report=buildSelfDevelopmentReport(program,policy)
  if(args.has('--write')) writeReport(report)
  let publication=[]
  if(args.has('--publish-issues')) publication=await publishIssues(report)
  process.stdout.write(JSON.stringify({...report,publication},null,2)+'\n')
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) await main()
