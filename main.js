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


/* -------------------------------------------------------
   HERO FRAME SEQUENCE
   87 WebP frames, driven directly by hero scroll progress.
   ------------------------------------------------------- */
const hero=$('#hero');
const heroCanvas=$('#heroCanvas');
const heroContext=heroCanvas?.getContext('2d',{alpha:false});
const heroPlaceholder=$('#heroPlaceholder');

const HERO_FRAME_COUNT=87;
const HERO_FRAME_PATH='assets/hero/frame_';
const heroFrames=new Array(HERO_FRAME_COUNT);
let heroFrameWidth=0;
let heroFrameHeight=0;
let heroCurrentFrame=-1;
let heroLastDrawnWidth=0;
let heroLastDrawnHeight=0;
let heroLoaded=false;

function heroFrameUrl(index){
  return HERO_FRAME_PATH+String(index+1).padStart(4,'0')+'.webp';
}

function resizeHeroCanvas(){
  if(!heroCanvas)return;

  const width=Math.max(1,Math.round(heroCanvas.clientWidth*window.devicePixelRatio));
  const height=Math.max(1,Math.round(heroCanvas.clientHeight*window.devicePixelRatio));

  if(width===heroCanvas.width && height===heroCanvas.height)return;

  heroCanvas.width=width;
  heroCanvas.height=height;
  heroLastDrawnWidth=0;
  heroLastDrawnHeight=0;

  if(heroCurrentFrame>=0)drawHeroFrame(heroCurrentFrame);
}

function drawHeroFrame(index){
  if(!heroContext || !heroFrames[index])return;

  const image=heroFrames[index];
  const canvasWidth=heroCanvas.width;
  const canvasHeight=heroCanvas.height;

  if(!canvasWidth || !canvasHeight)return;

  heroContext.clearRect(0,0,canvasWidth,canvasHeight);

  // cover: fill the viewport without stretching the source frames
  const scale=Math.max(canvasWidth/image.naturalWidth,canvasHeight/image.naturalHeight);
  const drawWidth=image.naturalWidth*scale;
  const drawHeight=image.naturalHeight*scale;
  const x=(canvasWidth-drawWidth)/2;
  const y=(canvasHeight-drawHeight)/2;

  heroContext.drawImage(image,x,y,drawWidth,drawHeight);
  heroCurrentFrame=index;
  heroLastDrawnWidth=canvasWidth;
  heroLastDrawnHeight=canvasHeight;
}

function setHeroFrame(index){
  if(!heroFrames.length)return;
  const clamped=clamp(index,0,HERO_FRAME_COUNT-1);

  if(heroFrames[clamped]){
    drawHeroFrame(clamped);
    return;
  }

  // If a fast scroll reaches a frame that is still loading, use the nearest loaded frame.
  for(let offset=1;offset<HERO_FRAME_COUNT;offset++){
    const before=clamped-offset;
    const after=clamped+offset;

    if(before>=0 && heroFrames[before]){
      drawHeroFrame(before);
      return;
    }

    if(after<HERO_FRAME_COUNT && heroFrames[after]){
      drawHeroFrame(after);
      return;
    }
  }
}

function loadHeroFrame(index){
  return new Promise(resolve=>{
    const image=new Image();
    image.decoding='async';
    image.onload=()=>{
      heroFrames[index]=image;

      if(!heroFrameWidth){
        heroFrameWidth=image.naturalWidth;
        heroFrameHeight=image.naturalHeight;
        resizeHeroCanvas();
      }

      if(index===0){
        heroLoaded=true;
        hero?.classList.add('is-loaded');
        setHeroFrame(0);
      }

      resolve(image);
    };
    image.onerror=()=>resolve(null);
    image.src=heroFrameUrl(index);
  });
}

async function loadHeroSequence(){
  if(!heroCanvas)return;

  resizeHeroCanvas();

  // First frame appears as soon as possible.
  await loadHeroFrame(0);

  // Remaining frames load concurrently; the browser cache keeps scrolling responsive.
  await Promise.all(
    Array.from({length:HERO_FRAME_COUNT-1},(_,i)=>loadHeroFrame(i+1))
  );

  setHeroFrame(0);
}

window.addEventListener('resize',resizeHeroCanvas,{passive:true});
loadHeroSequence();


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
const transitionEyes=$$('.transition .king-face__eye span');

let targetScroll=window.scrollY;
let smoothScroll=window.scrollY;
let pointerX=.5,pointerY=.5;

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function lerp(a,b,t){return a+(b-a)*t}

function sectionProgress(section){
  if(!section)return 0;
  const rect=section.getBoundingClientRect();
  const distance=section.offsetHeight-window.innerHeight;
  return clamp(-rect.top/Math.max(1,distance),0,1);
}

function updateTransition(){
  if(!transition || !kingZoom)return;

  const p=sectionProgress(transition);
  const card=kingZoom.querySelector('.king-card');
  let maxZoom=5.8;

  // Stop when the King card reaches the viewport size instead of zooming
  // far beyond the screen. This is especially important on phones.
  if(card){
    const rect=card.getBoundingClientRect();
    const baseWidth=Math.max(1,rect.width);
    const baseHeight=Math.max(1,rect.height);
    maxZoom=Math.max(1,Math.max(window.innerWidth/baseWidth,window.innerHeight/baseHeight));
  }

  const zoom=lerp(.035,maxZoom,p);
  kingZoom.style.transform='scale('+zoom+')';

  // The zoom and the gaze are one continuous scene:
  // first the card approaches, then the same King starts following the cursor.
  const labelsP=clamp((p-.72)/.22,0,1);
  transitionLabels.style.opacity=labelsP;
  transitionLabels.style.filter='blur('+(1-labelsP)*18+'px)';
}

function updateHero(){
  const p=sectionProgress(hero);
  const title=$('[data-hero-title]');

  // The frame sequence occupies the whole hero scroll scene.
  setHeroFrame(Math.round(p*(HERO_FRAME_COUNT-1)));

  if(title){
    title.style.opacity=p<.12?1:clamp((1-p)/.15,0,1);
    title.style.transform='translateY('+(p*45)+'px)';
  }
}

function updateEyes(){
  const dx=(pointerX-.5)*2;
  const dy=(pointerY-.5)*2;

  transitionEyes.forEach((eye,i)=>{
    const strength=i%2?18:15;
    eye.style.transform='translate(calc(-50% + '+(dx*strength)+'px),calc(-50% + '+(dy*strength*.55)+'px))';
  });
}

function highlightEvent(eventName,root){
  $$('.event-label',root).forEach(el=>el.classList.toggle('is-active',el.dataset.event===eventName));
}

function bindEvents(root){
  if(!root)return;
  $$('.event-label',root).forEach(label=>{
    label.addEventListener('mouseenter',()=>highlightEvent(label.dataset.event,root));
    label.addEventListener('mouseleave',()=>highlightEvent('',root));
  });
}
bindEvents(transition);

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

console.log('Kalashnikov.magic — hero sequence 01–87 initialized.');