// spolecny script pro vsechny stranky
function InitSite() {
    var lb = document.getElementById("logoutBtn")
    if (lb != null) {
        lb.onclick = function() {
            document.cookie = 'dashboard_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            location.reload()
        }
    }
}
InitSite()
