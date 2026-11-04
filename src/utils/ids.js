export function uid(prefix='id'){
  try{
    if(globalThis.crypto?.randomUUID)return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }catch{}
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
}

export function nextSequence(items=[],start=1000){
  return Math.max(start,...items.map(x=>Number(x?.id)||0))+1;
}
