const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { attachRecommendationImage, normalizeRecommendationImageUrl } = require('../src/shared/recommendation-images.ts');

test('restaurant logos cannot replace food photographs', () => {
  assert.equal(normalizeRecommendationImageUrl('https://www.travessa.com.br/img/header/logo_travessa.gif'), null);
});

test('restaurant source photographs take priority over generic local venue photographs', () => {
  const item = { id:'sp-lellis', title:'Lellis Trattoria', location:'São Paulo', image_url:'https://restaurant.example/photos/dining-room.jpg' };
  assert.equal(attachRecommendationImage(item).image_url, item.image_url);
});
test('real TMDB posters take priority over local movie illustrations', () => {
  const item = { id:'tmdb-157336', title:'Interstellar', location:'', image_url:'https://image.tmdb.org/t/p/w500/poster.jpg' };
  assert.equal(attachRecommendationImage(item).image_url, item.image_url);
});
test('missing photographs still resolve to an existing local image', () => {
  const item = attachRecommendationImage({ id:'sp-lellis', title:'Lellis Trattoria', location:'São Paulo', image_url:null });
  assert.ok(fs.existsSync(require('node:path').join(__dirname,'../public',item.image_url)));
});
