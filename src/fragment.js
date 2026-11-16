// Choose a small painted detail, never a blank white corner of an illustration.
export function chooseFragment(pixels,width,height,level=0){
 const ink=(x,y)=>{const i=(y*width+x)*4;return pixels[i+3]>100&&Math.min(pixels[i],pixels[i+1],pixels[i+2])<226};
 let left=width,top=height,right=0,bottom=0;
 const stride=Math.max(1,Math.floor(Math.min(width,height)/320));
 for(let y=0;y<height;y+=stride)for(let x=0;x<width;x+=stride)if(ink(x,y)){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 if(right<=left||bottom<=top)return{x:0,y:0,size:Math.min(width,height)};
 const size=Math.max(16,Math.round(Math.min(right-left,bottom-top)*Math.max(.13,.24-level*.018)));
 const candidates=[];
 for(let r=0;r<18;r++)for(let c=0;c<18;c++){
  const x=Math.round(left+(right-left-size)*c/17),y=Math.round(top+(bottom-top-size)*r/17);let count=0,sum=0,squared=0,total=0;
  const step=Math.max(1,Math.floor(size/12));
  for(let dy=0;dy<size;dy+=step)for(let dx=0;dx<size;dx+=step){const i=((y+dy)*width+x+dx)*4,luma=(pixels[i]+pixels[i+1]+pixels[i+2])/3;total++;if(ink(x+dx,y+dy))count++;sum+=luma;squared+=luma*luma}
  const density=count/total,variance=squared/total-(sum/total)**2;
  if(density>.3&&density<.94&&variance>90)candidates.push({x,y,size,score:variance});
 }
 candidates.sort((a,b)=>b.score-a.score);
 return candidates.length?candidates[Math.floor(Math.random()*Math.min(18,candidates.length))]:{x:Math.round((left+right-size)/2),y:Math.round((top+bottom-size)/2),size};
}
export function paintFragment(canvas,image,level){
 const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;
 const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const crop=chooseFragment(ctx.getImageData(0,0,source.width,source.height).data,source.width,source.height,level);
 canvas.width=canvas.height=240;canvas.getContext('2d').drawImage(source,crop.x,crop.y,crop.size,crop.size,0,0,240,240);
}
