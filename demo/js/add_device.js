(function(){
var st=document.getElementById('statusMessage'),tc=document.getElementById('checkType'),pw=document.getElementById('portWrap'),pa=document.getElementById('pathWrap'),hs=document.getElementById('httpsWrap'),sc=document.getElementById('snmpEnabled'),sm=document.getElementById('snmpCommunity');
function msg(t,e){st.textContent=t;st.style.color=e?'#CBA135':'#7FEFBD';}
function cfg(){
var c={checkType:tc.value},p=document.getElementById('devicePort').value;
if(p!=='')c.port=Number(p);
var ph=document.getElementById('httpPath').value;if(ph!=='')c.httpPath=ph;
c.https=document.getElementById('useHttps').checked;return c;
}
tc.onchange=function(){var t=tc.value;pw.style.display=(t==='http'||t==='tcp')?'':'none';pa.style.display=t==='http'?'':'none';hs.style.display=t==='http'?'':'none';};
sc.onchange=function(){sm.style.display=sc.checked?'':'none';};
document.getElementById('pingIp').onclick=function(){
var b=this,ip=document.getElementById('deviceIP').value.trim();
if(!ip){msg('Enter IP',true);return;}
b.disabled=true;b.textContent='Checking...';msg('Checking...');
var bd={host:ip,timeout:5000,checkType:cfg().checkType};
if(cfg().port!=null)bd.port=cfg().port;if(cfg().httpPath!=null)bd.httpPath=cfg().httpPath;bd.https=cfg().https;
fetch('/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bd),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){
if(r.alive)msg('Online'+(r.latencyMs!=null?' ('+r.latencyMs+' ms)':''));
else msg('Offline',true);
}).catch(function(){msg('Error',true);}).finally(function(){b.disabled=false;b.textContent='Test';});
};
document.getElementById('addDeviceButton').onclick=function(){
var n=document.getElementById('deviceName').value.trim(),ip=document.getElementById('deviceIP').value.trim(),tp=document.getElementById('deviceType').value,nt=document.getElementById('deviceNotes').value.trim();
if(!n||!ip){msg('Name + IP',true);return;}
var bd={name:n,ip:ip,type:tp,notes:nt,checkType:cfg().checkType,https:cfg().https,snmp_enabled:0,snmp_community:'public'};
if(cfg().port!=null)bd.port=cfg().port;if(cfg().httpPath!=null)bd.httpPath=cfg().httpPath;
if(sc.checked){bd.snmp_enabled=1;if(sm.value.trim()!=='')bd.snmp_community=sm.value.trim();}
fetch('/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(bd),credentials:'include'})
.then(function(r){if(r.ok){msg('Added');setTimeout(function(){location.href='index.html';},500);}else r.json().then(function(e){msg(e.error||'Err',true);});})
.catch(function(){msg('Error',true);});
};
})();
