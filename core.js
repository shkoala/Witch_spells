(function (root) {
  'use strict';
  const DEMO = [
    {answer:'cat', translation:'кот'},
    {answer:'kite', translation:'воздушный змей'},
    {answer:'a green frog', translation:'зелёная лягушка'},
    {answer:'I can fly.', translation:'Я умею летать.'},
    {answer:"don't stop", translation:'не останавливайся'}
  ];
  const MAX_LENGTH = 64;
  const MAX_ITEMS = 150;
  function normalizeAnswer(value) {
    return String(value ?? '').normalize('NFKC').replace(/[‘’ʼ]/g,"'").replace(/[–—−]/g,'-').replace(/[\s\u00a0]+/g,' ').trim();
  }
  function validatePairs(pairs) {
    const cleaned = [], errors = [];
    if (!Array.isArray(pairs)) return {pairs:[],errors:['Please add English words and their translations.']};
    pairs.forEach((row,i) => {
      const answer=normalizeAnswer(row.answer), translation=String(row.translation ?? '').trim();
      if (!answer && !translation) return;
      if (!answer || !translation) { errors.push(`Row ${i+1}: add both English and a translation.`); return; }
      if (!/^[A-Za-z .,!?'-]+$/.test(answer)) { errors.push(`Row ${i+1}: use English letters, spaces and . , ! ? ' - only.`); return; }
      if (!/[A-Za-z]/.test(answer)) { errors.push(`Row ${i+1}: the English answer needs at least one letter.`); return; }
      if (answer.length > MAX_LENGTH) { errors.push(`Row ${i+1}: keep the English answer to ${MAX_LENGTH} characters.`); return; }
      if (translation.length > 240) { errors.push(`Row ${i+1}: keep the translation to 240 characters.`); return; }
      cleaned.push({answer,translation});
    });
    if (cleaned.length > MAX_ITEMS) errors.push(`Please use no more than ${MAX_ITEMS} spells in one round.`);
    if (!cleaned.length && !errors.length) errors.push('Add at least one English word and its translation.');
    return {pairs:cleaned,errors};
  }
  function parseDelimited(text,delimiter) {
    const rows=[];let row=[],field='',quoted=false,fieldStarted=false;
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"' && !fieldStarted){quoted=true;fieldStarted=true;continue;}
      if(c==='"' && quoted){if(text[i+1]==='"'){field+='"';i++;}else quoted=false;continue;}
      if(!quoted && c===delimiter){row.push(field.trim());field='';fieldStarted=false;continue;}
      if(!quoted && (c==='\r'||c==='\n')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.some(Boolean))rows.push(row);row=[];field='';fieldStarted=false;continue;}
      field+=c;fieldStarted=true;
    }
    if(quoted) throw new Error('A quoted cell is not closed. Please check your list.');
    row.push(field.trim());if(row.some(Boolean))rows.push(row);return rows;
  }
  function parseList(input) {
    const text=String(input).replace(/^\uFEFF/,'').trim();
    if(!text)return {pairs:[],errors:['Paste or import a list first.']};
    const options=['\t',';',','].map(delimiter=>({delimiter,rows:parseDelimited(text,delimiter)}));
    let selected=options.find(x=>x.delimiter==='\t'&&x.rows[0]?.length>=2)||options.find(x=>x.delimiter===';'&&x.rows[0]?.length>=2)||options.find(x=>x.delimiter===','&&x.rows[0]?.length>=2);
    let rows;
    if(selected) rows=selected.rows;
    else rows=text.split(/\r?\n/).filter(l=>l.trim()).map(l=>{
      const match=l.match(/^(.+?)\s+(?:=|[-–—])\s+(.+)$/);return match?[match[1],match[2]]:[l];
    });
    if(rows.length&&/^(english|word|answer|phrase|sentence|английский|слово)$/i.test(rows[0][0])&&/^(translation|meaning|перевод|clue)$/i.test(rows[0][1]||''))rows.shift();
    const malformed=rows.findIndex(r=>r.length!==2);
    if(malformed!==-1)return {pairs:[],errors:[`Line ${malformed+1}: use two columns — English and translation. For commas inside text, use a semicolon, a tab or quoted CSV cells.`]};
    return validatePairs(rows.map(r=>({answer:r[0],translation:r[1]})));
  }
  function toCSV(pairs) {
    const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';
    return '\uFEFFEnglish,Translation\r\n'+pairs.map(p=>[p.answer,p.translation].map(quote).join(',')).join('\r\n');
  }
  function evaluate(typed,answer) {
    const indices=[];for(let i=0;i<typed.length;i++)if(typed[i]!==answer[i])indices.push(i);
    return {correct:typed===answer,indices,missing:Math.max(0,answer.length-typed.length)};
  }
  function shuffle(pairs) {
    const result=pairs.map(p=>({...p}));for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
  }
  const api={DEMO,MAX_LENGTH,MAX_ITEMS,normalizeAnswer,validatePairs,parseList,toCSV,evaluate,shuffle};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.PotionCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
