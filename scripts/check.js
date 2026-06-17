import fs from 'node:fs';
const required=['README.md','SKILL.md','docs/PRD.md','docs/TASKS.md','docs/ORCHESTRATION.md','docs/RELEASE_CANDIDATE.md','src/cli.js','src/index.js'];
const missing=required.filter((f)=>!fs.existsSync(f));
if(missing.length){console.error('Missing required files: '+missing.join(', '));process.exit(1);}
console.log('check ok');
