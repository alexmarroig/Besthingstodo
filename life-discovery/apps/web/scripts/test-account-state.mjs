import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyAccountState, applyStateOperations, parseStatePatch, mergeImportedState } from '../src/shared/account-state.ts';

test('new accounts contain no seeded personal data', () => {
  const state=emptyAccountState();
  assert.equal(state.profile.account_name,'Nosso casal');
  assert.deepEqual(state.profile.preferences.favorite_movies,[]);
  assert.deepEqual(state.saved,{});
  assert.ok(!JSON.stringify(state).includes('Camila'));
});
test('field and item operations preserve unrelated changes and support removal', () => {
  const original=emptyAccountState();
  const state=applyStateOperations(original,[
    {id:'op-1',kind:'profile',value:{neighborhood:'Centro',preferences:{favorite_movies:['Duna']}}},
    {id:'op-2',kind:'upsert',entity:'saved',key:'movie-1',value:{id:'movie-1',title:'Duna'}},
    {id:'op-3',kind:'profile',value:{preferences:{favorite_restaurants:['Local']}}},
  ]);
  assert.deepEqual(state.profile.preferences.favorite_movies,['Duna']);
  assert.deepEqual(state.profile.preferences.favorite_restaurants,['Local']);
  assert.equal(state.saved['movie-1'].title,'Duna');
  assert.deepEqual(original.saved,{});
  assert.deepEqual(applyStateOperations(state,[{id:'op-4',kind:'remove',entity:'saved',key:'movie-1'}]).saved,{});
});
test('validation rejects prototype paths, unknown entities and forged ownership', () => {
  assert.throws(()=>parseStatePatch({baseVersion:0,operations:[{id:'op-1',kind:'upsert',entity:'saved',key:'__proto__',value:{}}]}));
  assert.throws(()=>parseStatePatch({baseVersion:0,operations:[{id:'op-1',kind:'upsert',entity:'users',key:'a',value:{}}]}));
  assert.throws(()=>parseStatePatch({baseVersion:0,user_id:'victim',operations:[]}));
});
test('feedback is capped at 300 and clears explicitly', () => {
  const ops=Array.from({length:305},(_,i)=>({id:'op-'+i,kind:'upsert',entity:'feedback',key:'signal-'+i,value:{id:'signal-'+i,timestamp:new Date(i*1000).toISOString()}}));
  const state=applyStateOperations(emptyAccountState(),ops);
  assert.equal(Object.keys(state.feedback).length,300);
  assert.ok(!state.feedback['signal-0']);
  assert.deepEqual(applyStateOperations(state,[{id:'clear',kind:'clearFeedback'}]).feedback,{});
});
test('legacy import is idempotent and preserves existing account items', () => {
  const existing=applyStateOperations(emptyAccountState(),[{id:'a',kind:'upsert',entity:'saved',key:'a',value:{id:'a',title:'Already in account'}}]);
  const imported={profile:{account_name:'Alex & Camila'},saved:{a:{id:'a',title:'Old copy'},b:{id:'b',title:'New import'}}};
  const merged=mergeImportedState(existing,imported);
  assert.equal(merged.saved.a.title,'Already in account');
  assert.equal(merged.saved.b.title,'New import');
  assert.deepEqual(mergeImportedState(merged,imported),merged);
});
test('legacy import never replaces a partially edited account profile', () => {
  const current=applyStateOperations(emptyAccountState(),[{id:'edit',kind:'profile',value:{city:'Campinas',preferences:{favorite_movies:['Atual']}}}]);
  const merged=mergeImportedState(current,{profile:{city:'São Paulo',preferences:{favorite_movies:['Antigo']}}});
  assert.equal(merged.profile.city,'Campinas');
  assert.deepEqual(merged.profile.preferences.favorite_movies,['Atual']);
});
test('legacy profile imports after JSONB reorders default profile properties', () => {
  const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,v])=>[key,reorder(v)])):value;
  const current=reorder(emptyAccountState());
  const merged=mergeImportedState(current,{profile:{account_name:'Casal importado'}});
  assert.equal(merged.profile.account_name,'Casal importado');
});
