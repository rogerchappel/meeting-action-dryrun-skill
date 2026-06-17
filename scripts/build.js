import fs from 'node:fs';
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist',{recursive:true});
for(const f of ['README.md','SKILL.md','package.json']) fs.copyFileSync(f,'dist/'+f);
console.log('build ok');
