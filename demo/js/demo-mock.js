window.__DEMO__=true;
(function(){
var D=[
{name:'Main Router',ip:'192.168.1.1',type:'router',live:{alive:true,latencyMs:3},summary:{uptimePercent:99.8,totalChecks:1440}},
{name:'Office Switch',ip:'192.168.1.2',type:'switch',live:{alive:true,latencyMs:1},summary:{uptimePercent:100,totalChecks:1440}},
{name:'File Server',ip:'192.168.1.10',type:'server',live:{alive:true,latencyMs:12},summary:{uptimePercent:99.5,totalChecks:1440}},
{name:'NAS Storage',ip:'192.168.1.20',type:'server',live:{alive:true,latencyMs:8},summary:{uptimePercent:98.9,totalChecks:1440}},
{name:'IP Camera',ip:'192.168.1.50',type:'camera',live:{alive:true,latencyMs:22},summary:{uptimePercent:97.2,totalChecks:1440}},
{name:'Dev PC',ip:'192.168.1.100',type:'pc',live:{alive:false,latencyMs:null},summary:{uptimePercent:85.3,totalChecks:1440}},
{name:'Printer',ip:'192.168.1.200',type:'printer',live:{alive:true,latencyMs:45},summary:{uptimePercent:99.1,totalChecks:1440}},
{name:'Guest WiFi AP',ip:'192.168.1.5',type:'router',live:{alive:true,latencyMs:2},summary:{uptimePercent:100,totalChecks:1440}}
];
var rf=window.fetch?window.fetch.bind(window):null;
function J(t){return new Response(JSON.stringify(t),{status:200,headers:{'Content-Type':'application/json'}});}
window.fetch=function(url,o){
var u=String(url);
if(u.indexOf('/api/dashboard-summary')>=0)return Promise.resolve(J(D));
if(u.indexOf('/devices')>=0)return Promise.resolve(J(D.map(function(d,i){return{id:i+1,name:d.name,ip:d.ip,type:d.type,snmp_enabled:0};})));
if(u.indexOf('/summary/')>=0)return Promise.resolve(J({uptimePercent:99.2,avgLatencyMs:8,lastStatus:'online',totalChecks:1440}));
if(u.indexOf('/history/')>=0){var r=[];for(var i=0;i<60;i++)r.push({timestamp:Date.now()-i*60000,alive:Math.random()>.08?1:0,latency_ms:Math.floor(2+Math.random()*20)});return Promise.resolve(J(r));}
if(u.indexOf('/ping')>=0||u.indexOf('/check')>=0)return Promise.resolve(J({host:'127.0.0.1',alive:true,latencyMs:12}));
if(u.indexOf('/health')>=0)return Promise.resolve(J({ok:true}));
var empty=['/api/alerts','/api/discovery','/api/plugins','/api/snmp','/api/settings'];
for(var k=0;k<empty.length;k++)if(u.indexOf(empty[k])>=0)return Promise.resolve(J([]));
if(rf)return rf(u,o);
return Promise.resolve(J([]));
};
window.io=function(){return{on:function(){},emit:function(){}};};
})();
