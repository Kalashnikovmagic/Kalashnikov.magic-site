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

function heroFrameUrl(index){return HERO_FRAME_PATH+String(index+1).padStart(4,'0')+'.webp';}
/* restored from commit 9843f8bd1707e08ee601f2fe41a42e357c8f9943 */