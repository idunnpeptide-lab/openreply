import crypto from "node:crypto";

const api = process.env.SUPOCLIP_API_URL;
const secret = process.env.SUPOCLIP_AUTH_SECRET;
const userId = process.env.SUPOCLIP_USER_ID || "replyhalo-engine-user";
const sourceUrl = process.env.SMOKE_SOURCE_URL || "https://www.youtube.com/watch?v=jNQXAC9IVRw";
if (!api || !secret) throw new Error("Missing SupoClip config");

function headers(json=false){
  const ts=Math.floor(Date.now()/1000).toString();
  const sig=crypto.createHmac("sha256",secret).update(`${userId}:${ts}`).digest("hex");
  return {
    "x-supoclip-user-id":userId,
    "x-supoclip-ts":ts,
    "x-supoclip-signature":sig,
    ...(json?{"content-type":"application/json"}:{})
  };
}
async function req(path, init={}){
  const res=await fetch(api.replace(/\/$/,"")+path,{...init,headers:{...headers(Boolean(init.body)),...(init.headers||{})}});
  const text=await res.text();
  let body; try{body=JSON.parse(text)}catch{body=text}
  if(!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0,1000)}`);
  return body;
}

console.log("workflows", JSON.stringify(await req("/tasks/workflows")));
const created=await req("/tasks/",{method:"POST",body:JSON.stringify({source:{url:sourceUrl},workflow:"highlights",clip_length:"short"})});
const taskId=created.id;
if(!taskId) throw new Error("Task ID missing");
console.log("task-created",taskId);

let task=created;
for(let i=0;i<120;i++){
  await new Promise(r=>setTimeout(r,5000));
  task=await req(`/tasks/${taskId}`);
  console.log("task",task.status,task.progress,task.progress_message||"");
  const s=String(task.status||"").toLowerCase();
  if(["completed","complete","done"].includes(s)) break;
  if(["error","failed","cancelled"].includes(s)) throw new Error("Task failed: "+JSON.stringify(task));
}
const clips=await req(`/tasks/${taskId}/clips`);
const list=Array.isArray(clips)?clips:(clips.clips||[]);
console.log("clips-count",list.length);
if(!list.length) throw new Error("No clips generated");
console.log("first-clip",JSON.stringify({
 id:list[0].id,
 virality_score:list[0].virality_score,
 hook_score:list[0].hook_score,
 video_url:list[0].video_url,
 text:String(list[0].text||"").slice(0,200)
}));
const file=await fetch(api.replace(/\/$/,"")+`/tasks/${taskId}/clips/${list[0].id}/file`,{headers:headers()});
if(!file.ok) throw new Error("Clip file failed "+file.status);
console.log("clip-file",file.status,file.headers.get("content-type"),file.headers.get("content-length"));
