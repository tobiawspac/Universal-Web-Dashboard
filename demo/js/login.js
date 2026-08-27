(function(){
var f1=document.getElementById('loginForm'),f2=document.getElementById('tfaForm');
f1.onsubmit=function(e){
e.preventDefault();
var pw=document.getElementById('loginPassword').value,st=document.getElementById('loginStatus'),btn=e.target.querySelector('button[type="submit"]');
btn.disabled=true;btn.textContent='Checking...';
fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw}),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){
if(r.ok){location.href='index.html';return;}
if(r.requires2fa){f1.style.display='none';f2.style.display='';document.getElementById('tfaCode').focus();return;}
st.textContent='Wrong password';st.style.color='#f87171';
}).catch(function(){st.textContent='Server offline';st.style.color='#f87171';})
.finally(function(){btn.disabled=false;btn.textContent='Enter Beacon';});
};
f2.onsubmit=function(e){
e.preventDefault();
var k=document.getElementById('tfaCode').value.trim(),st=document.getElementById('tfaStatus'),btn=e.target.querySelector('button[type="submit"]');
btn.disabled=true;
fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('loginPassword').value,totpCode:k}),credentials:'include'})
.then(function(r){return r.json();}).then(function(r){
if(r.ok){location.href='index.html';return;}
st.textContent=r.error||'Bad code';st.style.color='#f87171';
}).catch(function(){st.textContent='Error';st.style.color='#f87171';})
.finally(function(){btn.disabled=false;});
};
})();
