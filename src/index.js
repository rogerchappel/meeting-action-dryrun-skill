import fs from 'node:fs';
import path from 'node:path';
export function parseAttendees(file){
  if(!file) return [];
  let document;
  try{document=JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(error){
    if(error instanceof SyntaxError) throw new Error('Invalid attendees file: expected valid JSON');
    throw new Error('Unable to read attendees file: '+error.message);
  }
  if(!document||typeof document!=='object'||Array.isArray(document)||!Array.isArray(document.attendees)) throw new Error('Invalid attendees file: expected an object with an attendees array');
  for(const [index,attendee] of document.attendees.entries()){
    if(!attendee||typeof attendee!=='object'||Array.isArray(attendee)||typeof attendee.name!=='string'||!attendee.name.trim()) throw new Error('Invalid attendees file: attendees['+index+'] must be an object with a non-empty name');
  }
  return document.attendees.map((attendee)=>({...attendee,name:attendee.name.trim()}));
}
function escapeRegExp(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function owner(text,people){const m=text.match(/(?<![\p{L}\p{N}._%+-])@([a-z0-9._-]+)/iu);if(m) return m[1];const hit=people.find((p)=>new RegExp('(?<![\\p{L}\\p{N}_])'+escapeRegExp(p.name)+'(?![\\p{L}\\p{N}_])','iu').test(text));return hit?hit.name:null;}
function calendarDate(value){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);if(!m) return false;const date=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));return date.getUTCFullYear()===Number(m[1])&&date.getUTCMonth()===Number(m[2])-1&&date.getUTCDate()===Number(m[3]);}
function due(text){const m=text.match(/due[: ]+([0-9]{4}-[0-9]{2}-[0-9]{2}|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i);if(!m) return null;return /^\d/.test(m[1])&&!calendarDate(m[1])?null:m[1];}
function channel(text){const s=text.toLowerCase();return s.includes('email')?'email':s.includes('crm')?'crm':s.includes('calendar')?'calendar':'project-management';}
function risk(text){return /\b(?:contract|invoice|customer|external|deadline|delete|destroy|drop|erase|purge|remove|truncate|wipe|credentials?|passwords?|secrets?|api[ -]?keys?|access[ -]?tokens?|private[ -]?keys?)\b/i.test(text)?'high':(/email|publish|send/i.test(text)?'medium':'low');}
export function extractActions(markdown,attendees=[]){return markdown.split(/\r?\n/).map((line,i)=>({line,index:i+1})).filter(({line})=>/^\s*(- \[[ x]\]\s*)?(TODO|ACTION)[: -]/i.test(line)).map(({line,index},n)=>{const text=line.replace(/^\s*(- \[[ x]\]\s*)?(TODO|ACTION)[: -]\s*/i,'').trim();const r=risk(text);const o=owner(text,attendees);return {id:'action-'+(n+1),text,owner:o,due:due(text),channel:channel(text),risk:r,evidence:{line:index,source:line.trim()},approvalRequired:r!=='low'||!o};});}
export function validatePlan(actions,strict=false){const issues=[];for(const a of actions){if(!a.owner) issues.push({id:a.id,severity:strict?'error':'warning',message:'Missing owner'});if(!a.evidence||!a.evidence.line) issues.push({id:a.id,severity:'error',message:'Missing evidence line'});}if(strict&&issues.some((i)=>i.severity==='error')) throw new Error(issues.map((i)=>i.id+': '+i.message).join('; '));return issues;}
function generationTimestamp(value){if(value===undefined||value===null) return null;const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;if(typeof value!=='string'||!iso.test(value)||!calendarDate(value.slice(0,10))||Number.isNaN(Date.parse(value))) throw new Error('Invalid generatedAt: expected an ISO-8601 timestamp');return value;}
export function buildPlan({notes,attendees=[],strict=false,generatedAt}){const actions=extractActions(notes,attendees);return {generatedAt:generationTimestamp(generatedAt),actions,issues:validatePlan(actions,strict)};}
export function renderBrief(plan){const lines=['# Meeting Action Review','','Actions: '+plan.actions.length,'','## Proposed Actions'];for(const a of plan.actions) lines.push('- ['+a.risk+'] '+a.id+': '+a.text+' (owner: '+(a.owner||'needs-review')+', channel: '+a.channel+')');lines.push('','## Issues');if(!plan.issues.length) lines.push('- none');for(const i of plan.issues) lines.push('- '+i.severity+': '+i.id+' '+i.message);return lines.join('\n')+'\n';}
export function writePlan(plan,outDir){fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,'action-plan.json'),JSON.stringify(plan,null,2)+'\n');fs.writeFileSync(path.join(outDir,'review-brief.md'),renderBrief(plan));}
