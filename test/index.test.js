import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildPlan,extractActions,writePlan} from '../src/index.js';
test('extracts owner channel and risk',()=>{const a=extractActions('ACTION: @sam email customer recap due 2026-07-01',[])[0];assert.equal(a.owner,'sam');assert.equal(a.channel,'email');assert.equal(a.risk,'high');});
test('does not infer an owner from an email address',()=>{const plan=buildPlan({notes:'ACTION: Email sam@example.com the agenda'});assert.equal(plan.actions[0].owner,null);assert.equal(plan.actions[0].approvalRequired,true);assert.deepEqual(plan.issues,[{id:'action-1',severity:'warning',message:'Missing owner'}]);});
test('recognizes explicit owner mentions at text and punctuation boundaries',()=>{for(const text of ['ACTION: @sam draft the agenda','ACTION: Ask (@sam) to draft the agenda']) assert.equal(extractActions(text)[0].owner,'sam');});
test('normalizes sentence punctuation after explicit mentions',()=>{
  const [dotted,hyphenated,underscored]=extractActions([
    'ACTION: @sam. review the sender profile',
    'ACTION: @sam-dev review the publisher profile',
    'ACTION: @sam_ops review the emailed profile'
  ].join('\n'));
  assert.equal(dotted.owner,'sam');
  assert.equal(hyphenated.owner,'sam-dev');
  assert.equal(underscored.owner,'sam_ops');
});
test('matches channel and risk keywords as complete tokens',()=>{
  const [sender,publisher,emailed,send]=extractActions([
    'ACTION: @sam review sender profile',
    'ACTION: @sam review publisher profile',
    'ACTION: @sam review emailed calendarization',
    'ACTION: @sam send email recap'
  ].join('\n'));
  for(const action of [sender,publisher,emailed]){
    assert.equal(action.channel,'project-management');
    assert.equal(action.risk,'low');
    assert.equal(action.approvalRequired,false);
  }
  assert.equal(send.channel,'email');
  assert.equal(send.risk,'medium');
  assert.equal(send.approvalRequired,true);
});
test('requires approval for destructive and credential-related actions',()=>{for(const text of ['ACTION: @sam delete the production database','ACTION: @sam rotate leaked credentials']){const a=extractActions(text,[])[0];assert.equal(a.risk,'high');assert.equal(a.approvalRequired,true);}});
test('keeps clearly benign owned actions approval-free',()=>{const a=extractActions('ACTION: @sam draft the weekly agenda',[])[0];assert.equal(a.risk,'low');assert.equal(a.approvalRequired,false);});
test('matches attendee names case-insensitively at punctuation boundaries',()=>{for(const text of ['ACTION: SAM, draft the agenda','ACTION: Follow up with (sam).']){const a=extractActions(text,[{name:'Sam'}])[0];assert.equal(a.owner,'Sam');assert.equal(a.approvalRequired,false);}});
test('does not infer an attendee owner from a name embedded in another word',()=>{const plan=buildPlan({notes:'ACTION: Finish planning review',attendees:[{name:'Ann'}]});assert.equal(plan.actions[0].owner,null);assert.equal(plan.actions[0].approvalRequired,true);assert.deepEqual(plan.issues,[{id:'action-1',severity:'warning',message:'Missing owner'}]);});
test('strict mode rejects attendee names embedded in another word',()=>{assert.throws(()=>buildPlan({notes:'ACTION: Finish planning review',attendees:[{name:'Ann'}],strict:true}),/Missing owner/);});
test('strict mode fails missing owner',()=>{assert.throws(()=>buildPlan({notes:'TODO: Send recap email',strict:true}),/Missing owner/);});
test('buildPlan is deterministic without wall-clock provenance',()=>{const input={notes:'ACTION: @sam draft the agenda',attendees:[]};assert.deepEqual(buildPlan(input),buildPlan(input));assert.equal(buildPlan(input).generatedAt,null);});
test('buildPlan preserves an explicit generation timestamp',()=>{const generatedAt='2026-08-11T02:08:00.000Z';assert.equal(buildPlan({notes:'',generatedAt}).generatedAt,generatedAt);});
test('buildPlan rejects invalid generation timestamps',()=>{assert.throws(()=>buildPlan({notes:'',generatedAt:'today'}),/expected an ISO-8601 timestamp/);});
test('buildPlan rejects timestamp values outside the documented ISO profile',()=>{for(const generatedAt of ['2026','2026-08-11','Mon, 11 Aug 2026 02:08:00 GMT','2026-08-11T02:08:00']) assert.throws(()=>buildPlan({notes:'',generatedAt}),/expected an ISO-8601 timestamp/);});
test('extractActions ignores calendar-invalid due hints',()=>{for(const value of ['2026-02-29','2026-13-01']) assert.equal(extractActions(`ACTION: @sam prepare agenda due ${value}`)[0].due,null);});
test('extractActions preserves calendar-valid due hints',()=>{for(const value of ['2024-02-29','2026-12-31']) assert.equal(extractActions(`ACTION: @sam prepare agenda due ${value}`)[0].due,value);});
test('extractActions accepts documented weekday due hints case-insensitively',()=>{for(const weekday of ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']){const value=`next ${weekday}`;assert.equal(extractActions(`ACTION: @sam prepare agenda due ${value}`)[0].due,value);}});
test('extractActions ignores unsupported relative due tokens',()=>{for(const value of ['next banana','next weekday','next someday']) assert.equal(extractActions(`ACTION: @sam prepare agenda due ${value}`)[0].due,null);});
test('extractActions requires due hints to begin at a word boundary',()=>{for(const text of ['ACTION: @sam review overdue: 2026-09-01','ACTION: @sam review undue 2026-09-01']) assert.equal(extractActions(text)[0].due,null);});
test('extractActions accepts documented due separators at word boundaries',()=>{for(const [hint,value] of [['due 2026-09-01','2026-09-01'],['due: 2026-09-01','2026-09-01'],['due next Friday','next Friday']]) assert.equal(extractActions(`ACTION: @sam prepare agenda ${hint}`)[0].due,value);});

function temporaryDirectory(){return fs.mkdtempSync(path.join(os.tmpdir(),'meeting-action-dryrun-'));}
const deterministicPlan={generatedAt:'2026-09-06T00:00:00.000Z',actions:[],issues:[]};

test('writePlan leaves both existing artifacts unchanged when a target is invalid',()=>{
  const out=temporaryDirectory();
  fs.writeFileSync(path.join(out,'action-plan.json'),'existing plan\n');
  fs.mkdirSync(path.join(out,'review-brief.md'));
  assert.throws(()=>writePlan(deterministicPlan,out),/review-brief\.md.*regular file/);
  assert.equal(fs.readFileSync(path.join(out,'action-plan.json'),'utf8'),'existing plan\n');
  assert.deepEqual(fs.readdirSync(out).sort(),['action-plan.json','review-brief.md']);
});

test('writePlan publishes a deterministic artifact pair',()=>{
  const out=temporaryDirectory();
  writePlan(deterministicPlan,out);
  assert.equal(fs.readFileSync(path.join(out,'action-plan.json'),'utf8'),JSON.stringify(deterministicPlan,null,2)+'\n');
  assert.equal(fs.readFileSync(path.join(out,'review-brief.md'),'utf8'),'# Meeting Action Review\n\nActions: 0\n\n## Proposed Actions\n\n## Issues\n- none\n');
  assert.deepEqual(fs.readdirSync(out).sort(),['action-plan.json','review-brief.md']);
});

test('CLI failure does not leave a newly created first artifact',()=>{
  const root=temporaryDirectory();
  const out=path.join(root,'out');
  const notes=path.join(root,'notes.md');
  fs.mkdirSync(out);
  fs.mkdirSync(path.join(out,'review-brief.md'));
  fs.writeFileSync(notes,'ACTION: @sam send recap\n');
  const result=spawnSync(process.execPath,['src/cli.js','--notes',notes,'--out',out],{cwd:path.resolve(import.meta.dirname,'..'),encoding:'utf8'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/review-brief\.md.*regular file/);
  assert.equal(fs.existsSync(path.join(out,'action-plan.json')),false);
  assert.deepEqual(fs.readdirSync(out),['review-brief.md']);
});
