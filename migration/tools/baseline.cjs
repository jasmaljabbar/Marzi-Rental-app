// Executes original pure functions and HTTP facade using isolated fakes; no live API writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('../../mobile-app/node_modules/typescript');
const root=path.resolve(__dirname,'../..');
const now=Date.parse('2026-09-14T06:30:00Z');
class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));} static now(){return now;}}
function load(file,dependencies={}){const source=fs.readFileSync(path.join(root,file),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:n=>{if(n in dependencies)return dependencies[n];throw Error('Unexpected dependency '+n);},Date:Clock,console,process:{env:{}},...dependencies.globals},{filename:file});return module.exports;}
const results=[];async function check(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
(async()=>{
const format=load('mobile-app/src/utils/format.ts');
const stock=load('mobile-app/src/utils/equipment.ts');
const returns=load('mobile-app/src/utils/returnCalculations.ts',{'./format':format});
await check('Same instant billed at least one day',()=>assert.equal(format.daysSince(new Date(now).toISOString()),1));
await check('Exactly 24 hours is one day',()=>assert.equal(format.daysSince(new Date(now-86400000).toISOString()),1));
await check('24 hours plus 1ms is two days',()=>assert.equal(format.daysSince(new Date(now-86400001).toISOString()),2));
await check('Future start clamps to one day',()=>assert.equal(format.daysSince(new Date(now+86400000).toISOString()),1));
await check('Invalid date renders dash',()=>assert.equal(format.formatDate('invalid'),'-'));
await check('Available stock subtracts damage and clamps',()=>assert.equal(stock.availableStock({stock_count:2,damaged_count:3}),0));
await check('Missing stock becomes zero',()=>assert.equal(stock.availableStock({}),0));
const rentals=[{id:'r1',equipment_id:'e1',quantity:2,rented_at:new Date(now-86400001).toISOString(),advance_amount:20},{id:'r2',equipment_id:'e2',quantity:1,rented_at:new Date(now).toISOString(),advance_amount:0}];
const equipment=[{id:'e1',rent_per_day:25},{id:'e2',rent_per_day:20}];
const allocations=returns.allocateBatchReturnAmounts(rentals,equipment,10,45);
await check('Batch gross uses current equipment rate',()=>assert.equal(allocations[0].gross,100));
await check('Batch weighted discount and payment',()=>assert.deepEqual(JSON.parse(JSON.stringify(allocations.map(x=>({discount:x.discount,paid:x.paidNow,pending:x.pending})))),[{discount:8,paid:36,pending:36},{discount:2,paid:9,pending:9}]));
await check('Overpayment cannot exceed allocated revenue',()=>assert.equal(returns.allocateBatchReturnAmounts(rentals,equipment,0,999).reduce((n,x)=>n+x.pending,0),0));
await check('Missing equipment contributes zero rate',()=>assert.equal(returns.buildReturnSummaryLines(rentals,[])[0].gross,0));
let requests=[];let response={ok:true,text:async()=>'{"ok":true}'};
const http=load('mobile-app/src/api/http.ts',{'@react-native-async-storage/async-storage':{default:{getItem:async()=> 'fixture-token'}},globals:{fetch:async(url,options)=>{requests.push({url,options});return response;}}});
await check('HTTP POST sends Bearer token and JSON',async()=>{await http.api.post('/fixture',{value:0});assert.equal(requests[0].options.headers.Authorization,'Bearer fixture-token');assert.equal(requests[0].options.body,'{"value":0}');});
await check('Empty successful body becomes object',async()=>{response={ok:true,text:async()=>''};assert.equal(Object.keys(await http.api.get('/fixture')).length,0);});
await check('409 preserves structured conflict payload',async()=>{response={ok:false,status:409,json:async()=>({detail:'Held',conflict:{id:'hold'},available_for_you:0})};await assert.rejects(()=>http.api.post('/fixture'),e=>e.status===409&&e.message==='Held'&&e.body.conflict.id==='hold');});
await check('Non-JSON failure uses HTTP status',async()=>{response={ok:false,status:503,json:async()=>{throw Error('not json')}};await assert.rejects(()=>http.api.get('/fixture'),e=>e.message==='HTTP 503');});
const output={kind:'React Native source characterization, NOT Flutter parity or device tests',clock:new Date(now).toISOString(),results,returnFixture:{rentals,equipment,discount:10,paidNow:45,expected:allocations}};
fs.writeFileSync(path.join(root,'migration/test-results/baseline.json'),JSON.stringify(output,null,2)+'\n');
console.log(`${results.filter(r=>r.status==='PASS').length}/${results.length} characterization checks passed`);if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})();
