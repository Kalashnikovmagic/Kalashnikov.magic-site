const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

/* -------------------------------------------------------
   HERO FRAME SEQUENCE
   87 WebP frames, driven directly by hero scroll progress.
   ------------------------------------------------------- */
const hero=$('#hero');
const heroCanvas=$('#heroCanvas');
const heroContext=heroCanvas?.getContext('2d',{alpha:false});

const HERO_FRAME_COUNT_MOBILE=87;
const HERO_FRAME_COUNT_DESKTOP=142;
const HERO_FRAME_PATH_MOBILE='assets/hero/frame_';
const HERO_FRAME_PATH_DESKTOP='assets/hero-desktop/frame_';
const heroIsDesktop=window.matchMedia('(min-width:821px)').matches;
const HERO_FRAME_COUNT=heroIsDesktop?HERO_FRAME_COUNT_DESKTOP:HERO_FRAME_COUNT_MOBILE;
const HERO_FRAME_PATH=heroIsDesktop?HERO_FRAME_PATH_DESKTOP:HERO_FRAME_PATH_MOBILE;
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
  updateScene4();
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
    const revealStart=80;
    const surpriseStart=160;

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
const kingCard=$('#kingCard');

const kingPupils={left:document.querySelector('.king-pupil--left'),right:document.querySelector('.king-pupil--right'),lowerLeft:document.querySelector('.king-pupil--lower-left'),lowerRight:document.querySelector('.king-pupil--lower-right')};
const kingPupilAnchors={left:{x:786.083,y:320.5},right:{x:935.437,y:318.85},lowerLeft:{x:513.917,y:1679.5},lowerRight:{x:364.563,y:1681.15}};
const kingPupilMotionDesktop={left:{x:0.004,y:0.009},right:{x:0.0032,y:0.009},lowerLeft:{x:0.0035,y:0.007},lowerRight:{x:0.003,y:0.007}};
const kingPupilMotionMobile={left:{x:0.022,y:0.009},right:{x:0.018,y:0.009},lowerLeft:{x:0.018,y:0.007},lowerRight:{x:0.016,y:0.007}};
const kingPupilMotion=window.matchMedia('(max-width:820px)').matches?kingPupilMotionMobile:kingPupilMotionDesktop;
const kingPupilState={targetX:.5,targetY:.5,left:{x:0,y:0},right:{x:0,y:0},lowerLeft:{x:0,y:0},lowerRight:{x:0,y:0}};
let kingPupilsFollowPointer=false;
function updateKingPupils(clientX,clientY){if(!kingCard)return;const rect=kingCard.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;kingPupilState.targetX=clamp((clientX-rect.left)/rect.width,0,1);kingPupilState.targetY=clamp((clientY-rect.top)/rect.height,0,1)}
function kingAnchorToCard(a){const width=kingCard?.clientWidth||0;const height=kingCard?.clientHeight||0;const useX=(a.x/1300)*164.8-82.4;const useY=(a.y/2000)*260.8-130.4;return{x:((useX+120)/240)*width,y:((useY+168)/336)*height}}
function animateKingPupils(){
  if(kingCard){
    const rect=kingCard.getBoundingClientRect();
    if(rect.width>0&&rect.height>0){
      const blur=window.__kingPupilBlur||0;
      const sides=['left','right','lowerLeft','lowerRight'];
      for(const side of sides){
        const pupil=kingPupils[side];
        const anchor=kingPupilAnchors[side];
        const motion=kingPupilMotion[side];
        if(!pupil||!anchor||!motion)continue;
        const a=kingAnchorToCard(anchor);
        const inputX=kingPupilsFollowPointer?kingPupilState.targetX:.5;
        const inputY=kingPupilsFollowPointer?kingPupilState.targetY:.5;
        const dx=(inputX-.5)*(kingCard.clientWidth||0)*motion.x;
        const dy=(inputY-.5)*(kingCard.clientHeight||0)*motion.y;
        const state=kingPupilState[side];
        state.x+=(a.x+dx-state.x)*.22;
        state.y+=(a.y+dy-state.y)*.22;
        pupil.style.transform='translate3d('+state.x+'px,'+state.y+'px,0) translate(-50%,-50%)';
        pupil.style.filter='blur('+blur+'px)';
      }
    }
  }
  requestAnimationFrame(animateKingPupils);
}
window.addEventListener('pointermove',event=>updateKingPupils(event.clientX,event.clientY),{passive:true});
animateKingPupils();



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
  let baseWidth=1;
  let baseHeight=1;

  if(card){
    baseWidth=Math.max(1,card.offsetWidth);
    baseHeight=Math.max(1,card.offsetHeight);
  }

  // King is always rendered in its final focal position. No reveal/zoom animation.
  const zoom=4.5;
  const eyeX=baseWidth*.578;
  const eyeY=baseHeight*.315;
  const cardCenterX=baseWidth*.5;
  const cardCenterY=baseHeight*.5;
  const offsetX=(cardCenterX-eyeX)*zoom;
  const offsetY=(cardCenterY-eyeY)*zoom;

  kingZoom.style.setProperty('--king-x',offsetX+'px');
  kingZoom.style.setProperty('--king-y',offsetY+'px');
  kingZoom.style.setProperty('--king-scale',zoom);

  const kingIllustration=kingZoom.querySelector('.king-illustration');
  const kingBlur=0;
  const synchronizedBlur=0;
  window.__kingPupilBlur=synchronizedBlur;
  if(kingIllustration){
    kingIllustration.style.filter=
      'brightness(.72) blur('+synchronizedBlur+'px) drop-shadow(0 30px 90px rgba(0,0,0,.78))';
  }

  const labelsP=clamp(p/.16,0,1);
  const isMobile=window.matchMedia('(max-width:820px)').matches;
  kingPupilsFollowPointer=isMobile ? labelsP>0 : false;
  if(isMobile && labelsP===0){
    kingPupilState.targetX=.5;
    kingPupilState.targetY=.5;
  }
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

