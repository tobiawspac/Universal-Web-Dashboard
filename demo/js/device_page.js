// detail zarizeni
function yuvcxn() {

var qs = new URLSearchParams(window.location.search)
var devName = qs.get("name")
var devIP = qs.get("ip")
var devType = qs.get("type")
if (devType == null) devType = "router"

// prevod bps na citelny format
function Bps(b) {
    if (b >= 1000000000) return (b / 1000000000).toFixed(1) + " Gbps"
    if (b >= 1000000) return (b / 1000000).toFixed(1) + " Mbps"
    if (b >= 1000) return (b / 1000).toFixed(1) + " Kbps"
    return b + " bps"
}

// souhrn za 24h
function NactiSouhrn() {
    fetch("/summary/" + encodeURIComponent(devIP) + "?hours=24", { credentials: "include" })
        .then(function(r){ return r.ok ? r.json() : null })
        .then(function(s) {
            if (!s || !s.totalChecks) return
            document.getElementById("statsCard").style.display = ""
            document.getElementById("statUptime").textContent = "Uptime: " + s.uptimePercent + "%"
            var lat = "N/A"
            if (s.avgLatencyMs !== null) lat = s.avgLatencyMs + "ms"
            document.getElementById("statLatency").textContent = "Avg Latency: " + lat
            document.getElementById("statStatus").textContent = "Last Status: " + s.lastStatus
        })
        .catch(function(e){})
}

// graf ping historie na canvasu
function Graf() {
    fetch("/history/" + encodeURIComponent(devIP) + "?range=60", { credentials: "include" })
        .then(function(r){ return r.ok ? r.json() : [] })
        .then(function(rows) {
            if (!rows.length) return
            document.getElementById("historyCard").style.display = ""

            var cnv = document.getElementById("historyChart")
            var ctx = cnv.getContext("2d")
            var W = cnv.width, H = cnv.height
            var pT = 10, pB = 20, pL = 40, pR = 10

            ctx.clearRect(0, 0, W, H)

            // rozsah casu a latency
            var tMin = null, tMax = null, lMax = 1
            for (var i = 0; i < rows.length; i++) {
                var t = rows[i].timestamp
                if (tMin == null || t < tMin) tMin = t
                if (tMax == null || t > tMax) tMax = t
                if (rows[i].alive && (rows[i].latency_ms || 0) > lMax) lMax = rows[i].latency_ms
            }
            var rozsah = tMax - tMin
            if (rozsah == 0) rozsah = 1

            // osa Y
            ctx.strokeStyle = "rgba(255,255,255,0.25)"
            ctx.beginPath()
            ctx.moveTo(pL, H - pB)
            ctx.lineTo(pL, pT)
            ctx.stroke()

            // mrizka + popisky ms
            for (var g = 0; g <= 4; g++) {
                var yy = pT + (H - pT - pB) * (g / 4)
                ctx.strokeStyle = "rgba(255,255,255,0.1)"
                ctx.beginPath()
                ctx.moveTo(pL, yy); ctx.lineTo(W - pR, yy); ctx.stroke()
                ctx.fillStyle = "#999"
                ctx.font = "10px monospace"
                ctx.textAlign = "right"
                ctx.fillText(Math.round(lMax * (1 - g / 4)) + "ms", pL - 4, yy + 3)
            }

            // body a cary
            var lastX = null, lastY = null
            for (var k = 0; k < rows.length; k++) {
                var x = pL + ((rows[k].timestamp - tMin) / rozsah) * (W - pL - pR)
                var y2 = null
                if (rows[k].alive) y2 = pT + (1 - (rows[k].latency_ms || 0) / lMax) * (H - pT - pB)

                if (!rows[k].alive) {
                    ctx.fillStyle = "#666"
                    ctx.beginPath()
                    ctx.arc(x, H - pB - 4, 3, 0, Math.PI * 2)
                    ctx.fill()
                } else if (y2 !== null) {
                    ctx.fillStyle = "#ddd"
                    ctx.beginPath()
                    ctx.arc(x, y2, 3, 0, Math.PI * 2)
                    ctx.fill()
                    if (lastX !== null) {
                        ctx.strokeStyle = "#ddd"
                        ctx.lineWidth = 1.5
                        ctx.beginPath()
                        ctx.moveTo(lastX, lastY)
                        ctx.lineTo(x, y2)
                        ctx.stroke()
                    }
                    lastX = x; lastY = y2
                }
            }
        })
        .catch(function(e){ console.log("graf se nepodaril") })
}

// snmp interfaces tabulka
function Snmp() {
    fetch("/devices", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(vsechna) {
            var muj = null
            for (var i = 0; i < vsechna.length; i++) {
                if (vsechna[i].ip == devIP) muj = vsechna[i]
            }
            if (!muj || !muj.snmp_enabled || !muj.id) return

            fetch("/api/snmp/" + muj.id + "/interfaces", { credentials: "include" })
                .then(function(r){ return r.ok ? r.json() : null })
                .then(function(data) {
                    if (!data || !data.interfaces || !data.interfaces.length) return
                    document.getElementById("snmpCard").style.display = ""

                    var html = '<table class="data-table"><tr><th>Interface</th><th>Status</th>'
                    html += '<th style="text-align:right">In bps</th><th style="text-align:right">Out bps</th></tr>'
                    for (var i = 0; i < data.interfaces.length; i++) {
                        var it = data.interfaces[i]
                        var stt = "Down"
                        if (it.if_oper_status == 1) stt = "Up"
                        html += "<tr><td>" + (it.if_descr || it.if_index) + "</td>"
                        html += "<td>" + stt + "</td>"
                        html += '<td style="text-align:right;">' + (it.in_bps != null ? Bps(it.in_bps) : "—") + "</td>"
                        html += '<td style="text-align:right;">' + (it.out_bps != null ? Bps(it.out_bps) : "—") + "</td></tr>"
                    }
                    html += "</table>"
                    document.getElementById("snmpInterfaces").innerHTML = html
                })
        })
        .catch(function(e){})
}

// vypln detail a navazat tlacitka
function Napln() {
    if (!devName || !devIP) {
        document.getElementById("deviceDetails").innerHTML = '<p class="error-message">Invalid device details.</p>'
        return
    }

    document.getElementById("deviceName").textContent = "Device: " + devName
    document.getElementById("deviceIP").textContent = "IP: " + devIP
    document.getElementById("deviceType").textContent = "Type: " + devType

    NactiSouhrn()
    Graf()
    Snmp()

    document.getElementById("pingBtn").addEventListener("click", function() {
        var btn = this
        btn.disabled = true
        btn.textContent = "Pinging..."
        fetch("/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ host: devIP, timeout: 5000 }),
            credentials: "include"
        })
        .then(function(r){ return r.json() })
        .then(function(vysl) {
            if (vysl.alive) alert(devName + " is online (" + (vysl.latencyMs || "?") + "ms)")
            else alert(devName + " is offline")
        })
        .catch(function(){ alert("Server error.") })
        .finally(function() {
            btn.disabled = false
            btn.textContent = "Ping"
        })
    })
}

document.getElementById("backButton").addEventListener("click", function() {
    window.location.href = "index.html"
})

Napln()
}

yuvcxn()
