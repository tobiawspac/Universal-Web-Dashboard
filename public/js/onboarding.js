(function(){
window.goStep=function(s){for(var i=1;i<=4;i++){document.getElementById('step'+i).style.display='none';document.getElementById('step'+i).classList.remove('active');document.getElementById('dot'+i).classList.remove('active');}
document.getElementById('step'+s).style.display='';document.getElementById('step'+s).classList.add('active');document.getElementById('dot'+s).classList.add('active');};
document.getElementById('onboardSetPass').onclick=function(){
var p1=document.getElementById('onboardPassword').value,p2=document.getElementById('onboardPasswordConfirm').value,st=document.getElementById('onboardPassStatus');
if(!p1||!p2){st.textContent='Fill both';st.style.color='#f87171';return;}
if(p1!==p2){st.textContent="No match";st.style.color='#f87171';return;}
fetch('/api/settings/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:'',newPassword:p1}),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){if(r.ok)goStep(3);else{st.textContent=r.error||'Err';st.style.color='#f87171';}})
.catch(function(){st.textContent='Error';st.style.color='#f87171';});};
document.getElementById('onboardTestDevice').onclick=function(){
var ip=document.getElementById('onboardDeviceIP').value.trim();if(!ip){alert('IP?');return;}
fetch('/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:ip,timeout:5000}),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){var el=document.getElementById('onboardTestResult');
if(r.alive){el.textContent='Online ('+r.latencyMs+' ms)';el.style.color='#4ade80';}else{el.textContent='Down';el.style.color='#f87171';}
}).catch(function(){document.getElementById('onboardTestResult').textContent='Err';});};
document.getElementById('onboardAddDevice').onclick=function(){
var n=document.getElementById('onboardDeviceName').value.trim(),ip=document.getElementById('onboardDeviceIP').value.trim(),t=document.getElementById('onboardDeviceType').value;
if(!n||!ip){alert('Name + IP');return;}
fetch('/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n,ip:ip,type:t}),credentials:'include'})
.then(function(){goStep(4);}).catch(function(){alert('Error');});};
})();
