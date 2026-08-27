(function(){
var scanning=false,results=[];
function subnets(){fetch('/api/discovery/subnets',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var s=document.getElementById('subnetSelect');s.innerHTML='';if(!d.length){s.innerHTML='<option value="">None</option>';return;}
for(var i=0;i<d.length;i++){var o=document.createElement('option');o.value=d[i].cidr;o.textContent=d[i].cidr+' ('+d[i].interface+')';s.appendChild(o);}
}).catch(function(){document.getElementById('subnetSelect').innerHTML='<option value="">Err</option>';});}
function show(d){var el=document.getElementById('resultsTable');if(!d.length){el.innerHTML='Nothing found.';return;}
var h='<table class="data-table"><tr><th>IP</th><th>MAC</th><th>Vendor</th><th></th></tr>';
for(var i=0;i<d.length;i++)h+='<tr><td>'+d[i].ip+'</td><td>'+(d[i].mac||'?')+'</td><td>'+(d[i].vendor||'?')+'</td><td style="text-align:center"><input type="checkbox" class="disc-check" data-idx="'+i+'"></td></tr>';
el.innerHTML=h+'</table>';}
function scan(){if(scanning)return;scanning=true;
var cidr=document.getElementById('cidrInput').value.trim()||document.getElementById('subnetSelect').value;
if(!cidr){alert('Subnet?');scanning=false;return;}
document.getElementById('scanProgress').style.display='';document.getElementById('scanBtn').disabled=true;
document.getElementById('resultsTable').innerHTML='Scanning...';
fetch('/api/discovery/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cidr:cidr}),credentials:'include'})
.then(function(r){return r.json();}).then(function(d){results=d;show(d);scanning=false;document.getElementById('scanBtn').disabled=false;})
.catch(function(){document.getElementById('resultsTable').innerHTML='Failed';scanning=false;document.getElementById('scanBtn').disabled=false;});}
document.getElementById('scanBtn').onclick=scan;
document.getElementById('adoptBtn').onclick=function(){var c=document.querySelectorAll('.disc-check:checked');
if(!c.length){alert('Check device');return;}var d=results[parseInt(c[0].getAttribute('data-idx'),10)];if(!d)return;
document.getElementById('adoptIp').value=d.ip;document.getElementById('adoptName').value='';document.getElementById('adoptDialog').classList.add('open');};
document.getElementById('adoptConfirmBtn').onclick=function(){
var ip=document.getElementById('adoptIp').value,n=document.getElementById('adoptName').value.trim(),t=document.getElementById('adoptType').value;
if(!n){alert('Name?');return;}
fetch('/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,ip:ip,type:t}),credentials:'include'})
.then(function(){document.getElementById('adoptDialog').classList.remove('open');scan();}).catch(function(){});};
document.getElementById('adoptCancelBtn').onclick=function(){document.getElementById('adoptDialog').classList.remove('open');};
subnets();
})();
