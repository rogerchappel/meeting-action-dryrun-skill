#!/usr/bin/env node
import fs from 'node:fs';
import {buildPlan,parseAttendees,writePlan} from './index.js';
const args=process.argv.slice(2);if(args.includes('--help')){console.log('Usage: meeting-action-dryrun --notes meeting.md [--attendees attendees.json] [--strict] --out <dir>');process.exit(0);}
function val(f,d){const i=args.indexOf(f);return i===-1?d:args[i+1];}
const notesFile=val('--notes'), attendeesFile=val('--attendees'), out=val('--out','meeting-action-out');if(!notesFile){console.error('Missing --notes');process.exit(2);}
const plan=buildPlan({notes:fs.readFileSync(notesFile,'utf8'),attendees:parseAttendees(attendeesFile),strict:args.includes('--strict')});writePlan(plan,out);console.log('Wrote '+out+'/action-plan.json and '+out+'/review-brief.md');
