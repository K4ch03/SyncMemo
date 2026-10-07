export type MemoView={kind:'list'}|{kind:'note';id:string};
export function memoView(state:unknown,hash:string):MemoView|null {
 const match=/^#note=([0-9a-f-]{36})$/i.exec(hash);
 if(match)return {kind:'note',id:match[1]};
 if(hash==='#notes')return {kind:'list'};
 const value=state as {syncMemoNote?:unknown;syncMemoView?:unknown}|null;
 if(typeof value?.syncMemoNote==='string')return {kind:'note',id:value.syncMemoNote};
 if(value?.syncMemoView==='list')return {kind:'list'};
 return null;
}
