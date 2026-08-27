(function(){
document.getElementById('changePasswordBtn').onclick=function(){
var c=document.getElementById('currentPassword').value,n=document.getElementById('newPassword').value,cf=document.getElementById('confirmPassword').value,st=document.getElementById('passwordStatus');
if(!c||!n||!cf){st.textContent='Fill all';st.style.color='#f87171';return;}
if(n!==cf){st.textContent="No match";st.style.color='#f87171';return;}
fetch('/api/settings/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:c,newPassword:n}),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){if(r.ok){st.textContent='Changed';st.style.color='#c084fc';}else{st.textContent=r.error||'Error';st.style.color='#f87171';}})
.catch(function(){st.textContent='Error';st.style.color='#f87171';});
};
fetch('/api/settings/2fa',{credentials:'include'}).then(function(r){return r.json();}).then(function(r){
document.getElementById('2faStatus').textContent=r.enabled?'2FA enabled':'2FA disabled';
document.getElementById('2faSetup').style.display=r.enabled?'none':'';
document.getElementById('disable2faBtn').style.display=r.enabled?'':'none';
}).catch(function(){});
document.getElementById('verify2faBtn').onclick=function(){
var code=document.getElementById('totpCode').value.trim();
if(code.length!==6){alert('6 digits');return;}
fetch('/api/settings/2fa/enable',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code}),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){if(r.ok)location.reload();else document.getElementById('2faStatus2').textContent=r.error||'Bad';}).catch(function(){});
};
document.getElementById('disable2faBtn').onclick=function(){
if(!confirm('Disable?'))return;
fetch('/api/settings/2fa/disable',{method:'POST',credentials:'include'}).then(function(){location.reload();}).catch(function(){});
};
function sess(){
fetch('/api/settings/sessions',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var el=document.getElementById('sessionsList');
if(!d.length){el.textContent='No sessions.';return;}
var h='';for(var i=0;i<d.length;i++)h+='<div style="margin-bottom:4px;padding:4px;font-size:11px">'+d[i].ip+' - '+d[i].userAgent+'</div>';
el.innerHTML=h;
}).catch(function(){});
}
document.getElementById('refreshSessions').onclick=sess;sess();
})();
