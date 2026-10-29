import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeProviders, matchCinemaMovie, normalizeCinemaSessions, safeWatchUrl } from '../src/shared/watch-availability.ts';

test('only Brazilian providers are shown, with separate subscription/rental/purchase offers', () => {
  const data = { results: {
    US: { flatrate: [{ provider_id: 1, provider_name: 'US only' }] },
    BR: { link: 'https://www.themoviedb.org/movie/1/watch?locale=BR',
      flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' }, { provider_id: 8, provider_name: 'Netflix' }],
      rent: [{ provider_id: 10, provider_name: 'Amazon Video' }], buy: [{ provider_id: 10, provider_name: 'Amazon Video' }] }
  }};
  const result = normalizeProviders(data);
  assert.deepEqual(result.groups.map(g => [g.kind, g.providers.map(p => p.name)]), [
    ['flatrate', ['Netflix']], ['rent', ['Amazon Video']], ['buy', ['Amazon Video']]
  ]);
  assert.deepEqual(normalizeProviders({ results: { US: data.results.US } }).groups, []);
});

test('cinema matching normalizes accents but rejects similar titles and remakes', () => {
  const movies = [
    { id: '1', title: 'Duna', originalTitle: 'Dune', releaseYear: 1984 },
    { id: '2', title: 'Duna', originalTitle: 'Dune', releaseYear: 2021 },
    { id: '3', title: 'Duna: Parte Dois', releaseYear: 2024 }
  ];
  assert.equal(matchCinemaMovie(movies, { title: 'Dune', year: 2021 })?.id, '2');
  assert.equal(matchCinemaMovie(movies, { title: 'Duna' }), null);
  assert.equal(matchCinemaMovie(movies, { title: 'Duna: Parte', year: 2024 }), null);
  assert.equal(matchCinemaMovie([{ id:'4', title:'O Céu', releaseYear:2026 }], { title:'O Ceu', year:2026 })?.id, '4');
});

test('sessions exclude past, disabled, streaming and unsafe checkout links', () => {
  const session = { id:'a', enabled:true, siteURL:'https://checkout.ingresso.com/?sessionId=a', type:['Legendado'], date:{ localDate:'2026-10-30T19:00:00-03:00' } };
  const data = [{ date:'2026-10-30', theaters:[{ id:'t', name:'Cinema', enabled:true, rooms:[{ name:'Sala 1', sessions:[
    session, { ...session, id:'past', date:{ localDate:'2026-10-28T19:00:00-03:00' } },
    { ...session, id:'disabled', enabled:false }, { ...session, id:'stream', streaming:true },
    { ...session, id:'unsafe', siteURL:'https://evil.example/buy' }
  ] }] }] }];
  const result=normalizeCinemaSessions(data, Date.parse('2026-10-29T21:00:00Z'));
  assert.equal(result.length, 1);
  assert.equal(result[0].theater, 'Cinema');
  assert.equal(result[0].id, 'a');
  assert.equal(safeWatchUrl('javascript:alert(1)', ['ingresso.com']), null);
  assert.equal(safeWatchUrl('https://ingresso.com.evil.example', ['ingresso.com']), null);
});
