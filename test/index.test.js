import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan,extractActions} from '../src/index.js';
test('extracts owner channel and risk',()=>{const a=extractActions('ACTION: @sam email customer recap due 2026-07-01',[])[0];assert.equal(a.owner,'sam');assert.equal(a.channel,'email');assert.equal(a.risk,'high');});
test('strict mode fails missing owner',()=>{assert.throws(()=>buildPlan({notes:'TODO: Send recap email',strict:true}),/Missing owner/);});
