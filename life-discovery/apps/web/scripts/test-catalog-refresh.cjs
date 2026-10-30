const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
if(!process.env.DATABASE_URL?.includes('ep-restless-cloud-b5n35vd1.'))throw Error('Preview database only.');
const originalLoad=Module._load;
Module._load=function(request,...args){if(request==='server-only')return {};if(request==='./catalog-collectors')return {catalogCollectors:()=>[]};return originalLoad.call(this,request,...args)};
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {refreshCatalog}=require('../src/server/catalog-refresh.ts');
const {neon}=require('@neondatabase/serverless');const sql=neon(process.env.DATABASE_URL);
test('daily collection preserves failed sources, retries independently and is idempotent',async()=>{
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
 assert.equal((await sql`SELECT run_date FROM catalog_runs WHERE run_date=${date}`).length,0,'Use a clean preview before the first actual daily run');
 const good='qa-good-'+crypto.randomUUID(),bad='qa-bad-'+crypto.randomUUID();let calls=0;
 try{
  await sql`INSERT INTO catalog_sources(source_key,domain,city,items) VALUES (${bad},'test','QA','[{"id":"old","title":"Previous valid item"}]'::jsonb)`;
  const result=await refreshCatalog([{key:good,domain:'test',city:'QA',collect:async()=>{calls++;return [{id:'new',title:'New'}]}},{key:bad,domain:'test',city:'QA',collect:async()=>{throw Error('Provider down')}}]);
  assert.equal(result.status,'partial');assert.equal(calls,1);
  const previous=await sql`SELECT items,last_error FROM catalog_sources WHERE source_key=${bad}`;assert.equal(previous[0].items[0].id,'old');assert.equal(previous[0].last_error,'source_unavailable');
  const retried=await refreshCatalog([{key:good,domain:'test',city:'QA',collect:async()=>{calls++;return [{id:'wrong',title:'Should not refetch'}]}},{key:bad,domain:'test',city:'QA',collect:async()=>[{id:'recovered',title:'Recovered'}]}]);
  assert.equal(retried.status,'ok');assert.equal(calls,1);
  assert.equal((await refreshCatalog([])).skipped,true);
 }finally{
  await sql`DELETE FROM catalog_snapshots WHERE source_key IN (${good},${bad})`;
  await sql`DELETE FROM catalog_sources WHERE source_key IN (${good},${bad})`;
  await sql`DELETE FROM catalog_runs WHERE run_date=${date}`;
 }
});
