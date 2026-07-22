import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan,extractActions} from '../src/index.js';
test('extracts owner channel and risk',()=>{const a=extractActions('ACTION: @sam email customer recap due 2026-07-01',[])[0];assert.equal(a.owner,'sam');assert.equal(a.channel,'email');assert.equal(a.risk,'high');});
test('requires approval for destructive and credential-related actions',()=>{for(const text of ['ACTION: @sam delete the production database','ACTION: @sam rotate leaked credentials']){const a=extractActions(text,[])[0];assert.equal(a.risk,'high');assert.equal(a.approvalRequired,true);}});
test('keeps clearly benign owned actions approval-free',()=>{const a=extractActions('ACTION: @sam draft the weekly agenda',[])[0];assert.equal(a.risk,'low');assert.equal(a.approvalRequired,false);});
test('strict mode fails missing owner',()=>{assert.throws(()=>buildPlan({notes:'TODO: Send recap email',strict:true}),/Missing owner/);});
