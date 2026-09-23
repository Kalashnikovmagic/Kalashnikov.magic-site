const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const loader=$('#loader');
const loaderPercent=$('#loaderPercent');
const loaderFill=$('#loaderFill');
const loaderStatus=$('#loaderStatus');

const statuses=[
  [0,'ПОДГОТАВЛИВАЮ РЕКВИЗИТ'],
  [24,'СОСТАВЛЯЮ ПРОГРАММУ ДЛЯ ВАС'],
  [52,'ПРОВЕРЯЮ СВОБОДНЫЕ ДАТЫ'],
  [78,'ЧИТАЮ ВАШИ МЫСЛИ'],
  [94,'ПОЧТИ ГОТОВО']
];

function runLoader(){
  const started=performance.now();
  const duration=2200;
  function tick(now){
    const raw=Math.min(1,(now-started)/duration);
    const eased=1-Math.pow(1-raw,3);
    const pct=Math.round(eased*100);
    loaderPercent.textContent=pct+'%';
    loaderFill.style.width=pct+'%';
    const status=statuses.reduce((acc,item)=>item[0]<=pct?item:acc,statuses[0]);
    loaderStatus.textContent=status[1];
    if(raw<1){requestAnimationFrame(tick);return}
    loaderStatus.textContent='ГОТОВО';
    setTimeout(()=>loader.classList.add('is-done'),420);
  }
  requestAnimationFrame(tick);
}
window.addEventListener('load',runLoader,{once:true});
setTimeout(()=>{if(!loader.classList.contains('is-done'))runLoader()},2800);

const cards=$$('.playing-card');
cards.forEach(card=>{
  card.addEventListener('click',()=>card.classList.toggle('is-flipped'));
});

const transition=$('#transition');
const kingZoom=$('#kingZoom');
const transitionLabels=$('#eventLabels');
const transitionEvents=$$('.event-label',transition);
const interactiveKing=$('#interactiveKing');
const eventsSection=$('#events');
const eventLabels=$$('.event-label',eventsSection);
const eyes=$$('.king-face__eye span');

let targetScroll=window.scrollY;
let smoothScroll=window.scrollY;
let pointerX=.5,pointerY=.5;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function lerp(a,b,t){return a+(b-a)*t}

function sectionProgress(section){
  const rect=section.getBoundingClientRect();
  const distance=section.offsetHeight-window.innerHeight;
  return clamp(-rect.top/Math.max(1,distance),0,1);
}

function updateTransition(){
  const p=sectionProgress(transition);
  const zoom=lerp(.035,5.8,p);
  kingZoom.style.transform='scale('+zoom+')';
  const labelsP=clamp((p-.72)/.22,0,1);
  transitionLabels.style.opacity=labelsP;
  transitionLabels.style.filter='blur('+(1-labelsP)*18+'px)';
  transition.classList.toggle('is-ready',p>.91);
}

function updateHero(){
  const hero=$('#hero');
  const p=sectionProgress(hero);
  const title=$('[data-hero-title]');
  if(title){
    title.style.opacity=clamp((p-.12)/.15,0,1)*clamp((1-p)/.15,0,1);
    title.style.transform='translateY('+(p*45)+'px)';
  }
}

function updateEyes(){
  const dx=(pointerX-.5)*2;
  const dy=(pointerY-.5)*2;
  eyes.forEach((eye,i)=>{
    const strength=i%2?18:15;
    eye.style.transform='translate(calc(-50% + '+(dx*strength)+'px),calc(-50% + '+(dy*strength*.55)+'px))';
  });
}

function highlightEvent(eventName,root){
  $$('.event-label',root).forEach(el=>el.classList.toggle('is-active',el.dataset.event===eventName));
}

function bindEvents(root){
  $$('.event-label',root).forEach(label=>{
    label.addEventListener('mouseenter',()=>highlightEvent(label.dataset.event,root));
    label.addEventListener('mouseleave',()=>highlightEvent('',root));
  });
}
bindEvents(transition);
bindEvents(eventsSection);

window.addEventListener('pointermove',e=>{
  pointerX=e.clientX/window.innerWidth;
  pointerY=e.clientY/window.innerHeight;
  updateEyes();
});

window.addEventListener('scroll',()=>{targetScroll=window.scrollY},{passive:true});

function frame(){
  smoothScroll=lerp(smoothScroll,targetScroll,.12);
  updateHero();
  updateTransition();
  updateEyes();
  requestAnimationFrame(frame);
}
frame();

document.querySelectorAll('[data-scene]').forEach(scene=>{
  scene.addEventListener('pointermove',e=>{
    const x=e.clientX/window.innerWidth;
    const y=e.clientY/window.innerHeight;
    scene.style.setProperty('--mx',x);
    scene.style.setProperty('--my',y);
  });
});

console.log('Kalashnikov.magic — scenes 01–04 base initialized.');
