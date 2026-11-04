# Extracted FE marker windows from portable D2CsWkmv.js

## __ZG_COSTUME_GEN_OPTS @ 158759
```
cos.id)),onClick:i=>zgGenCostumeImage(cos.id,(function(){try{if(typeof window!=="undefined"&&window.__ZG_COSTUME_GEN_OPTS)return window.__ZG_COSTUME_GEN_OPTS;if(typeof localStorage!=="undefined"&&localStorage.getItem("ZG_COSTUME_DEV_MOCK")==="1")return{mock:!0}}catch(e){}return{}
```

## ZG_COSTUME_DEV_MOCK @ 158877
```
PTS)return window.__ZG_COSTUME_GEN_OPTS;if(typeof localStorage!=="undefined"&&localStorage.getItem("ZG_COSTUME_DEV_MOCK")==="1")return{mock:!0}}catch(e){}return{}})())},l((((e(zgCostumePending)||[]).some(function(x){return Number(x)===Number(cos.id)}))||zgCostumeIsBusy(cos.id))?"
```

## result_source @ 34415
```
_message||"生成失败",error:c.error_message||"生成失败"});zgCosPendDel(c.id)}else if(has){const src=String(c.result_source||c.resultSource||c.image_source||c.imageSource||"").toLowerCase();if(src==="model"){zgSetCostumeStatus(c.id,{state:"ready",msg:"已生成",error:""});}else{zgSetCostumeStat
```

## zgPollCostumeJob @ 40668
```
rationId||genRes.id||genRes.task_id);x.success("服装图生成任务已提交");if(charId)await zgLoadCostumes(charId);zgPollCostumeJob(id,charId,genId,beforePath,{tries:60,gap:1500});}catch(err){const msg=(err&&(err.message||err.msg))||"服装生成失败";zgSetCostumeStatus(id,{state:"error",msg:msg,error:ms
```

## zgMarkCostumeGenerating @ 38919
```
path||beforeItem.localPath||beforeItem.image_url||beforeItem.imageUrl))||"");zgCostumeBusy.value=!0;zgMarkCostumeGenerating(id);try{await Fo(0)}catch(_t){}try{const rowRef=(zgCostumeList.value||[]).find(function(u){return Number(u.id)===Number(id)});const useRef=rowRef?!(rowRef.u
```

## zgSelectCostume @ 36794
```
e=cached.slice()}}catch(e2){L(e2)}}catch(err){L(err)}finally{zgCostumeBusy.value=!1}}async function zgSelectCostume(id){if(!id)return;if(zgCostumeBusy.value){try{x.warning("操作进行中，请稍候")}catch(e0){}return;}zgCostumeBusy.value=!0;try{const selected=await zgCostume.select(id);const c
```

## zgGenCostumeImage @ 38480
```
ssage);if(msg)return String(msg)}}catch(e){}return s.length>220?s.slice(0,220)+"…":s}async function zgGenCostumeImage(id,opts){if(!id||!M.value){x.warning("缺少剧集上下文");return}if(zgCosPend(id)){x.warning("服装生成进行中，请稍候");return}opts=opts||{};const charId=m.value&&m.value.item&&m.value
```

