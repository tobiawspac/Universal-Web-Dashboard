(function(){
function stats(){
fetch('/api/dashboard-summary',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var on=0,off=0,tu=0;
for(var i=0;i<d.length;i++){if(d[i].live&&d[i].live.alive)on++;else off++;if(d[i].summary&&d[i].summary.uptimePercent)tu+=d[i].summary.uptimePercent;}
document.getElementById('widgetOnline').textContent=on;
document.getElementById('widgetOffline').textContent=off;
document.getElementById('widgetTotal').textContent=d.length;
document.getElementById('widgetAvgUptime').textContent=(d.length?(tu/d.length).toFixed(1):'0')+'%';
}).catch(function(){});
}
function pw(){
fetch('/api/plugins',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var el=document.getElementById('pluginWidgets');
if(!d.length){el.textContent='No plugins.';return;}
var h='';for(var i=0;i<d.length;i++)h+='<div class="card" style="margin-bottom:8px;padding:10px;font-size:12px"><strong>'+d[i].name+'</strong> v'+d[i].version+'</div>';
el.innerHTML=h;
}).catch(function(){});
}
function graf(){
fetch('/api/dashboard-summary',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var cv=document.getElementById('latencyChart');if(!cv)return;
var c=cv.getContext('2d'),w=cv.width,h=cv.height;
c.clearRect(0,0,w,h);c.fillStyle='#0d0d0d';c.fillRect(0,0,w,h);
var mx=0;for(var i=0;i<d.length;i++)if(d[i].live&&d[i].live.latencyMs&&d[i].live.latencyMs>mx)mx=d[i].live.latencyMs;
if(!mx)mx=100;
var bw=w/d.length;
for(var j=0;j<d.length;j++){
var l=(d[j].live&&d[j].live.latencyMs)||0,bh=(l/mx)*(h-20),x=j*bw,y=h-bh-10;
c.fillStyle=d[j].live&&d[j].live.alive?'#c084fc':'#f87171';c.fillRect(x+2,y,bw-4,bh);
c.fillStyle='#e0e0e0';c.font='10px monospace';c.fillText(d[j].name.substring(0,8),x+2,h-2);
}
}).catch(function(){});
}
stats();pw();graf();
})();
