const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const loader=$('#loader');
const loaderPercent=$('#loaderPercent');
const loaderFill=$('#loaderFill');
const loaderStatus=$('#loaderStatus');

const statuses=[
  [0,'ПОДГОТАВЛИВАЮ РЕКВИЗИТ'],
  [22,'СОСТАВЛЯЮ ПРОГРАММУ ДЛЯ ВАС'],
  [47,'ПРОВЕРЯЮ СВОБОДНЫЕ ДАТЫ'],
  [72,'ЧИТАЮ ВАШИ МЫСЛИ'],
  [91,'ПОЧТИ ГОТОВО']
];

let loaderStarted=false;

function runLoader(){
  if(loaderStarted)return;
  loaderStarted=true;

  const started=performance.now();
  const duration=6200;

  function tick(now){
    const raw=Math.min(1,(now-started)/duration);

    const eased =
      raw < .22 ? raw * 0.72 :
      raw < .47 ? .1584 + (raw-.22) * 0.78 :
      raw < .72 ? .3534 + (raw-.47) * 0.76 :
      raw < .91 ? .5434 + (raw-.72) * 0.72 :
      .6802 + (raw-.91) * 3.55;

    const pct=Math.min(100,Math.round(eased*100));

    loaderPercent.textContent=pct+'%';
    loaderFill.style.width=pct+'%';

    const status=statuses.reduce(
      (acc,item)=>item[0]<=pct?item:acc,
      statuses[0]
    );
    loaderStatus.textContent=status[1];

    if(raw<1){
      requestAnimationFrame(tick);
      return;
    }

    loaderPercent.textContent='100%';
    loaderFill.style.width='100%';
    loaderStatus.textContent='ГОТОВО';

    setTimeout(()=>loader.classList.add('is-done'),900);
  }

  requestAnimationFrame(tick);
}

// Loader temporarily disabled during development.


const factsSection=$('#facts');
const factCards=$$('.playing-card',factsSection).filter(card=>!card.classList.contains('playing-card--surprise'));
const surpriseCard=$('#surpriseCard');
const surpriseCardWrap=$('#surpriseCardWrap');
const surpriseMessage=$('#surpriseMessage');
const factsHint=$('#factsHint');
let factsUnlockedAtScroll=null;

factCards.forEach(card=>{
  card.addEventListener('click',()=>{
    card.classList.toggle('is-flipped');
    if(allFactsOpened()){
      factsUnlockedAtScroll=window.scrollY;
    }else{
      factsUnlockedAtScroll=null;
    }
    updateFacts();
  });
});

surpriseCard?.addEventListener('click',()=>{
  surpriseCard.classList.toggle('is-flipped');
  surpriseCardWrap?.classList.toggle('surprise-card--revealed',surpriseCard.classList.contains('is-flipped'));
});

function allFactsOpened(){
  return factCards.length===4 && factCards.every(card=>card.classList.contains('is-flipped'));
}

function updateFacts(){
  if(!factsSection)return;

  const opened=allFactsOpened();
  const p=sectionProgress(factsSection);

  factsSection.classList.toggle('facts--unlocked',opened);

  if(opened){
    // The fourth card unlocks the next stage, but never triggers it by itself.
    // The user must physically scroll after opening the fourth card.
    if(factsUnlockedAtScroll===null) factsUnlockedAtScroll=window.scrollY;

    const scrollAfterUnlock=Math.max(0,window.scrollY-factsUnlockedAtScroll);
    const revealStart=140;
    const surpriseStart=360;

    factsSection.classList.toggle('is-revealing',scrollAfterUnlock>=revealStart);
    factsSection.classList.toggle('is-surprise',scrollAfterUnlock>=surpriseStart);

    if(factsHint){
      factsHint.textContent='ПРОДОЛЖАЙТЕ СКРОЛЛИТЬ';
    }
  }else{
    factsSection.classList.remove('is-revealing','is-surprise');
    factsUnlockedAtScroll=null;
    surpriseCard?.classList.remove('is-flipped');
    surpriseCardWrap?.classList.remove('surprise-card--revealed');
    if(factsHint)factsHint.textContent='ОТКРОЙТЕ ВСЕ 4 КАРТЫ';
  }
}

const transition=$('#transition');
const kingZoom=$('#kingZoom');
const transitionLabels=$('#eventLabels');
const eventsSection=$('#events');
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
  updateFacts();
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