import { createArena } from './renderer.js?v=combo2';
import { CHARACTER_ROSTER } from './character.js?v=combo2';
import { ATTACKS, startAttack, requestPunch, advancePunchBuffer, finishAttack } from './combo.js?v=combo2';
'use strict';
const selectedCharacters = ['character1', 'bomzh'];
// Slot colors are independent of the selected character.
const CHARACTERS = [
  { name: 'Бомж', color: '#ceff51', accent: '#7c9a27', skin: '#bc7c5c' },
  { name: 'Бомж · спарринг', color: '#bb8fff', accent: '#7151a0', skin: '#d89b7b' }
];
const canvas = document.querySelector('#arena');
const arena3d = createArena(canvas);
const $ = s => document.querySelector(s);
const keys = new Set(), particles = [];
let fighters, state = 'menu', wins = [0,0], round = 1, remaining = 60;
let characterReady = false;
let lastTime = 0, animationTime = 0, roundDelay = 0, announcementTime = 0;
let shake = 0, soundEnabled = false, audioContext;
const FLOOR = 528;
const punchPresses = [0, 0];
function fighter(i) { return { ...CHARACTERS[i], name: CHARACTER_ROSTER[selectedCharacters[i]].name, x: i ? 830 : 370, y: FLOOR, vy: 0, facing: i ? -1 : 1, hp: 100, attack: null, cooldown: 0, stun: 0, block: false, moving: false, punchQueue: 0, punchBufferTime: 0, punchCount: CHARACTER_ROSTER[selectedCharacters[i]].clips.punches.length, punchHeld: false, interrupted: false, aiTime: 0, aiAction: 'approach' }; }
function resetFighters() { punchPresses.fill(0); fighters = [fighter(0),fighter(1)]; remaining = 60; particles.length = 0; updateHUD(); }
function updateHUD() {
  fighters.forEach((f,i) => { $('#hp'+(i+1)).style.width = f.hp+'%'; $('#name'+(i+1)).textContent = f.name; $('#wins'+(i+1)).textContent = [0,1].map(n => n < wins[i] ? '●' : '○').join(' '); });
  $('#timer').textContent = Math.ceil(remaining).toString().padStart(2,'0'); $('#round').textContent = 'РАУНД '+round;
  $('#opponent-label').textContent = $('#mode').value === 'cpu' ? 'CPU' : 'PLAYER 2';
}
function announce(text, duration=1) { $('#announcement').textContent = text; announcementTime = duration; }
function showOverlay(title, copy, button) { $('#overlay-title').textContent=title; $('#overlay-copy').textContent=copy; $('#start').innerHTML=button+' <span>↗</span>'; $('#overlay').hidden=false; }
function startMatch() { if (!characterReady) return; wins=[0,0]; round=1; resetFighters(); state='fight'; $('#overlay').hidden=true; announce('FIGHT!',1); keys.clear(); }
function pause() { if(state==='fight'){state='paused';keys.clear();punchPresses.fill(0);fighters.forEach(f=>{f.punchQueue=0;f.punchBufferTime=0});showOverlay('ПАУЗА','Выдохни. Следующий удар за тобой.','ПРОДОЛЖИТЬ');}else if(state==='paused'){state='fight';$('#overlay').hidden=true;} }
function tone(freq, duration, type='triangle') { if(!soundEnabled)return; audioContext ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audioContext.createOscillator(), g=audioContext.createGain(); o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.055,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration); }

