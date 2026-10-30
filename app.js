(() => {
  'use strict';
  const C=window.PotionCore;
  const $=id=>document.getElementById(id);
  const STORE='shkoala-word-potion-v1';
  const state={screen:'setup',pairs:[],index:0,typed:'',solved:false,capital:false,completed:0,skipped:0,checks:0,sound:false,generation:0,animations:new Set(),slots:[],startedAt:0};
  let audioContext;
  let resizeTimer;
  const desktop=()=>!window.matchMedia('(max-width:600px) and (orientation:portrait)').matches;

  function specialBottle(symbol,label,hue) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 110 125');svg.setAttribute('aria-hidden','true');svg.setAttribute('preserveAspectRatio','xMidYMax meet');
    // The two extra potions are native vector buttons, with large readable labels.
    svg.innerHTML=`<defs><linearGradient id="glass-${hue}" x2=".8" y2="1"><stop stop-color="hsl(${hue} 76% 86%)"/><stop offset=".5" stop-color="hsl(${hue} 70% 45%)"/><stop offset="1" stop-color="hsl(${hue} 76% 72%)"/></linearGradient><linearGradient id="cork-${hue}" x2="0" y2="1"><stop stop-color="#efc68d"/><stop offset="1" stop-color="#b77c41"/></linearGradient></defs><path d="M42 20h26v14c0 10 28 16 30 36l2 29c1 16-91 16-90 0l2-29c2-20 30-26 30-36z" fill="url(#glass-${hue})" stroke="#fff6cc" stroke-width="2.5"/><path d="M38 10q17-6 34 0l-4 17H42z" fill="url(#cork-${hue})" stroke="#89562d"/><ellipse cx="55" cy="29" rx="18" ry="5" fill="none" stroke="#fff6ca" stroke-width="3"/><path d="M25 60q-8 18-5 35M34 50l-4 3" stroke="#fff9" stroke-width="5" stroke-linecap="round" fill="none"/><rect x="23" y="63" width="64" height="39" rx="14" fill="#fff2cf" stroke="#dfbd7e"/><text x="55" y="89" text-anchor="middle" font-family="Trebuchet MS,Arial,sans-serif" font-size="${symbol==='␣'?'39':'42'}" font-weight="700" fill="#27272a">${symbol}</text>${label?`<text x="55" y="117" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="#fff5d4">${label}</text>`:''}`;
    return svg;
  }

  function makeCabinet() {
    const letters='abcdefghijklmnopqrstuvwxyz'.split('');
    const groups=[letters.slice(0,10),letters.slice(10,20),[...letters.slice(20),' ','-']];
    groups.forEach(group=>{
      const row=document.createElement('div');row.className='shelf-row';
      group.forEach(char=>{
        const button=document.createElement('button');button.className='potion-button';button.type='button';button.dataset.char=char;
        button.setAttribute('aria-label',char===' '?'Space potion':char==='-'?'Dash potion':`${char} potion`);
        button.title=char===' '?'Space':char==='-'?'Dash':char;
        if(char===' '||char==='-'){
          button.classList.add('special-bottle');button.append(specialBottle(char===' '?'␣':'−',char===' '?'SPACE':'DASH',char===' '?176:277));
        } else {
          button.dataset.upper=char.toUpperCase();const img=new Image();img.src=`assets/potions/${char}.png`;img.alt='';img.draggable=false;img.addEventListener('error',()=>{$('load-error').hidden=false;});button.append(img);
        }
        button.addEventListener('click',()=>{
          if(state.solved)return;
          button.classList.remove('picked');void button.offsetWidth;button.classList.add('picked');
          addChar(char,button);
        });row.append(button);
      });$('cabinet').append(row);
    });
  }

  function setMessage(text,error=false) {
    $('setup-message').textContent=text;$('setup-message').classList.toggle('error',error);
  }
  function rowsFromForm(){return [...$('word-rows').children].map(row=>({answer:row.querySelector('.answer-input').value,translation:row.querySelector('.translation-input').value}));}
  function saveDraft() {
    try{localStorage.setItem(STORE,JSON.stringify({pairs:rowsFromForm(),shuffle:$('shuffle').checked}));}catch(_){/* The game also works if storage is unavailable. */}
    updateCount();
  }
  function updateCount(){const count=rowsFromForm().filter(p=>p.answer.trim()&&p.translation.trim()).length;$('word-count').textContent=`${count} spell${count===1?'':'s'}`;}
  function addRow(pair={answer:'',translation:''},focus=false){
    const row=document.createElement('div');row.className='word-row';
    const a=document.createElement('input');a.className='answer-input';a.value=pair.answer||'';a.maxLength=128;a.placeholder='e.g. a black cat';a.spellcheck=false;a.setAttribute('aria-label','English answer');a.autocomplete='off';
    const t=document.createElement('input');t.className='translation-input';t.value=pair.translation||'';t.maxLength=240;t.placeholder='Your translation';t.setAttribute('aria-label','Translation');t.autocomplete='off';
    const remove=document.createElement('button');remove.className='remove-row';remove.textContent='×';remove.title='Remove row';remove.setAttribute('aria-label','Remove this word');
    remove.addEventListener('click',()=>{row.remove();if(!$('word-rows').children.length)addRow();saveDraft();});
    a.addEventListener('input',saveDraft);t.addEventListener('input',saveDraft);row.append(a,t,remove);$('word-rows').append(row);
    if(focus){a.focus();row.scrollIntoView({block:'nearest',behavior:'smooth'});}updateCount();
  }
  function loadRows(pairs){$('word-rows').replaceChildren();pairs.forEach(p=>addRow(p));if(!pairs.length)addRow();updateCount();}
  function setTab(name){
    const table=name==='table';$('table-panel').hidden=!table;$('paste-panel').hidden=table;
    $('table-tab').classList.toggle('active',table);$('paste-tab').classList.toggle('active',!table);
    $('table-tab').setAttribute('aria-selected',String(table));$('paste-tab').setAttribute('aria-selected',String(!table));
  }
  function applyText(text){
    try{
      const parsed=C.parseList(text);
      if(parsed.errors.length){setMessage(parsed.errors[0],true);return false;}
      loadRows(parsed.pairs);setTab('table');saveDraft();$('paste-list').value='';setMessage(`${parsed.pairs.length} spells added. Your list is ready.`);return true;
    }catch(e){setMessage(e.message||'We could not read that list. Try the sample format.',true);return false;}
  }
  function readTextFile(file){
    return file.arrayBuffer().then(buffer=>{
      const b=new Uint8Array(buffer);
      if(b[0]===0xff&&b[1]===0xfe)return new TextDecoder('utf-16le').decode(b);
      if(b[0]===0xfe&&b[1]===0xff)return new TextDecoder('utf-16be').decode(b);
      try{return new TextDecoder('utf-8',{fatal:true}).decode(b);}catch(_){throw new Error('Please save the file as UTF-8 CSV or Unicode text, then import it again.');}
    });
  }
  function downloadSample(){
    const blob=new Blob([C.toCSV(C.DEMO)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Word_Potion_Sample.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function cancelFlights(){
    state.generation++;
    for(const animation of state.animations)animation.cancel();state.animations.clear();$('flight-layer').replaceChildren();
  }
  function screen(name){
    state.screen=name;
    for(const n of ['setup','game','finish'])$(`${n}-screen`).hidden=n!==name;
    window.scrollTo({top:0,behavior:'instant'});
  }
  function startRound(){
    if(!$('paste-panel').hidden&&$('paste-list').value.trim()&&!applyText($('paste-list').value))return;
    const parsed=C.validatePairs(rowsFromForm());
    if(parsed.errors.length){setMessage(parsed.errors[0],true);return;}
    loadRows(parsed.pairs);saveDraft();
    state.pairs=$('shuffle').checked?C.shuffle(parsed.pairs):parsed.pairs.map(p=>({...p}));
    state.index=0;state.completed=0;state.skipped=0;state.checks=0;state.startedAt=Date.now();
    screen('game');newSpell();
  }
  function status(text,kind=''){$('spell-status').textContent=text;$('spell-status').className='spell-status'+(kind?' '+kind:'');}
  function newSpell(){
    cancelFlights();state.typed='';state.solved=false;state.capital=false;
    const current=state.pairs[state.index];
    $('translation').textContent=current.translation;
    $('translation').parentElement.classList.toggle('long-clue',current.translation.length>45);
    $('translation').parentElement.classList.toggle('very-long-clue',current.translation.length>110);
    $('spell-number').textContent=`Spell ${state.index+1} / ${state.pairs.length}`;
    $('bubble-zone').replaceChildren();$('bubble-zone').classList.remove('has-letters');state.slots=[];
    for(let i=0;i<current.answer.length;i++){const slot=document.createElement('span');slot.className='bubble-slot';$('bubble-zone').append(slot);state.slots.push(slot);}
    layoutBubbles();status('Read the clue. Pick your potions.');$('next').textContent='Skip →';$('next').classList.remove('ready');syncControls();updateLive();
  }
  function layoutBubbles(){
    if(state.screen!=='game')return;
    const zone=$('bubble-zone');const rect=zone.getBoundingClientRect();const count=state.slots.length;
    const scale=$('game-stage').getBoundingClientRect().width/1672;
    let max=desktop()?76*scale:47;
    const gap=desktop()?8*scale:5;
    const padding=desktop()?18*scale:12;
    const width=rect.width-padding,height=rect.height-(desktop()?16*scale:26);
    for(let size=max;size>16;size-=1){
      const cols=Math.max(1,Math.floor((width+gap)/(size+gap)));
      if(Math.ceil(count/cols)*(size+gap)-gap<=height){max=size;break;}
    }
    zone.style.setProperty('--bubble-size',`${max}px`);zone.style.setProperty('--bubble-gap',`${gap}px`);
    $('flight-layer').style.setProperty('--bubble-size',`${max}px`);
  }
  function makeBubble(char){const b=document.createElement('span');b.className='letter-bubble';b.textContent=char===' '?'␣':char;b.setAttribute('aria-label',char===' '?'space':char);if(char===' ')b.classList.add('space-letter');return b;}
  function updateLive(){$('answer-live').textContent=state.typed?`Your answer: ${state.typed}`:'Your answer is empty.';}
  function syncControls(){
    $('capital').setAttribute('aria-pressed',String(state.capital));$('cabinet').classList.toggle('capital-on',state.capital);
    $('undo').disabled=state.solved||!state.typed.length;$('clear').disabled=state.solved||!state.typed.length;
    $('check').disabled=state.solved||!state.typed.length;
    document.querySelectorAll('.potion-button,.small-key,#capital').forEach(b=>b.disabled=state.solved);
  }
  function addChar(input,button=null,fromKeyboard=false){
    if(state.screen!=='game'||state.solved)return;
    const answer=state.pairs[state.index].answer;
    if(state.typed.length>=answer.length){status('The spell is full. Press Brew! or undo a letter.');return;}
    let char=input;
    if(!/^[A-Za-z .,!?'-]$/.test(char))return;
    if(/[a-z]/i.test(char)){
      if(!fromKeyboard)char=state.capital?char.toUpperCase():char.toLowerCase();
      else if(state.capital)char=char.toUpperCase();
      state.capital=false;
    }
    $('bubble-zone').querySelectorAll('.wrong').forEach(e=>e.classList.remove('wrong'));
    const index=state.typed.length;state.typed+=char;
    const bubble=makeBubble(char);state.slots[index].append(bubble);$('bubble-zone').classList.add('has-letters');
    flyBubble(bubble,char);tone('bubble');
    status(state.typed.length===answer.length?'Ready? Press Brew!':'Keep going. Your spell is growing.');
    syncControls();updateLive();
  }
  function flyBubble(bubble,char){
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches||!bubble.animate)return;
    const generation=state.generation,stage=$('game-stage').getBoundingClientRect(),target=bubble.getBoundingClientRect(),origin=$('cauldron-origin').getBoundingClientRect();
    const flight=document.createElement('span');flight.className='flying-bubble';flight.style.cssText=`left:${target.left-stage.left}px;top:${target.top-stage.top}px;width:${target.width}px;height:${target.height}px`;
    flight.append(makeBubble(char));$('flight-layer').append(flight);bubble.style.visibility='hidden';
    const dx=origin.left-target.left-target.width/2,dy=origin.top-target.top-target.height/2;
    const animation=flight.animate([
      {transform:`translate(${dx}px,${dy}px) scale(.18)`,opacity:.45,offset:0},
      {transform:`translate(${dx*.94}px,${dy*.73}px) scale(.7)`,opacity:1,offset:.24},
      {transform:`translate(${dx*.38}px,${Math.min(-12,dy*.15-25)}px) scale(1.07)`,opacity:1,offset:.76},
      {transform:'translate(0,0) scale(1)',opacity:1,offset:1}
    ],{duration:640,easing:'cubic-bezier(.23,.65,.25,1)',fill:'forwards'});
    state.animations.add(animation);
    animation.finished.then(()=>{state.animations.delete(animation);if(generation===state.generation&&bubble.isConnected)bubble.style.visibility='';flight.remove();}).catch(()=>{if(bubble.isConnected)bubble.style.visibility='';flight.remove();});
  }
  function settleFlights(){cancelFlights();$('bubble-zone').querySelectorAll('.letter-bubble').forEach(b=>b.style.visibility='');}
  function undo(){if(state.solved||!state.typed)return;settleFlights();state.typed=state.typed.slice(0,-1);state.slots[state.typed.length].replaceChildren();$('bubble-zone').classList.toggle('has-letters',!!state.typed);$('bubble-zone').querySelectorAll('.wrong').forEach(b=>b.classList.remove('wrong'));status('Try another potion.');syncControls();updateLive();}
  function clear(){if(state.solved)return;settleFlights();state.typed='';state.capital=false;state.slots.forEach(s=>s.replaceChildren());$('bubble-zone').classList.remove('has-letters');status('A fresh start. You can do it!');syncControls();updateLive();}
  function check(){
    if(state.solved||!state.typed.length)return;settleFlights();state.checks++;
    const result=C.evaluate(state.typed,state.pairs[state.index].answer);
    if(result.correct){
      state.solved=true;state.completed++;status('Beautiful magic! Your spell is ready.','success');state.slots.forEach(s=>s.firstElementChild?.classList.add('correct'));
      $('next').textContent=state.index===state.pairs.length-1?'Finish ✦':'Next spell →';$('next').classList.add('ready');celebrate();tone('success');syncControls();
    }else{
      result.indices.forEach(i=>state.slots[i].firstElementChild?.classList.add('wrong'));
      if(result.indices.length)status('Almost! Check the pink bubbles. Capitals matter too.','error');
      else status('A little more magic! Your spell needs more letters.','error');
      tone('wrong');
    }
  }
  function celebrate(){
    const stage=$('game-stage').getBoundingClientRect(),o=$('cauldron-origin').getBoundingClientRect();
    const flash=document.createElement('span');flash.className='cauldron-flash';$('flight-layer').append(flash);setTimeout(()=>flash.remove(),1000);
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    for(let i=0;i<20;i++){
      const spark=document.createElement('span');spark.className='magic-spark';spark.style.left=`${o.left-stage.left}px`;spark.style.top=`${o.top-stage.top}px`;$('flight-layer').append(spark);
      const angle=-Math.PI+Math.random()*Math.PI,distance=50+Math.random()*190;
      const a=spark.animate([{transform:'translate(0,0) scale(.4)',opacity:0},{opacity:1,offset:.15},{transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance}px) scale(.1)`,opacity:0}],{duration:900+Math.random()*500,easing:'ease-out',delay:Math.random()*140});state.animations.add(a);a.finished.then(()=>{state.animations.delete(a);spark.remove();}).catch(()=>spark.remove());
    }
  }
  function next(){if(state.screen!=='game')return;if(!state.solved)state.skipped++;if(state.index+1>=state.pairs.length)finish();else{state.index++;newSpell();}}
  function finish(){
    cancelFlights();screen('finish');$('finish-summary').textContent=state.completed===state.pairs.length?'Every spell is complete. What a wonderful word wizard!':'Your round is complete. There is always room for another little spell.';
    $('finish-stats').replaceChildren();
    for(const [number,label] of [[state.completed,'SPELLS BREWED'],[state.skipped,'TO TRY AGAIN']]){const d=document.createElement('div');d.className='finish-stat';const n=document.createElement('strong');n.textContent=number;const l=document.createElement('span');l.textContent=label;d.append(n,l);$('finish-stats').append(d);}
    $('finish-title').tabIndex=-1;$('finish-title').focus();
  }
  function edit(){cancelFlights();screen('setup');setMessage('Your word list is ready to edit.');}
  function toggleCapital(){if(!state.solved){state.capital=!state.capital;syncControls();}}
  function tone(kind){
    if(!state.sound)return;
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
      audioContext ||= new AudioContext();audioContext.resume();
      const values=kind==='success'?[440,554,659,880]:kind==='wrong'?[185,155]:[430+Math.random()*190];
      values.forEach((freq,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain();const now=audioContext.currentTime+i*.085;osc.type='sine';osc.frequency.setValueAtTime(freq,now);if(kind==='bubble')osc.frequency.exponentialRampToValueAtTime(freq*1.6,now+.1);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.055,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.19);osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+.21);});
    }catch(_){/* Sound is optional. */}
  }

  $('table-tab').addEventListener('click',()=>setTab('table'));$('paste-tab').addEventListener('click',()=>setTab('paste'));
  $('add-row').addEventListener('click',()=>{if($('word-rows').children.length>=C.MAX_ITEMS){setMessage(`Use no more than ${C.MAX_ITEMS} spells in one round.`,true);return;}addRow(undefined,true);saveDraft();});
  $('apply-paste').addEventListener('click',()=>applyText($('paste-list').value));
  $('demo-list').addEventListener('click',()=>{loadRows(C.DEMO);$('paste-list').value='';setTab('table');saveDraft();setMessage('Demo words added. You can change any translation.');});
  $('sample-file').addEventListener('click',downloadSample);$('shuffle').addEventListener('change',saveDraft);$('import-button').addEventListener('click',()=>$('import-file').click());
  $('import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024){setMessage('Please use a list smaller than 2 MB.',true);e.target.value='';return;}try{applyText(await readTextFile(file));}catch(error){setMessage(error.message,true);}e.target.value='';});
  $('start-game').addEventListener('click',startRound);$('edit-words').addEventListener('click',edit);$('finish-edit').addEventListener('click',edit);
  $('play-again').addEventListener('click',startRound);$('undo').addEventListener('click',undo);$('clear').addEventListener('click',clear);$('check').addEventListener('click',check);$('next').addEventListener('click',next);$('capital').addEventListener('click',toggleCapital);
  $('sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;$('sound-toggle').setAttribute('aria-pressed',String(state.sound));$('sound-toggle').textContent=state.sound?'Sound on':'Sound off';if(state.sound)tone('bubble');});
  document.querySelectorAll('.small-key').forEach(b=>b.addEventListener('click',()=>addChar(b.dataset.char)));
  document.addEventListener('keydown',e=>{
    if(state.screen!=='game'||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
    if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName))return;
    if(e.key==='Enter'){
      if(document.activeElement?.tagName==='BUTTON')return;
      e.preventDefault();if(!e.repeat){if(state.solved)next();else check();}return;
    }
    if(e.key==='Backspace'){e.preventDefault();undo();return;}
    if(e.key==='Escape'){e.preventDefault();clear();return;}
    if(e.key.length===1&&/^[A-Za-z .,!?'-]$/.test(e.key)){e.preventDefault();addChar(e.key,null,true);}
  });
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(state.screen==='game'){settleFlights();layoutBubbles();}},120);});
  makeCabinet();
  try{const draft=JSON.parse(localStorage.getItem(STORE));if(Array.isArray(draft?.pairs)&&draft.pairs.length){loadRows(draft.pairs.slice(0,C.MAX_ITEMS));$('shuffle').checked=!!draft.shuffle;}else loadRows(C.DEMO);}catch(_){loadRows(C.DEMO);}
  const bg=new Image();bg.src='assets/workshop.png';bg.onerror=()=>{$('load-error').hidden=false;};
})();
