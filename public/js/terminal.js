(function(){
var t=document.getElementById('terminal'),inp=document.getElementById('commandInput'),hist=[],hi=-1;
function out(txt,cls){var d=document.createElement('div');d.textContent=txt;if(cls)d.className=cls;t.appendChild(d);t.scrollTop=t.scrollHeight;}
function run(cmd){
out('> '+cmd,'prompt');
var p=cmd.trim().split(/\s+/),c=p[0]?p[0].toLowerCase():'';
if(c==='help')out('Commands: ping, devices, help, clear','output-success');
else if(c==='clear')t.innerHTML='';
else if(c==='devices')fetch('/devices',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){for(var i=0;i<d.length;i++)out(d[i].name+' ('+d[i].ip+')');}).catch(function(){out('Error','output-error');});
else if(c==='ping'){var h=p[1];if(!h){out('Usage: ping <ip>','output-error');return;}out('Pinging '+h+'...');fetch('/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:h,timeout:5000}),credentials:'include'}).then(function(r){return r.json();}).then(function(r){if(r.alive)out(h+' alive ('+r.latencyMs+' ms)','output-success');else out(h+' unreachable','output-error');}).catch(function(){out('Error','output-error');});}
else if(c==='whoami')out('admin','output-success');
else if(c==='date')out(new Date().toISOString(),'output-success');
else if(c==='version')out('BEACON v1.1.0','output-success');
else out('Unknown: '+c+". Type 'help'",'output-error');
}
inp.onkeydown=function(e){
if(e.key==='Enter'){var c=inp.value.trim();if(c){hist.push(c);hi=hist.length;run(c);}inp.value='';}
else if(e.key==='ArrowUp'){e.preventDefault();if(hi>0){hi--;inp.value=hist[hi];}}
else if(e.key==='ArrowDown'){e.preventDefault();if(hi<hist.length-1){hi++;inp.value=hist[hi];}else{hi=hist.length;inp.value='';}}
};
out('BEACON Terminal v1.1','prompt');out("Type 'help'",'output-success');
})();
