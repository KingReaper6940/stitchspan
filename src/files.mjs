export async function readUTF8(file,limit){
 if(!file||file.size>limit)throw Error('File exceeds the allowed byte size.');
 return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());
}
export function downloads(document){
 let last;
 return {save(name,type,text){
  if(last)URL.revokeObjectURL(last);
  const url=URL.createObjectURL(new Blob([text],{type}));last=url;
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 },dispose(){if(last)URL.revokeObjectURL(last);last=undefined}};
}
