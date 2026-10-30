const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');

test('normalizes smart apostrophes, dashes and pasted whitespace',()=>{
  assert.equal(C.normalizeAnswer('  I’m\u00a0a   cat—yes!  '),"I'm a cat-yes!");
});
test('imports CSV with comma punctuation and escaped quotes in a translation',()=>{
  const result=C.parseList('English,Translation\r\n"Hello, Sam!","Привет, Сэм!"\r\n"cat","Он сказал ""кот"""');
  assert.deepEqual(result.errors,[]);assert.equal(result.pairs[0].answer,'Hello, Sam!');assert.equal(result.pairs[1].translation,'Он сказал "кот"');
});
test('UTF-8 BOM and CRLF files keep non-English translations',()=>{
  const result=C.parseList('\uFEFFEnglish;Translation\r\ncat;кот\r\nkite;воздушный змей\r\n');
  assert.equal(result.pairs.length,2);assert.equal(result.pairs[1].translation,'воздушный змей');
});
test('imports two spreadsheet columns pasted as tabs',()=>{
  const result=C.parseList('I can fly.\tЯ умею летать.\ndon’t stop\tне останавливайся');
  assert.deepEqual(result.errors,[]);assert.equal(result.pairs[1].answer,"don't stop");
});
test('imports semicolons with commas in English phrases',()=>{
  const result=C.parseList('Hello, Sam! ; Привет, Сэм!\na green frog ; зелёная лягушка');assert.equal(result.pairs.length,2);
});
test('imports simple text pairs with equals or a spaced dash',()=>{
  assert.equal(C.parseList('cat = кот\nkite - воздушный змей').pairs.length,2);
});
test('quoted multiline translation remains a single row',()=>{
  const result=C.parseList('English,Translation\n"cat","кот\nили кошка"');assert.equal(result.pairs.length,1);assert.equal(result.pairs[0].translation,'кот\nили кошка');
});
test('CSV sample round-trips every sentence, punctuation and translation',()=>{
  assert.deepEqual(C.parseList(C.toCSV(C.DEMO)).pairs,C.DEMO);
});
test('missing translation reports the row instead of silently dropping the word',()=>{
  const result=C.validatePairs([{answer:'cat',translation:'кот'},{answer:'dog',translation:''}]);assert.equal(result.errors.length,1);assert.match(result.errors[0],/Row 2/);
});
test('unsupported answer characters are rejected before gameplay',()=>{
  for(const word of ['кошка','cat2','cat 🐱','cat/bat'])assert.ok(C.validatePairs([{answer:word,translation:'test'}]).errors.length);
});
test('only spaces or punctuation cannot make an English spell',()=>{
  assert.ok(C.validatePairs([{answer:'---',translation:'test'}]).errors.length);
});
test('empty rows can be ignored, but empty lists are blocked',()=>{
  assert.equal(C.validatePairs([{answer:'',translation:''},{answer:'cat',translation:'кот'}]).pairs.length,1);assert.ok(C.validatePairs([]).errors.length);
});
test('long answers and excessive lists report clear limits',()=>{
  assert.ok(C.validatePairs([{answer:'a'.repeat(65),translation:'test'}]).errors.length);assert.ok(C.validatePairs(Array.from({length:151},()=>({answer:'cat',translation:'кот'}))).errors.length);
});
test('capital letters, spaces, apostrophes and dashes are checked exactly',()=>{
  assert.equal(C.evaluate("I'm a cat.","I'm a cat.").correct,true);assert.deepEqual(C.evaluate('cat','Cat').indices,[0]);assert.equal(C.evaluate('a-cat','a cat').correct,false);assert.equal(C.evaluate('cat','cat.').missing,1);
});
test('malformed extra columns are reported',()=>{
  assert.ok(C.parseList('cat;кот;extra').errors.length);
});
test('shuffle retains all pairs and does not change the teacher list',()=>{
  const before=JSON.stringify(C.DEMO),after=C.shuffle(C.DEMO);assert.equal(JSON.stringify(C.DEMO),before);assert.deepEqual(after.map(p=>p.answer).sort(),C.DEMO.map(p=>p.answer).sort());assert.notEqual(after[0],C.DEMO[0]);
});