function control(f, input, dt) {
  f.block=input.block&&f.y===FLOOR&&!f.attack&&f.stun<=0;
  f.moving=false;
  if (input.block) { f.punchQueue = 0; f.punchBufferTime = 0; }
  if(f.stun>0){ f.punchQueue=0; f.punchBufferTime=0; return; }
  advancePunchBuffer(f, dt);
  if(!f.attack&&!f.block){const dir=Number(input.right)-Number(input.left);f.x+=dir*245*dt;f.moving=dir!==0;if(input.jump&&f.y===FLOOR)f.vy=-625;}
  for (let n=0; n<(input.punchPresses || 0); n++) requestPunch(f);
  if(input.kick && !input.punchPresses) startAttack(f,'kick');
}
function cpu(f, other, dt) {
  f.aiTime-=dt;
  const distance=Math.abs(f.x-other.x);
  if(f.aiTime<=0){f.aiTime=.16+Math.random()*.23;const r=Math.random();f.aiAction=other.attack&&r<.62?'block':distance>135?'approach':r<.36?'punch':r<.65?'kick':r<.8?'retreat':'wait';}
  const direction=Math.sign(other.x-f.x)*(f.aiAction==='retreat'?-1:1);
  return {left:direction<0&&(f.aiAction==='approach'||f.aiAction==='retreat'),right:direction>0&&(f.aiAction==='approach'||f.aiAction==='retreat'),block:f.aiAction==='block',punch:f.aiAction==='punch',kick:f.aiAction==='kick',jump:false};
}
function finishRound() {
  let winner=fighters[0].hp===fighters[1].hp?-1:fighters[0].hp>fighters[1].hp?0:1;
  if(winner>=0)wins[winner]++;updateHUD();
  punchPresses.fill(0);fighters.forEach(f=>{f.punchQueue=0;f.punchBufferTime=0});
  state='roundEnd';roundDelay=2.4;announce(winner<0?'НИЧЬЯ':fighters[winner].hp>0&&fighters[1-winner].hp===0?'K.O.':'ВРЕМЯ!',2.4);
  tone(90,.5,'sawtooth');
}
function update(dt) {
  animationTime+=dt;
  if(announcementTime>0){announcementTime-=dt;if(announcementTime<=0)$('#announcement').textContent='';}
  shake=Math.max(0,shake-dt*35);
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=480*dt;if(p.life<=0)particles.splice(i,1);}
  if(state==='roundEnd'){roundDelay-=dt;if(roundDelay<=0){if(wins.some(w=>w===2)){state='over';showOverlay(fighters[wins[0]===2?0:1].name+' ПОБЕДИЛ','Матч завершён. Готов к реваншу?','РЕВАНШ');}else{round++;resetFighters();state='fight';announce('РАУНД '+round,1);}}return;}
  if(state!=='fight')return;
  remaining=Math.max(0,remaining-dt);
  fighters.forEach((f,i)=>{
    f.cooldown=Math.max(0,f.cooldown-dt);f.stun=Math.max(0,f.stun-dt);f.facing=fighters[1-i].x>=f.x?1:-1;
    const input=i===0?{left:keys.has('a'),right:keys.has('d'),jump:keys.has('w'),punch:keys.has('j'),punchPresses:punchPresses[0],kick:keys.has('k'),block:keys.has('l')}:$('#mode').value==='cpu'?cpu(f,fighters[0],dt):{left:keys.has('arrowleft'),right:keys.has('arrowright'),jump:keys.has('arrowup'),punch:keys.has('1'),punchPresses:punchPresses[1],kick:keys.has('2'),block:keys.has('3')};
    if (i===1 && $('#mode').value==='cpu') input.punchPresses = input.punch && !f.punchHeld ? 1 : 0;
    f.punchHeld = input.punch;
    control(f,input,dt);f.vy+=1550*dt;f.y=Math.min(FLOOR,f.y+f.vy*dt);if(f.y===FLOOR)f.vy=0;f.x=Math.max(65,Math.min(1135,f.x));
    if(f.attack)f.attack.time+=dt;
  });
  punchPresses.fill(0);
  // Resolve contact after both inputs so simultaneous strikes are fair.
  fighters.forEach((f,i)=>{
    if(!f.attack)return;const a=f.attack,d=ATTACKS[a.type],other=fighters[1-i];
    if(!a.hit&&a.time>=d.active&&a.time<=d.end&&Math.abs(f.x-other.x)<d.reach&&Math.abs(f.y-other.y)<105){
      a.hit=true;const blocked=other.block;other.hp=Math.max(0,other.hp-(blocked?2:d.damage));other.stun=blocked?.08:.21;other.punchQueue=0;other.punchBufferTime=0;if(!blocked)other.interrupted=true;
      other.x=Math.max(65,Math.min(1135,other.x+f.facing*(blocked?9:23)));shake=blocked?2:7;
      const x=(f.x+other.x)/2,y=(f.y+other.y)/2-108;
      for(let n=0;n<14;n++)particles.push({x,y,vx:(Math.random()-.5)*470,vy:(Math.random()-.5)*400,life:.15+Math.random()*.25,color:blocked?'#e4deff':'#ceff51'});
      tone(blocked?180:65,.13,blocked?'triangle':'sawtooth');
    }

  });
  for (const f of fighters) {
    if (f.interrupted) { f.attack=null; f.interrupted=false; }
    else finishAttack(f);
  }
  const [a,b]=fighters, gap=Math.abs(a.x-b.x);
  if(gap<72&&Math.abs(a.y-b.y)<110){const sign=a.x<=b.x?1:-1,correction=(72-gap)/2;a.x=Math.max(65,Math.min(1135,a.x-sign*correction));b.x=Math.max(65,Math.min(1135,b.x+sign*correction));}
  updateHUD();if(remaining<=0||fighters.some(f=>f.hp<=0))finishRound();
}
function render(){ arena3d.render(fighters, particles, animationTime, shake, FLOOR); }
function frame(t){const dt=Math.min((t-lastTime)/1000||0,.033);lastTime=t;if(state!=='paused')update(dt);render();requestAnimationFrame(frame);}
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(e.target.matches('select,button')&&key!=='escape')return;if(['a','d','w','j','k','l','arrowleft','arrowright','arrowup','1','2','3',' '].includes(key))e.preventDefault();if(key==='escape'&&!e.repeat)pause();else {
  if (!e.repeat && !keys.has(key)) recordPunchPress(key);
  keys.add(key);
}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();if(state==='fight')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='fight')pause();});
$('#start').onclick=()=>{if(state==='paused')pause();else startMatch();$('#start').blur();};
$('#restart').onclick=()=>{startMatch();$('#restart').blur();};$('#pause').onclick=()=>{pause();$('#pause').blur();};
$('#mode').onchange=()=>{state='menu';wins=[0,0];round=1;keys.clear();resetFighters();announce('',0);showOverlay('ГОТОВ К БОЮ?','Режим изменён. Начни новый матч.','НАЧАТЬ БОЙ');};
$('#sound').onclick=()=>{soundEnabled=!soundEnabled;$('#sound').textContent='ЗВУК: '+(soundEnabled?'ВКЛ':'ВЫКЛ');$('#sound').setAttribute('aria-pressed',soundEnabled);tone(440,.1);$('#sound').blur();};
function recordPunchPress(key) {
  if (state !== 'fight') return;
  if (key === 'j') punchPresses[0] = Math.min(3, punchPresses[0] + 1);
  if (key === '1' && $('#mode').value === 'local') punchPresses[1] = Math.min(3, punchPresses[1] + 1);
}
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(!keys.has(b.dataset.key))recordPunchPress(b.dataset.key);keys.add(b.dataset.key);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(b.dataset.key);});
function setLoading(loading) {
  characterReady = !loading;
  for (const id of ['start', 'restart', 'fighter1', 'fighter2']) $('#'+id).disabled = loading;
  if (loading) {
    canvas.dataset.character = 'loading';
    showOverlay('ЗАГРУЗКА БОЙЦОВ', 'Готовим персонажей Dripcartoon…', 'ЗАГРУЗКА');
  } else {
    updateHUD();
    showOverlay('ГОТОВ К БОЮ?', 'Выбери бойцов. До двух побед.', 'НАЧАТЬ БОЙ');
  }
}
function loadingError(error) {
  console.error('Character loading failed', error);
  showOverlay('НЕ УДАЛОСЬ ЗАГРУЗИТЬ БОЙЦОВ', 'Проверь соединение и перезагрузи страницу.', 'ПОВТОРИТЬ');
  $('#start').disabled = false;
  $('#start').onclick = () => location.reload();
}
async function changeCharacters() {
  state = 'menu'; keys.clear(); wins = [0, 0]; round = 1; announce('', 0);
  selectedCharacters[0] = $('#fighter1').value; selectedCharacters[1] = $('#fighter2').value;
  resetFighters(); setLoading(true);
  try { await arena3d.setCharacters(selectedCharacters); setLoading(false); }
  catch (error) { loadingError(error); }
}
$('#fighter1').onchange = changeCharacters;
$('#fighter2').onchange = changeCharacters;
resetFighters(); setLoading(true);
arena3d.ready.then(() => setLoading(false)).catch(loadingError);
requestAnimationFrame(frame);
