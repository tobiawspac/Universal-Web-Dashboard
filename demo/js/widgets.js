// widgety + graf latenci
function lkjhgf() {

function Nacti() {
    fetch("/api/dashboard-summary", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(devs) {
            // spocitej online / offline
            var onCnt = 0
            for (var i = 0; i < devs.length; i++) {
                if (devs[i].live && devs[i].live.alive) onCnt++
            }
            var offCnt = devs.length - onCnt

            // prumer uptime jen od tech co maji checky
            var suma = 0, cnt = 0
            for (var j = 0; j < devs.length; j++) {
                var s = devs[j].summary
                if (s && s.totalChecks) {
                    suma += (s.uptimePercent || 0)
                    cnt++
                }
            }
            var prumer = "—"
            if (cnt > 0) prumer = (suma / cnt).toFixed(1) + "%"

            document.getElementById("widgetOnline").textContent = onCnt
            document.getElementById("widgetOffline").textContent = offCnt
            document.getElementById("widgetTotal").textContent = devs.length
            document.getElementById("widgetAvgUptime").textContent = prumer

            Graf(devs)
        })
}

// sloupcovy graf latence na canvasu
function Graf(devs) {
    var cnv = document.getElementById("latencyChart")
    var ctx = cnv.getContext("2d")
    var W = cnv.width, H = cnv.height
    var pT = 20, pB = 30, pL = 50, pR = 20

    ctx.clearRect(0, 0, W, H)
    if (devs.length == 0) return

    // jen online s latenci
    var online = []
    for (var i = 0; i < devs.length; i++) {
        var d = devs[i]
        if (d.live && d.live.alive && d.live.latencyMs != null) online.push(d)
    }

    if (online.length == 0) {
        ctx.fillStyle = "#999"
        ctx.font = "12px monospace"
        ctx.textAlign = "center"
        ctx.fillText("No latency data available", W / 2, H / 2)
        return
    }

    // max latence pro meritko
    var lMax = 1
    for (var k = 0; k < online.length; k++) {
        if (online[k].live.latencyMs > lMax) lMax = online[k].live.latencyMs
    }
    var sirka = Math.min(40, (W - pL - pR) / online.length - 4)

    // mrizka + popisky
    for (var g = 0; g <= 4; g++) {
        var yy = pT + (H - pT - pB) * (1 - g / 4)
        ctx.strokeStyle = "rgba(255,255,255,0.1)"
        ctx.beginPath()
        ctx.moveTo(pL, yy); ctx.lineTo(W - pR, yy); ctx.stroke()
        ctx.fillStyle = "#999"
        ctx.font = "10px monospace"
        ctx.textAlign = "right"
        ctx.fillText(Math.round(lMax * g / 4) + "ms", pL - 5, yy + 3)
    }

    for (var n = 0; n < online.length; n++) {
        var dev = online[n]
        var x = pL + n * (sirka + 4) + 2
        var vyska = (dev.live.latencyMs / lMax) * (H - pT - pB)
        var y = H - pB - vyska

        // pomalejsi = svetlejsi
        if (dev.live.latencyMs > 100) ctx.fillStyle = "#777"
        else ctx.fillStyle = "#ddd"
        ctx.fillRect(x, y, sirka, vyska)

        // popisek pod sloupcem otoceny o 45°
        ctx.save()
        ctx.translate(x + sirka / 2, H - pB + 5)
        ctx.rotate(-Math.PI / 4)
        ctx.fillStyle = "#999"
        ctx.font = "9px monospace"
        ctx.textAlign = "right"
        var lbl = dev.name || dev.ip
        if (lbl.length > 12) lbl = lbl.substring(0, 10) + ".."
        ctx.fillText(lbl, 0, 0)
        ctx.restore()
    }
}

// widgety z pluginu
function PluginWidgety() {
    fetch("/api/plugins", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(pluginy) {
            var div = document.getElementById("pluginWidgets")
            var wplug = []
            for (var i = 0; i < pluginy.length; i++) {
                if (pluginy[i].enabled && pluginy[i].type.includes("widget")) wplug.push(pluginy[i])
            }

            if (wplug.length == 0) {
                div.textContent = "No widget plugins installed."
                return
            }

            div.innerHTML = ""
            for (var k = 0; k < wplug.length; k++) {
                var kont = document.createElement("div")
                kont.style.border = "1px solid #3a3a3a"
                kont.style.marginBottom = "12px"
                kont.style.minHeight = "80px"
                div.appendChild(kont)

                try {
                    WidgetHost.createWidgetFrame(wplug[k].id, kont, null, {})
                } catch (e) {}
            }
        })
}

try {
    var sock = io()
    sock.on("device:update", function(){ Nacti() })
} catch (e) {}

Nacti()
PluginWidgety()
}

lkjhgf()
