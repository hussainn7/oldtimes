import type {Species} from './types';
// Procedural articulated silhouettes keep wildlife crisp at every screen size.
export function drawAnimal(c:CanvasRenderingContext2D,s:Species,x:number,y:number,t:number,facing:number,alert:boolean){
 c.save();c.translate(x,y);c.scale(s.size*facing,s.size);c.fillStyle=s.color;c.strokeStyle=s.color;c.lineCap='round';c.lineJoin='round';
 const e=(x:number,y:number,rx:number,ry:number,col=s.color)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
 const p=(pts:number[][],col=s.color)=>{c.fillStyle=col;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()};
 const line=(pts:number[][],width:number,col=s.color)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()};
 const step=Math.sin(t*3); const legs=(len:number,spread:number)=>{for(let i=0;i<4;i++){const xx=(i%2?1:-1)*spread+(i>1?8:-3);const shift=Math.sin(t*3+i*2)*6;line([[xx,-len],[xx+shift,-len*.45],[xx+shift*1.5,0]],i>1?8:11,i>1?'#344b43':s.color)}};
 e(0,4,s.kind==='sauropod'?88:42,5,'#071b2530');
 if(s.kind==='sauropod'){legs(51,28);e(-6,-70,62,32);c.strokeStyle=s.color;c.lineWidth=22;c.beginPath();c.moveTo(36,-76);c.bezierCurveTo(66,-100,47,-160,67,-178);c.stroke();e(76,-179,15,8);p([[-55,-77],[-110,-59],[-161,-61],[-108,-49],[-36,-52]]);e(82,-181,1.7,1.7,'#182e2b');e(-14,-80,43,11,'#a5b39420');line([[53,-83],[59,-137],[72,-168]],3,'#a6b89433')}
 else if(s.kind==='theropod'){line([[-10,-35],[-20,-15],[-12,0]],12);line([[13,-38],[27,-20],[19,0]],11);e(0,-52,38,24);p([[-30,-61],[-110,-45],[-37,-39]]);line([[23,-61],[47,-83]],19);e(59,-86,25,13);p([[44,-80],[79,-79],[74,-71],[49,-73]],'#71816a');line([[29,-57],[39+step*2,-45]],5);e(65,-90,2,2,'#192c27');line([[62,-78],[80,-79]],2,'#21392f')}
 else if(s.kind==='mammoth'){legs(44,25);e(-5,-68,49,43);e(37,-78,29,32);e(33,-91,19,21,'#5c6552');line([[55,-66],[62,-35],[58,-10],[70,-13]],12);c.strokeStyle='#ded6b3';c.lineWidth=5;c.beginPath();c.moveTo(44,-55);c.quadraticCurveTo(92,-20,85,-56);c.stroke();line([[-46,-62],[-53,-37]],4);for(let i=0;i<18;i++)line([[-42+i*4,-59],[-41+i*4,-35+Math.sin(i)*7]],2,'#465746');e(51,-86,2,2,'#142d28')}
 else if(s.kind==='stegosaur'||s.kind==='ceratopsian'){legs(24,28);e(-4,-43,50,25);e(48,-32,23,15);p([[-46,-47],[-104,-35],[-41,-27]]);if(s.kind==='stegosaur'){for(let i=0;i<8;i++){const xx=-42+i*12;const yy=-50-Math.sin(i/8*Math.PI)*17;p([[xx,yy],[xx-6,yy-20],[xx+5,yy-34],[xx+13,yy-7]],'#86907a')}}else{e(31,-44,12,28);p([[48,-43],[77,-62],[56,-39]],'#d6cfad');p([[63,-35],[83,-42],[65,-29]],'#d6cfad')}e(57,-35,2,2,'#18342a')}
 else if(s.kind==='pterosaur'||s.kind==='bird'){e(0,-5,14,6);const flap=Math.sin(t*4)*16; p([[-7,-7],[-38,-28+flap],[-70,-15+flap],[-28,-7],[0,1]]);p([[3,-8],[29,-28+flap],[64,-17+flap],[25,-5],[0,1]]);line([[9,-6],[17,-17]],4);p([[14,-17],[34,-14],[16,-11]]);p([[-10,-5],[-27,3],[-8,1]])}
 else if(s.kind==='fish'){e(0,-15,30,12);p([[-23,-16],[-47,-31],[-43,-7]]);p([[-3,-24],[7,-39],[14,-22]]);e(21,-17,2,2,'#d7dcc6');line([[-20,-15],[12,-12]],1,'#b9c4a2')}
 else if(s.kind==='trilobite'){e(0,-10,33,13);for(let i=-25;i<30;i+=6){line([[i,-18],[i+2,-3]],2,'#a8aa87');line([[i,-3],[i+step*2,3]],2)}}
 else if(s.kind==='insect'){e(0,-5,15,4);e(15,-7,5,5);for(let i=0;i<3;i++)line([[-8+i*7,-4],[-15+i*10,5+step*2]],1);e(-3,-12,20,5,'#dce2bd66');e(0,-17+step*3,18,5,'#dce2bd55')}
 else if(s.kind==='amphibian'){e(0,-18,37,13);e(35,-18,18,9);p([[-30,-23],[-74,-13],[-30,-13]]);for(let i of [-1,1])line([[i*22,-17],[i*30,-6],[i*39,-2]],5);e(41,-21,2,2,'#d1d7ae')}
 else{const cat=s.kind==='cat';legs(cat?23:38,22);e(0,cat?-34:-49,32,17);line([[22,cat?-35:-50],[32,cat?-42:-71]],cat?13:10);e(39,cat?-43:-73,13,8);p([[31,cat?-49:-79],[31,cat?-61:-94],[38,cat?-49:-77]]);line([[-29,cat?-36:-50],[-48,cat?-41:-40],[-58,cat?-32:-44]],cat?4:3);if(!cat){line([[34,-80],[27,-101],[21,-110]],2);line([[29,-96],[16,-102]],2)}e(44,cat?-45:-75,1.5,1.5,'#102f27')}
 if(alert){c.fillStyle='#ebca8a';c.font='bold 17px Arial';c.textAlign='center';c.fillText('!',0,s.kind==='sauropod'?-210:-115)}c.restore();
}
