const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

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

  const dpr=Math.min(window.devicePixelRatio||1,2);
  const width=Math.max(1,Math.round(heroCanvas.clientWidth*dpr));
  const height=Math.max(1,Math.round(heroCanvas.clientHeight*dpr));

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

  // Load the first frame immediately so the hero becomes visible fast.
  await loadHeroFrame(0);

  // Load the remaining frames in small batches instead of opening 86
  // requests at once. This keeps the browser responsive during startup.
  const batchSize=8;

  for(let start=1;start<HERO_FRAME_COUNT;start+=batchSize){
    const end=Math.min(HERO_FRAME_COUNT,start+batchSize);
    await Promise.all(
      Array.from({length:end-start},(_,offset)=>loadHeroFrame(start+offset))
    );
  }

  setHeroFrame(0);
}

window.addEventListener('resize',()=>{
  resizeHeroCanvas();
  updateHero();
  updateFacts();
  updateTransition();
},{passive:true});

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
const transitionHint=$('.transition__hint');

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
  let maxZoom=12;

  if(card){
    const baseWidth=Math.max(1,card.offsetWidth);
    const baseHeight=Math.max(1,card.offsetHeight);

    // KS.svg is a full K♠ card. The king's eyes sit around the upper
    // quarter of the card, so the final zoom is calculated from the
    // portrait area rather than from the full card.
    const eyeRegionWidth=baseWidth*.14;
    const eyeRegionHeight=baseHeight*.20;
    maxZoom=Math.max(
      8,
      window.innerWidth/Math.max(1,eyeRegionWidth),
      window.innerHeight/Math.max(1,eyeRegionHeight)
    );
  }

  // Keep the eyes at the visual center while the card disappears into
  // an extreme close-up of the king's face.
  const reveal=1-Math.pow(1-p,3.2);
  const zoom=lerp(.01,maxZoom,reveal);
  kingZoom.style.transform='translateZ(0) scale('+zoom+')';

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

function updateAll(){
  updateHero();
  updateFacts();
  updateTransition();
}

window.addEventListener('scroll',updateAll,{passive:true});
updateAll();

document.querySelectorAll('[data-scene]').forEach(scene=>{
  scene.addEventListener('pointermove',e=>{
    const x=e.clientX/window.innerWidth;
    const y=e.clientY/window.innerHeight;
    scene.style.setProperty('--mx',x);
    scene.style.setProperty('--my',y);
  });
});

console.log('Kalashnikov.magic — hero sequence 01–87 initialized.');