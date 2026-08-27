(function(){
var box=document.getElementById('devices'),q=document.getElementById('q'),devs=[];
function load(){return fetch('/api/dashboard-summary',{credentials:'include'}).then(function(r){return r.json();}).catch(function(){return[];});}
function card(d){
var el=document.createElement('div'),a=d.live&&d.live.alive;
el.className='device-card'+(a?'':' offline');
var u=d.summary&&d.summary.totalChecks?d.summary.uptimePercent+'%':'—';
var l=a?(d.live.latencyMs!=null?d.live.latencyMs+' ms':'ok'):'off';
el.innerHTML='<div class="device-card-top"><span class="device-card-ip">'+(d.type||'?')+'</span><span class="status-dot"></span></div>'
+'<div class="device-card-name">'+d.name+'</div><div class="device-card-ip">'+d.ip+'</div>'
+'<div class="device-card-meta"><span>'+l+'</span><span>'+u+'</span></div>'
+'<div class="device-card-actions"><button class="button2 open-btn" style="flex:1">Open</button></div>';
var go=function(){location.href='device_page.html?name='+encodeURIComponent(d.name)+'&ip='+encodeURIComponent(d.ip)+'&type='+encodeURIComponent(d.type||'router');};
el.onclick=function(e){if(e.target.tagName==='BUTTON')return;go();};
el.querySelector('.open-btn').onclick=go;
return el;
}
function f(){var v=q.value.toLowerCase().trim(),o=[];if(!v)return devs;for(var i=0;i<devs.length;i++){var x=devs[i];if((x.name||'').toLowerCase().indexOf(v)>=0||(x.ip||'').indexOf(v)>=0||(x.type||'').indexOf(v)>=0)o.push(x);}return o;}
function render(){
load().then(function(s){
devs=s;box.innerHTML='';
document.getElementById('emptyState').style.display='none';
var on=0;for(var i=0;i<devs.length;i++)if(devs[i].live&&devs[i].live.alive)on++;
document.getElementById('summaryOnline').innerHTML='<span class="status-dot"></span>Online: '+on;
document.getElementById('summaryOffline').textContent='Offline: '+(devs.length-on);
if(!devs.length){document.getElementById('emptyState').style.display='';return;}
var fl=f();if(!fl.length){box.innerHTML='<p class="mono muted" style="padding:12px;text-align:center">No match</p>';return;}
for(var j=0;j<fl.length;j++)box.appendChild(card(fl[j]));
});
}
document.getElementById('refreshBtn').onclick=render;
q.oninput=function(){box.innerHTML='';if(!devs.length)return;var fl=f();if(!fl.length){box.innerHTML='<p class="mono muted" style="padding:12px;text-align:center">No match</p>';return;}for(var i=0;i<fl.length;i++)box.appendChild(card(fl[i]));};
document.getElementById('exportBtn').onclick=function(){fetch('/devices',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){var b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='export.json';a.click();}).catch(function(){});};
document.getElementById('demoLink').onclick=function(e){e.preventDefault();render();};
try{var s=io();s.on('device:update',render);}catch(e){}
render();
})();
