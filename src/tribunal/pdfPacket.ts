function esc(value:string){return value.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)').replaceAll(/[^\x20-\x7E]/g,'?')}

function wrap(text:string,width=92){
  const lines:string[]=[]
  for(const paragraph of text.split('\n')){
    if(!paragraph){lines.push('');continue}
    let current=''
    for(const word of paragraph.split(/\s+/)){
      if((current+' '+word).trim().length>width){lines.push(current);current=word}else current=(current+' '+word).trim()
    }
    if(current)lines.push(current)
  }
  return lines
}

export function makeTextPdf(title:string,body:string){
  const all=[title,'',...wrap(body)]
  const pages:string[][]=[]
  for(let i=0;i<all.length;i+=48)pages.push(all.slice(i,i+48))
  const objects:string[]=[]
  const pageIds:number[]=[]
  const fontId=3
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>'
  objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  let next=4
  const streams:{pageId:number;contentId:number;content:string}[]=[]
  for(const lines of pages){const pageId=next++;const contentId=next++;pageIds.push(pageId);const ops=['BT','/F1 10 Tf','50 760 Td','13 TL',...lines.map((line,i)=>`${i?'T* ':''}(${esc(line)}) Tj`),'ET'].join('\n');streams.push({pageId,contentId,content:ops})}
  objects[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  for(const stream of streams){objects[stream.pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${stream.contentId} 0 R >>`;objects[stream.contentId]=`<< /Length ${stream.content.length} >>\nstream\n${stream.content}\nendstream`}
  let pdf='%PDF-1.4\n';const offsets:number[]=[0]
  for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
  const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`
  pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf],{type:'application/pdf'})
}

export function downloadPdf(fileName:string,title:string,body:string){
  const blob=makeTextPdf(title,body);const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=fileName;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
