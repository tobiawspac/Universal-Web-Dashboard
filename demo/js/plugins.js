(function(){
function load(){
fetch('/api/plugins',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){
var el=document.getElementById('pluginsList');
if(!d.length){el.textContent='No plugins.';return;}
var h='';for(var i=0;i<d.length;i++)h+='<div class="card" style="margin-bottom:8px;padding:10px;font-size:12px"><strong>'+d[i].name+'</strong> v'+d[i].version+' <button class="button2 danger" onclick="rmP(\''+d[i].id+'\')">X</button></div>';
el.innerHTML=h;
}).catch(function(){});
}
window.rmP=function(id){if(!confirm('Del?'))return;fetch('/api/plugins/'+id,{method:'DELETE',credentials:'include'}).then(load).catch(function(){});};
document.getElementById('uploadBtn').onclick=function(){
var f=document.getElementById('pluginFile').files[0];
if(!f){alert('ZIP?');return;}
var fd=new FormData();fd.append('plugin',f);
fetch('/api/plugins/upload',{method:'POST',body:fd,credentials:'include'}).then(function(r){return r.json();}).then(function(r){
if(r.ok){document.getElementById('uploadStatus').textContent='OK';load();}
else document.getElementById('uploadStatus').textContent=r.error||'Fail';
}).catch(function(){document.getElementById('uploadStatus').textContent='Error';});
};
load();
})();
