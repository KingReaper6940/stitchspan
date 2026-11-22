export const METHODS=Object.freeze({m1:{label:'M1 — between stitches',consume:0,produce:1,delta:1},kfb:{label:'KFB — one becomes two',consume:1,produce:2,delta:1},k2tog:{label:'K2tog — two become one',consume:2,produce:1,delta:-1}});
export function validate(p){
 const keys=['schema','title','start','target','mode','method','left','right','notes'];
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join('|')!==keys.sort().join('|')||p.schema!=='stitchspan/1')throw Error('Expected a Stitchspan version 1 project.');
 for(const [key,max] of [['title',100],['notes',4000]])if(typeof p[key]!=='string'||p[key].length>max||!p[key].isWellFormed())throw Error(key+' exceeds its text limit or contains an unpaired surrogate.');
 for(const [key,min,max] of [['start',1,1000],['target',1,2000],['left',0,1000],['right',0,1000]])if(!Number.isInteger(p[key])||p[key]<min||p[key]>max)throw Error(key+' must be an integer from '+min+' to '+max+'.');
 if(!['flat','round'].includes(p.mode)||!Object.hasOwn(METHODS,p.method))throw Error('Choose a supported mode and technique.');
 if(p.left+p.right>p.start)throw Error('Protected edge counts exceed the starting stitches.');
 if(p.mode==='round'&&(p.left||p.right))throw Error('Rounds have no protected edges. Set both edge counts to zero.');
 const changes=Math.abs(p.target-p.start),method=METHODS[p.method],interior=p.start-p.left-p.right;
 if(changes>250)throw Error('At most 250 changes per plan.');
 if(changes&&(p.target-p.start)*method.delta<0)throw Error('Technique direction does not match the target stitch count.');
 if(changes&&method.consume*changes>interior)throw Error('Not enough unprotected source stitches for this technique.');
 if(changes&&p.method==='m1'&&interior<changes+(p.mode==='flat'?1:0))throw Error('M1 needs distinct gaps between source stitches: leave at least one plain stitch in every gap.');
 return structuredClone(p);
}
export function integerInput(text){
 if(!/^(0|[1-9][0-9]*)$/.test(text))throw Error('Use whole decimal stitch counts, without signs, spaces or exponents.');
 return Number(text);
}
export function page(items,n,size=20){
 const pages=Math.max(1,Math.ceil(items.length/size)),current=Math.max(0,Math.min(Number.isInteger(n)?n:0,pages-1));
 return {items:items.slice(current*size,(current+1)*size),current,pages};
}
