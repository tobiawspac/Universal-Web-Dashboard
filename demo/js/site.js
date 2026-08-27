(function(){
var lb=document.getElementById('logoutBtn');
if(lb)lb.onclick=function(){document.cookie='dashboard_session=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';location.reload();};
try{var s=io();s.on('device:update',function(){});}catch(e){}
})();
