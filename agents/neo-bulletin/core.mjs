export const EDITIONS = {
  "Sunday": [
    "Newcomers Bulletin",
    "Welcome to Civics and Community Learning",
    "How can neighbors participate respectfully across different beliefs?",
    "Identify two First Amendment freedoms.",
    [
      "https://www.archives.gov/founding-docs/bill-of-rights-transcript",
      "https://www.usa.gov/voting-and-elections"
    ]
  ],
  "Monday": [
    "Civics 101 and Finance",
    "Rights, Responsibilities, and Informed Financial Choices",
    "How do documented rights and public financial resources inform decisions?",
    "Read a passage in the Bill of Rights and compare two consumer-finance guides.",
    [
      "https://www.archives.gov/founding-docs/bill-of-rights-transcript",
      "https://www.consumerfinance.gov/consumer-tools/"
    ]
  ],
  "Tuesday": [
    "Civics 101 and Legal Updates",
    "Courts, Jurisdiction, and Evidence",
    "What distinguishes religious belief, court jurisdiction, and a written judgment?",
    "Find an original legal document and identify its authority.",
    [
      "https://www.uscourts.gov/about-federal-courts",
      "https://www.archives.gov/founding-docs/bill-of-rights-transcript"
    ]
  ],
  "Wednesday": [
    "Civics 101 and Economics",
    "Understanding Consumer Prices and Public Data",
    "What does CPI measure, and what does it not?",
    "Review the BLS definition of CPI and distinguish an index from a household bill.",
    [
      "https://www.bls.gov/cpi/",
      "https://www.consumerfinance.gov/consumer-tools/"
    ]
  ],
  "Thursday": [
    "Civics 101 and Comparative Law",
    "Civil Law and Religious Interpretation",
    "How can readers compare civic law with El's Holy Torah without confusing sources of authority?",
    "Label a legal rule and a religious interpretation separately.",
    [
      "https://www.archives.gov/founding-docs/bill-of-rights-transcript",
      "https://www.uscourts.gov/about-federal-courts"
    ]
  ],
  "Friday": [
    "Temple Lessons",
    "Reading Sacred Texts with Provenance and Care",
    "How should readers distinguish the Holy Tablets, Circle Seven Holy Koran, El Quraan, and later commentary?",
    "Locate an authorized edition and record an exact passage and interpretation separately.",
    [
      "https://holytablets.org/",
      "https://www.archives.gov/founding-docs/bill-of-rights-transcript"
    ]
  ],
  "Saturday": [
    "World Cafe and Knowledge Cafe",
    "Community Questions, Corrections, and Public Dialogue",
    "How can a community test a public assertion and correct its own mistakes?",
    "Submit a question with an original source and name contrary evidence.",
    [
      "https://www.archives.gov/founding-docs/bill-of-rights-transcript",
      "https://www.usa.gov/voting-and-elections"
    ]
  ]
};
export function weekdayFor(when,tz="America/Chicago"){return new Intl.DateTimeFormat("en-US",{weekday:"long",timeZone:tz}).format(new Date(when))}

export function localDay(when,tz="America/Chicago"){let a=new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:tz}).formatToParts(new Date(when));let o=Object.fromEntries(a.map(p=>[p.type,p.value]));return o.year+"-"+o.month+"-"+o.day}

export function safeUrl(s){let m=/^https:\/\/([a-z0-9.-]+)(\/[^?#]*)?(\?[^#]*)?$/.exec(s);return !!m&&["www.archives.gov","www.usa.gov","www.consumerfinance.gov","www.uscourts.gov","www.bls.gov","holytablets.org"].includes(m[1])}

export function htmlEscape(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

export function createCandidate({at,evidence,tz="America/Chicago"}){
const weekday=weekdayFor(at,tz),plan=EDITIONS[weekday];if(!plan)throw Error("missing_plan");
if(!Array.isArray(evidence)||evidence.length<2||new Set(evidence.map(e=>e.url)).size<2)throw Error("two_sources_required");
for(const e of evidence)if(!plan[4].includes(e.url)||!safeUrl(e.url)||!e.ok||!e.title||!/^[0-9a-f]{64}$/.test(e.sha256)||!e.checkedAt)throw Error("unverified_source");
const date=localDay(at,tz),title="NEO Bulletin | "+plan[0]+" | "+date,slug="neo-bulletin-"+date+"-"+weekday.toLowerCase();
const ledger=evidence.map(e=>'<li><a href="'+htmlEscape(e.url)+'">'+htmlEscape(e.title)+'</a> (retrieved '+htmlEscape(e.checkedAt)+'; SHA-256 '+e.sha256.slice(0,16)+'…)</li>').join("");
const content='<p><strong>NEO Bulletin — '+htmlEscape(plan[0])+'</strong></p><h2>'+htmlEscape(plan[1])+'</h2><p><strong>Research question:</strong> '+htmlEscape(plan[2])+'</p><p>This is a source-backed editorial worksheet, not a finished factual finding. The sources below were retrieved but their contents must be interpreted and checked in context before publication.</p><h3>Evidence ledger</h3><ol>'+ledger+'</ol><h3>Learning exercise</h3><p>'+htmlEscape(plan[3])+'</p><h3>Editorial checks before publication</h3><p>Read the specific original passages; add source-linked findings and counterevidence; distinguish doctrine from external legal findings; record an editor, corrections route and right of reply. Never infer misconduct or an association with criminal files from these links.</p><p><em>Draft only. Civic education, not legal advice.</em></p>';
return {date,weekday,title,slug,series:plan[0],content,evidence,reviewRequired:true,wordpressStatus:"draft",marketingStatus:"blocked",approvalStatus:"pending"};
}
