// Read-only TypeScript AST inventory. Run from repository root.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('../../mobile-app/node_modules/typescript');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'migration/docs/evidence');
fs.mkdirSync(out, {recursive:true});
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
const files = [...walk(path.join(root,'mobile-app/src')), ...['App.tsx','index.ts','package.json','app.json','tsconfig.json'].map(p=>path.join(root,'mobile-app',p)), ...walk(path.join(root,'mobile-app/assets'))];
const manifest = files.map(file=>({file:path.relative(root,file),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const inventory=[];
for(const file of files.filter(f=>/\.tsx?$/.test(f))) {
 const source=fs.readFileSync(file,'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const record={file:path.relative(root,file),imports:[],calls:[],fields:[],conditions:[],text:[],styles:[]};
 const entry=n=>({line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,source:n.getText(ast)});
 function visit(n) {
  if(ts.isImportDeclaration(n)) record.imports.push(entry(n));
  if(ts.isCallExpression(n)&& /Api\.|api\.|useQuery$|useMutation$|useState$|invalidateQueries$|navigate$|reset$|goBack$|AsyncStorage\.|settingsRepo\.|toast\.|set.*Error$|hasFeature$|fetch$|Linking\./.test(n.expression.getText(ast))) record.calls.push(entry(n));
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)) {
   if(/Input$|Field$|Modal$|Form$|Button$|Pressable$|TouchableOpacity$/.test(n.tagName.getText(ast))) record.fields.push(entry(n));
  }
  if(ts.isIfStatement(n)) record.conditions.push(entry(n));
  if(ts.isJsxText(n)&&n.getText(ast).trim()) record.text.push({line:entry(n).line,source:n.getText(ast).trim()});
  if(ts.isVariableDeclaration(n)&&/styles|createStyles|colors|darkColors|typography|spacing|radii|shadows/.test(n.name.getText(ast))) record.styles.push(entry(n));
  ts.forEachChild(n,visit);
 }
 visit(ast); inventory.push(record);
}
fs.writeFileSync(path.join(out,'source-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
for(const rec of inventory.filter(r=>r.file.includes('/screens/')||r.file.includes('/components/'))) {
 const lines=[`# ${path.basename(rec.file)}`, '', `Source: \`${rec.file}\`. Generated AST evidence, not runtime verification.`, ''];
 for(const [label,key] of [['Data, state, navigation, and side effects','calls'],['Form controls and modal declarations','fields'],['Conditional behavior','conditions'],['Visible text','text'],['Styles','styles']]) {
  lines.push(`## ${label}`,'');
  for(const e of rec[key]) lines.push(`Source line ${e.line}:`,'```tsx',e.source,'```','');
 }
 fs.writeFileSync(path.join(out,path.basename(rec.file)+'.md'),lines.join('\n'));
}
const services=inventory.find(r=>r.file.endsWith('api/services.ts'));
const apiLines=['# API call-site inventory','','Exact expressions include payload transformations and query construction. Resolve facade signatures in `mobile-app/src/api/services.ts`; calls include dormant methods. Reachability is documented separately.',''];
for(const rec of inventory) for(const call of rec.calls.filter(c=>/\bapi\.|\bfetch\(/.test(c.source))) apiLines.push(`## ${rec.file}:${call.line}`,'','```ts',call.source,'```','');
fs.writeFileSync(path.join(out,'api-call-sites.md'),apiLines.join('\n'));
console.log(JSON.stringify({files:manifest.length,typescriptModules:inventory.length,screens:inventory.filter(r=>r.file.includes('/screens/')).length,output:path.relative(root,out)}));
