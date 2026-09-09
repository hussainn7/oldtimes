// Cached botanical sprites: irregular branches and leaflets instead of repeated polygons.
const cache=new Map<string,HTMLCanvasElement>();
const rand=(n:number)=>{const f=Math.sin(n*127.1+27.3)*43758.5453;return f-Math.floor(f)};
export function plantSprite(type:'conifer'|'fern'|'broadleaf'|'acacia',color:string,seed:number){const key=`${type}-${color}-${seed%5}`;if(cache.has(key))return cache.get(key)!;const el=document.createElement('canvas');el.width=320;el.height=420;const c=el.getContext('2d')!;c.translate(160,410);c.fillStyle=color;c.strokeStyle=color;c.lineCap='round';
 const leaf=(x:number,y:number,rx:number,ry:number,a=0)=>{c.beginPath();c.ellipse(x,y,rx,ry,a,0,Math.PI*2);c.fill()};
 const branch=(x:number,y:number,xx:number,yy:number,width:number)=>{c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x*.6+xx*.4,y*.2+yy*.8,xx,yy);c.stroke()};
 if(type==='fern'){branch(0,0,0,-64,5);for(let i=0;i<11;i++){const side=i%2?-1:1;const length=80+rand(i+seed)*75;const tipX=side*(35+rand(i*3+seed)*100);const tipY=-60-length*.55;branch(0,-20,tipX,tipY,2.4);for(let j=1;j<15;j++){const f=j/15;const x=tipX*f,y=-20+(tipY+20)*f-35*Math.sin(f*Math.PI);const sz=(1-f)*17+2;leaf(x+side*sz*.4,y+5,sz,2.5,side*.55);leaf(x-side*sz*.25,y-4,sz,2.2,-side*.5)}}}
 else if(type==='conifer'){branch(0,0,2,-360,9);for(let i=0;i<27;i++){const y=-345+i*11;const span=12+i*3.5;for(const side of [-1,1]){const xx=side*span*(.8+rand(i+seed+side)*.3);const yy=y+12+rand(i)*15;branch(0,y,xx,yy,2.5);for(let k=0;k<11;k++){const f=k/10;const bx=xx*f;const by=y+(yy-y)*f;const size=(7+i*.22)*(1-f*.35);leaf(bx,by,size,3.5,side*.2);branch(bx,by,bx+side*size*.7,by-size,1.6);leaf(bx+side*size*.55,by-size*.5,2.5,size*.7,-side*.25)}}}}
 else{branch(0,0,-8,-230,12);for(let i=0;i<16;i++){const angle=-Math.PI+.2+i/15*(Math.PI-.4);const dx=Math.cos(angle)*(70+rand(i+seed)*65);const dy=-190+Math.sin(angle)*(type==='acacia'?45:115);branch(-3,-160,dx,dy,3+rand(i)*2);for(let k=0;k<11;k++){const xx=dx+(rand(i*13+k+seed)-.5)*65;const yy=dy+(rand(i*7+k)-.5)*(type==='acacia'?24:65);leaf(xx,yy,10+rand(k)*15,5+rand(k+i)*10,rand(k)*2)}}}
 cache.set(key,el);return el;
}
