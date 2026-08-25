// dashboard - hlavni stranka
function higfxhug() {

var box = document.getElementById("devices")
var searchBox = document.getElementById("q")
var devs = []
var demo_mode = false

// demo data kdyz server nejede
var DEMO = [
    { name: "Main Router", ip: "192.168.1.1", type: "router", live: { alive: true, latencyMs: 3 }, summary: { uptimePercent: 99.8, totalChecks: 1440 } },
    { name: "Office Switch", ip: "192.168.1.2", type: "switch", live: { alive: true, latencyMs: 1 }, summary: { uptimePercent: 100, totalChecks: 1440 } },
    { name: "File Server", ip: "192.168.1.10", type: "server", live: { alive: true, latencyMs: 12 }, summary: { uptimePercent: 99.5, totalChecks: 1440 } },
    { name: "NAS Storage", ip: "192.168.1.20", type: "server", live: { alive: true, latencyMs: 8 }, summary: { uptimePercent: 98.9, totalChecks: 1440 } },
    { name: "IP Camera", ip: "192.168.1.50", type: "camera", live: { alive: true, latencyMs: 22 }, summary: { uptimePercent: 97.2, totalChecks: 1440 } },
    { name: "Dev PC", ip: "192.168.1.100", type: "pc", live: { alive: false, latencyMs: null }, summary: { uptimePercent: 85.3, totalChecks: 1440 } },
    { name: "Printer", ip: "192.168.1.200", type: "printer", live: { alive: true, latencyMs: 45 }, summary: { uptimePercent: 99.1, totalChecks: 1440 } },
    { name: "Guest WiFi AP", ip: "192.168.1.5", type: "router", live: { alive: true, latencyMs: 2 }, summary: { uptimePercent: 100, totalChecks: 1440 } },
]

// nacteni ze serveru (nebo demo)
function Nacti() {
    if (demo_mode) return Promise.resolve(DEMO)
    return fetch("/api/dashboard-summary", { credentials: "include" })
        .then(function(r) {
            if (!r.ok) throw new Error("api")
            return r.json()
        })
        .catch(function(e) {
            // server asi nebězi -> demo
            return DEMO
        })
}

// sestavi jednu karticku zarizeni
function Karticka(dev) {
    var el = document.createElement("div")
    var alive = dev.live && dev.live.alive
    if (alive) el.className = "device-card"
    else el.className = "device-card offline"

    // uptime a latency do spodni listy
    var upt = "—"
    if (dev.summary && dev.summary.totalChecks) upt = dev.summary.uptimePercent + "%"

    var lat = "offline"
    if (alive) {
        if (dev.live.latencyMs != null) lat = dev.live.latencyMs + " ms"
        else lat = "ping ok"
    }

    el.innerHTML =
      '<div class="device-card-top"><span class="device-card-ip">' + (dev.type || "?") + '</span>' +
      '<span class="status-dot"></span></div>' +
      '<div class="device-card-name">' + dev.name + '</div>' +
      '<div class="device-card-ip">' + dev.ip + '</div>' +
      '<div class="device-card-meta"><span>' + lat + '</span><span>Uptime 24h: ' + upt + '</span></div>' +
      '<div class="device-card-actions"><button class="button2 open-btn" style="flex:1">Open</button></div>'

    function Otevri() {
        location.href = "device_page.html?name=" + encodeURIComponent(dev.name)
            + "&ip=" + encodeURIComponent(dev.ip)
            + "&type=" + encodeURIComponent(dev.type || "router")
    }

    // klik kamkoliv krome tlacitek
    el.onclick = function(e) {
        if (e.target.tagName == "BUTTON") return
        Otevri()
    }
    el.querySelector(".open-btn").onclick = Otevri
    return el
}

// vyhledavani ve jmenu / ip / typu
function Filtruj(list) {
    var q = searchBox.value.toLowerCase().trim()
    if (q == "") return list
    var out = []
    for (var i = 0; i < list.length; i++) {
        var x = list[i]
        if ((x.name || "").toLowerCase().includes(q)) out.push(x)
        else if ((x.ip || "").indexOf(q) >= 0) out.push(x)
        else if ((x.type || "").includes(q)) out.push(x)
    }
    return out
}

// prekresleni celeho dashboardu
function Render() {
    Nacti().then(function(seznam) {
        devs = seznam
        box.innerHTML = ""
        document.getElementById("emptyState").style.display = "none"

        var onCnt = 0
        for (var i = 0; i < devs.length; i++) {
            if (devs[i].live && devs[i].live.alive) onCnt++
        }
        document.getElementById("summaryOnline").innerHTML = '<span class="status-dot"></span>Online: ' + onCnt
        document.getElementById("summaryOffline").textContent = "Offline: " + (devs.length - onCnt)

        if (devs.length == 0) {
            // prazdno
            document.getElementById("emptyState").style.display = ""
            return
        }

        var f = Filtruj(devs)
        if (f.length == 0) {
            box.innerHTML = '<p class="mono muted" style="padding:12px;border:1px dashed #3a3a3a;text-align:center">No match</p>'
            return
        }
        for (var j = 0; j < f.length; j++) box.appendChild(Karticka(f[j]))
    })
}

document.getElementById("refreshBtn").onclick = Render

// zivy filtr bez noveho requestu
searchBox.addEventListener("input", function() {
    box.innerHTML = ""
    if (!devs.length) return
    var f = Filtruj(devs)

    if (f.length == 0) {
        box.innerHTML = '<p class="mono muted" style="padding:12px;border:1px dashed #3a3a3a;text-align:center">No match</p>'
        return
    }
    for (var i = 0; i < f.length; i++) box.appendChild(Karticka(f[i]))
})

document.getElementById("exportBtn").addEventListener("click", function() {
    fetch("/devices", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(exportData) {
            var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
            var a = document.createElement("a")
            a.href = URL.createObjectURL(blob)
            a.download = "export.json"   // TODO: lip pojmenovat
            a.click()
        })
        .catch(function(){ alert("Export failed") })
})

// ukazat demo zarizeni
document.getElementById("demoLink").addEventListener("click", function(e) {
    e.preventDefault()
    demo_mode = true
    Render()
})

try {
    var sock = io()
    sock.on("device:update", Render)
} catch (e) {}

Render()
}

higfxhug()

