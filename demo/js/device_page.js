(function(){
var p=new URLSearchParams(window.location.search),dn=p.get('name')||'',di=p.get('ip')||'',dt=p.get('type')||'';
document.getElementById('deviceName').textContent=dn;
document.getElementById('deviceIP').textContent=di;
document.getElementById('deviceType').textContent='Type: '+dt;
function info(){
fetch('/summary/'+encodeURIComponent(dn),{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
document.getElementById('statsCard').style.display='';
document.getElementById('statUptime').textContent='Uptime: '+(d.uptimePercent||0)+'%';
document.getElementById('statLatency').textContent='Latency: '+(d.avgLatencyMs||0)+' ms';
document.getElementById('statStatus').textContent='Status: '+(d.lastStatus||'?');
}).catch(function(){});
}
function hist(){
fetch('/history/'+encodeURIComponent(dn),{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
document.getElementById('historyCard').style.display='';
var cv=document.getElementById('historyChart');if(!cv)return;
var c=cv.getContext('2d'),w=cv.width,h=cv.height;
c.clearRect(0,0,w,h);c.fillStyle='#0d0d0d';c.fillRect(0,0,w,h);
if(!d.length)return;
var mx=0;for(var i=0;i<d.length;i++)if(d[i].latency_ms>mx)mx=d[i].latency_ms;
if(!mx)mx=100;
var sx=w/d.length;c.beginPath();c.strokeStyle='#c084fc';c.lineWidth=2;
for(var j=0;j<d.length;j++){var x=j*sx,y=h-(d[j].latency_ms/mx)*(h-20)-10;if(j===0)c.moveTo(x,y);else c.lineTo(x,y);}
c.stroke();
}).catch(function(){});
}
function snmp(){
fetch('/api/snmp/'+encodeURIComponent(dn),{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
if(!d||!d.length)return;
document.getElementById('snmpCard').style.display='';
var h='<table class="data-table"><tr><th>Iface</th><th>MAC</th><th>Speed</th></tr>';
for(var i=0;i<d.length;i++)h+='<tr><td>'+d[i].name+'</td><td>'+(d[i].mac||'?')+'</td><td>'+(d[i].speed||'?')+'</td></tr>';
document.getElementById('snmpInterfaces').innerHTML=h+'</table>';
}).catch(function(){});
}
document.getElementById('pingBtn').onclick=function(){
var b=this;b.disabled=true;b.textContent='Ping...';
fetch('/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:di,timeout:5000}),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){if(r.alive)alert(di+' alive ('+r.latencyMs+' ms)');else alert(di+' down');})
.catch(function(){alert('Err');}).finally(function(){b.disabled=false;b.textContent='Ping';});
};
document.getElementById('backButton').onclick=function(){location.href='index.html';};
info();hist();snmp();
})();
