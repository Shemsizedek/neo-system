const appId=process.env.DISCORD_APPLICATION_ID
const token=process.env.DISCORD_BOT_TOKEN
const guildId=process.env.DISCORD_GUILD_ID
if(!appId||!token)throw new Error('DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN are required')

const commands=[
  {name:'neo',description:'Ask NEOsync from Discord',type:1,options:[{name:'prompt',description:'What do you want NEOsync to do or answer?',type:3,required:true,max_length:2000}]},
  {name:'bots',description:'NEO Bots approvals and CES evidence intake',type:1,options:[
    {name:'action',description:'NEO Bots action',type:3,required:true,choices:[{name:'Evidence',value:'evidence'},{name:'Pending',value:'pending'},{name:'Approve',value:'approve'},{name:'Reject',value:'reject'}]},
    {name:'announcement',description:'CES announcement text for read-only notation evidence intake',type:3,required:false,max_length:2000},
    {name:'approval_id',description:'Approval ID for approve/reject',type:3,required:false,max_length:200}
  ]},
  {name:'services',description:'Inspect NEO Services and protected operator reads',type:1,options:[
    {name:'service',description:'NEO Service',type:3,required:true,choices:[{name:'NEO Miner',value:'neo-miner'}]},
    {name:'action',description:'Read-only action',type:3,required:true,choices:[
      {name:'Details',value:'details'},
      {name:'Status',value:'status'},
      {name:'Protected operator read',value:'operator'}
    ]}
  ]}
]

const base='https://discord.com/api/v10'
const url=guildId?`${base}/applications/${appId}/guilds/${guildId}/commands`:`${base}/applications/${appId}/commands`
for(const command of commands){
  const r=await fetch(url,{method:'POST',headers:{authorization:`Bot ${token}`,'content-type':'application/json'},body:JSON.stringify(command)})
  const body=await r.text()
  if(!r.ok)throw new Error(`Discord command registration failed ${r.status}: ${body}`)
  const registered=JSON.parse(body)
  console.log(`Registered /${registered.name} (${registered.id}) ${guildId?'for configured guild':'globally'}.`)
}
