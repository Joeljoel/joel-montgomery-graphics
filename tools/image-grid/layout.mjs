export function layout(count,width,height,ratios=[],gap=12){
 let best={columns:1,rows:count,score:-Infinity};
 for(let columns=1;columns<=count;columns++){
  const rows=Math.ceil(count/columns),w=(width-gap*(columns-1))/columns,h=(height-gap*(rows-1))/rows;
  if(w<=0||h<=0)continue;
  const area=(ratios.length?ratios:Array(count).fill(1)).reduce((sum,r)=>sum+Math.min(w,h*r)*Math.min(h,w/r),0);
  // Prefer fuller rows when image sizes are comparable, while respecting viewport shape.
  const score=area*(count/(columns*rows))**0.7;
  if(score>best.score)best={columns,rows,score};
 }return best;
}