document.querySelectorAll('[data-scene]').forEach(scene=>{
  scene.addEventListener('pointermove',e=>{
    const x=e.clientX/window.innerWidth;
    const y=e.clientY/window.innerHeight;
    scene.style.setProperty('--mx',x);
    scene.style.setProperty('--my',y);
  });
});

const formatModal=$('#formatModal');
const formatModalImage=$('#formatModalImage');
const formatModalTitle=$('#formatModalTitle');
const formatModalText=$('#formatModalText');
const formatModalDefaults={
  "СВАДЬБА": {
    "title": "СВАДЬБА",
    "image": "wed.jpg",
    "text": "Свадьба должна запоминаться не только молодожёнам, но и каждому гостю. Моя задача - создать живые эмоции и объединить людей, которые часто видят друг друга впервые. Современная интерактивная магия помогает быстро познакомить гостей, вовлечь их в происходящее и создать десятки моментов, которые ещё долго будут обсуждать после праздника. Никаких устаревших номеров - только динамичное шоу, юмор и настоящее удивление."
  },
  "КОРПОРАТИВ": {
    "title": "КОРПОРАТИВ",
    "image": "corp.png",
    "text": "Корпоратив - это не просто ужин и музыка. Это возможность подарить сотрудникам яркие эмоции и сделать мероприятие действительно особенным. Во время выступления гости становятся участниками невероятных событий, а магия происходит буквально у них в руках. Такой формат одинаково хорошо работает как для небольших компаний, так и для крупных корпоративных праздников."
  },
  "ЮБИЛЕЙ": {
    "title": "ЮБИЛЕЙ",
    "image": "jubiley.JPG",
    "text": "Юбилей - повод собрать самых близких людей и создать атмосферу настоящего праздника. Моя программа помогает удивить гостей любого возраста, добавить в вечер яркие впечатления и сделать событие по-настоящему уникальным. Магия становится частью праздника и органично вписывается в его атмосферу."
  },
  "ЧАСТНОЕ МЕРОПРИЯТИЕ": {
    "title": "ЧАСТНОЕ МЕРОПРИЯТИЕ",
    "image": "privat.png",
    "text": "Если вы хотите добавить в свой праздник эффект неожиданности и яркие эмоции, современное магическое шоу станет отличным решением. Интерактивный формат позволяет каждому гостю почувствовать себя частью происходящего и получить впечатления, которые невозможно повторить через экран телефона."
  },
  "ПРЕЗЕНТАЦИЯ": {
    "title": "ПРЕЗЕНТАЦИЯ",
    "image": "present.png",
    "text": "Магия отлично привлекает внимание к продукту, услуге или бренду. Я помогаю превратить обычную презентацию в событие, которое запомнится аудитории. Информация подаётся через эмоции и удивление, благодаря чему гости лучше вовлекаются в происходящее и дольше помнят ключевые сообщения компании."
  },
  "ДЕТСКИЙ ДЕНЬ РОЖДЕНИЯ": {
    "title": "ДЕТСКИЙ ДЕНЬ РОЖДЕНИЯ",
    "image": "kids.jpg",
    "text": "Дети искренне верят в чудеса, а значит магия для них работает особенно ярко. В программе много интерактива, юмора и удивительных моментов, где именинник и его друзья становятся главными героями представления. Такой праздник оставляет воспоминания, которые дети ещё долго рассказывают своим друзьям."
  },
  "ВЫПУСКНОЙ ВЕЧЕР": {
    "title": "ВЫПУСКНОЙ ВЕЧЕР",
    "image": "school.JPG",
    "text": "Выпускной бывает только один раз в жизни. Моё выступление помогает сделать этот день по-настоящему особенным и наполнить его моментами, которые будут вспоминать спустя годы. Современная магия, юмор и участие самих выпускников создают атмосферу настоящего праздника и яркого финала важного жизненного этапа."
  }
};
function openFormatModal(label){
  if(!formatModal)return;
  const data=formatModalDefaults[label]||{title:label,image:'',text:'Здесь будет продающий текст о моём выступлении на этом типе мероприятия.'};
  formatModal.dataset.format=label;
  formatModalTitle.textContent=data.title;
  formatModalText.textContent=data.text;
  formatModalImage.alt=data.title;
  formatModalImage.removeAttribute('src');
  formatModalImage.style.display='none';
  if(data.image){formatModalImage.src=data.image;formatModalImage.style.display='block'}
  formatModal.classList.add('is-open');
  formatModal.setAttribute('aria-hidden','false');
  document.body.classList.add('format-modal-open');
}
function closeFormatModal(){
  if(!formatModal)return;
  formatModal.classList.remove('is-open');
  formatModal.setAttribute('aria-hidden','true');
  document.body.classList.remove('format-modal-open');
}
transition?.addEventListener('click',event=>{
  const label=event.target.closest('.event-label');
  if(!label)return;
  event.preventDefault();
  event.stopPropagation();
  openFormatModal(label.dataset.event||label.textContent.trim());
});
formatModal?.addEventListener('click',event=>{
  if(event.target.matches('[data-format-close]')){
    event.preventDefault();
    event.stopPropagation();
    closeFormatModal();
  }
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&formatModal?.classList.contains('is-open'))closeFormatModal();
});

