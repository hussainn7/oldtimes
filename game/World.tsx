'use client';
import { useEffect, useRef } from 'react';
import type { Period, Region, WorldHandle } from './types';
export const WORLD_WIDTH = 6200;
const noise=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
export default function World({period,region,active,onExplore,worldRef,direction}:{period:Period;region:Region;active:boolean;onExplore:(distance:number)=>void;worldRef:React.MutableRefObject<WorldHandle>;direction:React.MutableRefObject<number>}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const props=useRef({period,region,active,onExplore});props.current={period,region,active,onExplore};
 useEffect(()=>{
  const el=canvas.current!;const c=el.getContext('2d')!;let w=0,h=0,frame=0,last=0,time=0,camera=0,reported=0;const keys=new Set<string>();
  const resize=()=>{w=el.clientWidth;h=el.clientHeight;const d=Math.min(devicePixelRatio,2);el.width=w*d;el.height=h*d;c.setTransform(d,0,0,d,0,0)};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const down=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,select,button,[role="dialog"]'))return;if(['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)){keys.add(e.key.toLowerCase());e.preventDefault()}};
  const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());const blur=()=>{keys.clear();direction.current=0};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  const path=(points:number[][],fill:string)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill()};
  const ellipse=(x:number,y:number,rx:number,ry:number,color:string)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fill()};
  const tree=(x:number,y:number,s:number,color:string,fern=false)=>{c.save();c.translate(x,y);c.scale(s,s);const sway=Math.sin(time*.5+x)*3;c.fillStyle=color;c.fillRect(-3,-115,6,115);if(fern){for(let i=0;i<9;i++){const a=(i/8)*Math.PI; c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(0,-65);c.quadraticCurveTo(Math.cos(a)*55,-140,Math.cos(a)*90,-70+Math.sin(a)*-25);c.stroke();for(let j=1;j<7;j++){const q=j/7;path([[Math.cos(a)*90*q,-65-60*Math.sin(q*Math.PI)],[Math.cos(a)*90*q+18,-65-60*Math.sin(q*Math.PI)+12],[Math.cos(a)*90*q-4,-65-60*Math.sin(q*Math.PI)+22]],color)}}}else{for(let i=0;i<5;i++){const yy=-150+i*24;path([[sway,yy],[40+i*8,yy+65],[-40-i*8,yy+65]],color)}}c.restore()};
  function draw(now:number){const dt=Math.min((now-last)/1000||0,.04);last=now;if(!document.hidden)time+=dt;const {period:p,region:r,active:a}=props.current;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const t=reduced?0:time;
   const move=a?((keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)||direction.current):0;
   const state=worldRef.current;const previous=state.x;state.x=Math.max(100,Math.min(WORLD_WIDTH-100,state.x+move*180*dt));state.moving=move!==0;state.distance+=Math.abs(state.x-previous);if(state.distance-reported>70){reported=state.distance;props.current.onExplore(state.distance)}camera+=(state.x-w*.39-camera)*Math.min(1,dt*3);camera=Math.max(0,Math.min(WORLD_WIDTH-w,camera));
   const ground=h*.79;const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,p.sky[0]);sky.addColorStop(1,p.sky[1]);c.fillStyle=sky;c.fillRect(0,0,w,h);
   const sunX=w*.72-camera*.025;const glow=c.createRadialGradient(sunX,h*.29,5,sunX,h*.29,h*.6);glow.addColorStop(0,p.biome==='volcanic'?'#fa863155':'#f3e6b23b');glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(0,0,w,h);ellipse(sunX,h*.29,32,32,p.biome==='ash'?'#aa977e':'#f3e5bbaa');
   for(let l=0;l<4;l++){const pts:number[][]=[[0,h]];for(let x=-100;x<w+120;x+=60){const xx=x+camera*(.08+l*.08);pts.push([x,h*(.44+l*.08)+Math.sin(xx*.004+l*2)*h*.065+Math.sin(xx*.01+l)*h*.035])}pts.push([w,h]);path(pts,['#7a989366','#587d7866','#365f5b88',p.land][l]);}
   const water=p.biome==='ocean'||r.id==='coast';if(water||p.biome==='jurassic'||p.biome==='swamp'){c.fillStyle=p.biome==='ocean'?'#327e8399':'#709f9280';c.beginPath();c.moveTo(w*.6-camera*.1,h*.6);c.bezierCurveTo(w*.9,h*.65,w*.3,h*.71,w*.65,h);c.lineTo(w,h);c.bezierCurveTo(w*.6,h*.72,w,h*.67,w*.66-camera*.1,h*.6);c.fill();c.strokeStyle='#c8ddd34a';for(let i=0;i<26;i++){const y=h*.63+i*9;const x=(noise(i)*w+t*(5+i%3))%w;c.beginPath();c.moveTo(x,y);c.lineTo(x+12+i*2,y);c.stroke()}}
   if(!['volcanic','ocean','ash','ice'].includes(p.biome)){for(let l=0;l<2;l++)for(let i=0;i<55;i++){let x=i*145-camera*(.36+l*.28);if(x < -200||x>w+200)continue;let y=h*(.67+l*.12)+noise(i+8)*35;tree(x,y,.4+noise(i)*.5+l*.3,l?'#1c4138':'#355c51',p.biome==='swamp'||p.biome==='savanna')}}
   path([[0,ground+40],[w,ground+20],[w,h],[0,h]],p.biome==='ice'?'#c0d5d2':p.biome==='volcanic'?'#28282a':p.land);
   for(let i=0;i<70;i++){const x=i*100-camera; if(x < -150||x>w+150)continue;const y=ground+40+noise(i)*h*.19;ellipse(x,y,12+noise(i+1)*30,3+noise(i)*8,p.biome==='ice'?'#a4c0c3':'#0d29293b');if(p.biome==='volcanic'){path([[x,y],[x+85,y+10],[x+20,y+20],[x+130,y+27]],'#e36e32')}else if(p.biome!=='ocean'&&p.biome!=='ash'){c.strokeStyle=p.biome==='ice'?'#698789':'#57836a';for(let j=0;j<6;j++){c.beginPath();c.moveTo(x+j*3,y);c.lineTo(x+j*3+Math.sin(t+x)*2-6,y-10-noise(i+j)*16);c.stroke()}}}
   // The explorer remains legible against every environment.
   const px=state.x-camera,py=ground+23;ellipse(px,py+5,17,4,'#08222460');c.save();c.translate(px,py);c.strokeStyle='#182c2c';c.lineWidth=5;c.lineCap='round';for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*3,-17);c.lineTo(sign*5+Math.sin(t*10)*sign*(move?8:0),0);c.stroke()}c.fillStyle='#dcc699';c.fillRect(-8,-41,16,25);c.fillStyle='#546c5d';c.fillRect(-12,-38,6,18);ellipse(0,-48,7,8,'#dbc4a1');ellipse(0,-52,12,3,'#ece0bd');c.restore();
   c.fillStyle='#f3ecda';c.font='10px sans-serif';c.textAlign='center';c.fillText('YOU',px,py-70);
   for(let i=0;i<23;i++){const x=(noise(i+70)*w+t*(3+i%4))%w,y=noise(i+90)*h*.7;c.globalAlpha=.15+noise(i)*.25;ellipse(x,y+Math.sin(t+i)*8,1.3,1.3,p.biome==='volcanic'?'#ffaf58':'#e7e7c9')}c.globalAlpha=1;
   frame=requestAnimationFrame(draw);
  }frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)};
 },[worldRef,direction]);
 return <canvas ref={canvas} className="world" aria-label={`${period.name} landscape. Move with A and D or the arrow keys.`}/>;
}
