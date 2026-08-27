(function(){
function load(){fetch('/api/alerts',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var el=document.getElementById('channelsList');if(!d.length){el.textContent='No channels.';return;}
var h='';for(var i=0;i<d.length;i++)h+='<div class="card" style="margin-bottom:8px;padding:10px;font-size:12px"><strong>'+(d[i].name||'?')+'</strong> ('+(d[i].type||'?')+') <button class="button2 danger" onclick="rm('+d[i].id+')">X</button></div>';
el.innerHTML=h;
}).catch(function(){});}
window.rm=function(id){if(!confirm('Del?'))return;fetch('/api/alerts/'+id,{method:'DELETE',credentials:'include'}).then(load).catch(function(){});};
document.getElementById('addChannelBtn').onclick=function(){
var t=document.getElementById('channelType').value,n=document.getElementById('channelName').value.trim();if(!n){alert('Name?');return;}
var b={type:t,name:n,config:{}};
if(t==='webhook'||t==='discord')b.config.url=prompt('URL:')||'';
if(t==='telegram'){b.config.token=prompt('Token:')||'';b.config.chatId=prompt('ChatID:')||'';}
if(t==='email'){b.config.smtpHost=prompt('SMTP host:')||'';b.config.smtpPort=Number(prompt('Port:')||'587');b.config.smtpUser=prompt('User:')||'';b.config.smtpPass=prompt('Pass:')||'';b.config.to=prompt('To:')||'';}
fetch('/api/alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),credentials:'include'}).then(function(){load();document.getElementById('channelName').value='';}).catch(function(){});
};
function hist(){fetch('/api/alerts/history',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var el=document.getElementById('alertLog');if(!d.length){el.textContent='No alerts.';return;}
var h='';for(var i=0;i<d.length;i++)h+='<div style="margin-bottom:4px;font-size:11px"><span style="color:var(--dim)">'+(d[i].timestamp||'')+'</span> <span style="color:'+(d[i].type==='down'?'var(--err)':'var(--acc)')+'">'+(d[i].device_name||'?')+' '+(d[i].type||'?')+'</span></div>';
el.innerHTML=h;
}).catch(function(){});}
function maint(){fetch('/api/maintenance',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var el=document.getElementById('maintList');if(!d.length){el.textContent='No windows.';return;}
var h='';for(var i=0;i<d.length;i++)h+='<div style="margin-bottom:6px;padding:8px;font-size:12px"><strong>'+(d[i].device_name||'?')+'</strong> '+d[i].start+'-'+d[i].end+' <button class="button2 danger" onclick="rmM('+d[i].id+')">X</button></div>';
el.innerHTML=h;
}).catch(function(){});}
window.rmM=function(id){fetch('/api/maintenance/'+id,{method:'DELETE',credentials:'include'}).then(maint).catch(function(){});};
document.getElementById('addMaintBtn').onclick=function(){
var dv=document.getElementById('maintDevice').value,s=document.getElementById('maintStart').value,e=document.getElementById('maintEnd').value,n=document.getElementById('maintNote').value.trim();
if(!dv||!s||!e){alert('Fill');return;}
fetch('/api/maintenance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:dv,start:s,end:e,note:n}),credentials:'include'}).then(maint).catch(function(){});
};
fetch('/devices',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var s=document.getElementById('maintDevice');for(var i=0;i<d.length;i++){var o=document.createElement('option');o.value=d[i].id;o.textContent=d[i].name;s.appendChild(o);}
}).catch(function(){});
load();hist();maint();
})();