/* SCENE 4 — isolated mobile morph */
const scene4=$('#scene4');
const scene4Mid=$('#scene4Mid');
const scene4Top=$('#scene4Top');
const scene4Flash=$('#scene4Flash');
const scene4NextPrompt=$('#scene4NextPrompt');
const scene4Caps=[$('#scene4Cap0'),$('#scene4Cap1'),$('#scene4Cap2')];
const scene4Headlines=[$('#scene4Headline0'),$('#scene4Headline1'),$('#scene4Headline2')];
let scene4LastPhase=-1;
function scene4CrackReveal(progress,seed){
  const p=clamp(progress,0,1);
  if(p<=0)return 'polygon(0 0,100% 0,100% 0,0 0)';
  if(p>=1)return 'polygon(0 0,100% 0,100% 100%,0 100%)';
  const teeth=20;
  const points=['0% 0%','100% 0%'];
  for(let i=teeth;i>=0;i--){
    const x=100*i/teeth;
    const wave=Math.sin(i*2.25+seed)*5.5;
    const y=clamp(p*100+wave*(1-Math.abs(p-.5)),0,100);
    points.push(x.toFixed(2)+'% '+y.toFixed(2)+'%');
  }
  return 'polygon('+points.join(',')+')';
}
function updateScene4(){
  if(!scene4||!scene4Mid||!scene4Top||window.matchMedia('(min-width:821px)').matches)return;
  const p=sectionProgress(scene4);

  // Background transitions happen first. The headline changes only
  // after the corresponding wipe is almost completely finished.
  const first=clamp((p-.08)/.34,0,1);
  const second=clamp((p-.56)/.36,0,1);

  scene4Mid.style.clipPath=scene4CrackReveal(first,1.7);
  scene4Top.style.clipPath=scene4CrackReveal(second,4.2);

  // Delay the title switch until the end of each background animation.
  // 0 → 1 switches at ~92% of the first wipe.
  // 1 → 2 switches at ~92% of the second wipe.
  const firstFinished=first>=.92;
  const secondFinished=second>=.92;
  let phase=0;
  if(secondFinished){
    phase=2;
  }else if(firstFinished){
    phase=1;
  }

  scene4Headlines.forEach((el,i)=>el?.classList.toggle('is-active',i===phase));

  if(phase!==scene4LastPhase){
    scene4LastPhase=phase;
    if(scene4Flash){
      scene4Flash.style.transition='none';
      scene4Flash.style.opacity=phase===2?'0.30':'0.16';
      requestAnimationFrame(()=>{scene4Flash.style.transition='opacity 420ms ease-out';scene4Flash.style.opacity='0'});
    }
  }

  // Show the next-step prompt only near the end of Scene 4, after the final image has settled.
  const promptProgress=clamp((p-.90)/.07,0,1);
  scene4NextPrompt?.classList.toggle('is-visible',promptProgress>0);
  const shake=second>0?Math.sin(second*Math.PI*10)*(1-second)*3:0;
  scene4Top.style.transform='translate3d('+shake+'px,0,0)';
}
window.addEventListener('scroll',updateScene4,{passive:true});
updateScene4();


/* SCENE 5 — mobile stacked video formats */
const scene5=$('#scene5');
const scene5Videos=$$('.scene5__video',scene5);
scene5Videos.forEach(video=>{
  video.addEventListener('play',()=>{
    scene5Videos.forEach(other=>{if(other!==video)other.pause();});
  });
});
