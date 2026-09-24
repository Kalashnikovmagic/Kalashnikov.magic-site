const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

/* -------------------------------------------------------
   HERO FRAME SEQUENCE
   87 WebP frames, driven directly by hero scroll progress.
   ------------------------------------------------------- */
const hero=$('#hero');
const heroCanvas=$('#heroCanvas');
const heroContext=heroCanvas?.getContext('2d',{alpha:false});
const HERO_FRAME_COUNT=87;
const HERO_FRAME_PATH='assets/hero/frame_';
const heroFrames=new Array(HERO_FRAME_COUNT);
let heroCurrentFrame=-1;

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

      if(index===0){
        resizeHeroCanvas();
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
  let baseWidth=1;
  let baseHeight=1;

  if(card){
    baseWidth=Math.max(1,card.offsetWidth);
    baseHeight=Math.max(1,card.offsetHeight);

    // KS.svg is a full K♠ card. The king's eyes sit around the upper
    // quarter of the card, so the final zoom is calculated from the
    // portrait area rather than from the full card.
    const eyeRegionWidth=baseWidth*.14;
    const eyeRegionHeight=baseHeight*.20;
    const calculatedZoom=Math.max(
      4,
      window.innerWidth/Math.max(1,eyeRegionWidth),
      window.innerHeight/Math.max(1,eyeRegionHeight)
    );
    // Keep a wider portrait close-up so the face is not over-cropped.
    maxZoom=Math.min(calculatedZoom,4.5);
  }

  // Start from the visual center, then move the card so the king's eyes
  // stay on the screen center during the close-up.
  const reveal=0.12+0.88*(1-Math.pow(1-p,3.6));
  const zoom=lerp(.01,maxZoom,reveal);

  const eyeX=baseWidth*.578;
  const eyeY=baseHeight*.315;
  const cardCenterX=baseWidth*.5;
  const cardCenterY=baseHeight*.5;
  const offsetX=(cardCenterX-eyeX)*zoom;
  const offsetY=(cardCenterY-eyeY)*zoom;

  kingZoom.style.transform='translate3d('+offsetX+'px,'+offsetY+'px,0) scale('+zoom+')';

  const kingIllustration=kingZoom.querySelector('.king-illustration');
  const kingBlur=clamp((.22-p)/.22,0,1);
  if(kingIllustration){
    kingIllustration.style.filter=
      'brightness(.72) blur('+(kingBlur*18)+'px) drop-shadow(0 30px 90px rgba(0,0,0,.78))';
  }

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

function updateAll(){
  updateHero();
  updateFacts();
  updateTransition();
}

let scrollVelocity=0;
let scrollAnimationFrame=null;
let lastWheelTime=0;

function animateScrollInertia(){
  scrollVelocity*=0.88;

  if(Math.abs(scrollVelocity)<0.35){
    scrollVelocity=0;
    scrollAnimationFrame=null;
    updateAll();
    return;
  }

  window.scrollBy(0,scrollVelocity);
  updateAll();
  scrollAnimationFrame=requestAnimationFrame(animateScrollInertia);
}

window.addEventListener('wheel',event=>{
  const now=performance.now();
  const dt=now-lastWheelTime;
  lastWheelTime=now;

  // Keep the browser's native scrolling, but add a short visual tail
  // after the wheel input stops.
  if(dt>80){
    scrollVelocity=0;
  }

  scrollVelocity+=event.deltaY*0.08;
  scrollVelocity=clamp(scrollVelocity,-28,28);

  if(scrollAnimationFrame===null){
    scrollAnimationFrame=requestAnimationFrame(animateScrollInertia);
  }
},{passive:true});

window.addEventListener('scroll',updateAll,{passive:true});
updateAll();

console.log('Kalashnikov.magic — hero sequence 01–87 initialized.');