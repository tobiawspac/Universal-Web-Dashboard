// alerty - kanaly, log, maintenance
function mnbvlk() {

var pole = {
    webhook: [ { key: "url", label: "Webhook URL", ph: "https://..." } ],
    discord: [ { key: "webhookUrl", label: "Discord Webhook URL", ph: "https://discord.com/api/webhooks/..." } ],
    telegram: [
        { key: "botToken", label: "Bot Token", ph: "123456:ABC..." },
        { key: "chatId", label: "Chat ID", ph: "-100..." }
    ],
    email: [
        { key: "smtp_host", label: "SMTP Host", ph: "smtp.gmail.com" },
        { key: "smtp_port", label: "SMTP Port", ph: "587", val: "587" },
        { key: "smtp_user", label: "SMTP User", ph: "user@gmail.com" },
        { key: "smtp_pass", label: "SMTP Password", ph: "****", typ: "password" },
        { key: "to", label: "To Email", ph: "admin@example.com" }
    ]
}

var selTyp = document.getElementById("channelType")
var divPole = document.getElementById("channelFields")

// prekresli inputy podle vybraneho typu
function KresliPole() {
    var f = pole[selTyp.value]
    if (!f) f = []
    var h = ""
    for (var i = 0; i < f.length; i++) {
        h += '<div style="flex:1;min-width:140px;">'
        h += "<label>" + f[i].label + "</label>"
        h += '<input type="' + (f[i].typ || "text") + '" data-key="' + f[i].key + '" placeholder="' + (f[i].ph || "") + '" value="' + (f[i].val || "") + '">'
        h += "</div>"
    }
    divPole.innerHTML = h
}

selTyp.addEventListener("change", KresliPole)
KresliPole()

document.getElementById("addChannelBtn").addEventListener("click", function() {
    var jmeno = document.getElementById("channelName").value.trim()
    if (jmeno == "") {
        alert("Enter a channel name")
        return
    }

    // posbirat hodnoty z inputu
    var cfg = {}
    var inputs = divPole.querySelectorAll("input")
    for (var i = 0; i < inputs.length; i++) {
        var klic = inputs[i].dataset.key
        var hodn = inputs[i].value.trim()
        if (klic == "smtp_port") hodn = Number(hodn) || 587   // default port
        cfg[klic] = hodn
    }

    fetch("/api/alerts/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selTyp.value, name: jmeno, config: cfg }),
        credentials: "include",
    })
    .then(function(r) {
        if (r.ok) {
            document.getElementById("channelName").value = ""
            KresliPole()
            NactiKanaly()
        } else {
            r.json().then(function(e){ alert(e.error || "Failed") })
        }
    })
});

function NactiKanaly() {
    fetch("/api/alerts/channels", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(kanaly) {
            var div = document.getElementById("channelsList")
            if (kanaly.length == 0) {
                div.textContent = "No channels configured."
                return
            }
            var h = ""
            for (var i = 0; i < kanaly.length; i++) {
                var k = kanaly[i]
                var onoff = k.enabled ? "ON" : "OFF"
                h += '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #3a3a3a;">'
                h += '<span style="font-weight:bold;min-width:80px;" class="mono">' + k.type + "</span>"
                h += "<span style='flex:1;'>" + k.name + "</span>"
                h += '<span style="font-size:10px;" class="mono">' + onoff + "</span>"
                h += '<button class="button2" onclick="testChannel(' + k.id + ')">Test</button>'
                // enable / disable
                if (k.enabled) h += '<button class="button2" onclick="toggleChannel(' + k.id + ', 0)">Disable</button>'
                else h += '<button class="button2" onclick="toggleChannel(' + k.id + ', 1)">Enable</button>'
                h += '<button class="button2 danger" onclick="deleteChannel(' + k.id + ')">Delete</button>'
                h += "</div>"
            }
            div.innerHTML = h
        })
}

window.testChannel = function(id) {
    fetch("/api/alerts/channels/" + id + "/test", { method: "POST", credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(odp) {
            if (odp.success) alert("Test sent!")
            else alert("Failed: " + odp.error)
        })
}

window.toggleChannel = function(id, en) {
    fetch("/api/alerts/channels/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: en }),
        credentials: "include",
    }).then(function(){ NactiKanaly() })
}

window.deleteChannel = function(id) {
    if (!confirm("Delete this channel?")) return
    fetch("/api/alerts/channels/" + id, { method: "DELETE", credentials: "include" })
        .then(function(){ NactiKanaly() })
}

// historie odeslanych alertu
function NactiLog() {
    fetch("/api/alerts/log?limit=50", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(radky) {
            var div = document.getElementById("alertLog")
            if (radky.length == 0) {
                div.textContent = "No alerts yet."
                return
            }
            var h = ""
            for (var i = 0; i < radky.length; i++) {
                var r = radky[i]
                var cas = new Date(r.sent_at).toLocaleString("cs")
                h += '<div style="padding:8px 0;border-bottom:1px solid #3a3a3a;display:flex;gap:10px;align-items:center;">'
                h += '<span style="font-weight:bold;min-width:80px;">' + r.event_type + "</span>"
                h += "<span style='flex:1;'>" + (r.device_name || "?") + " — " + r.message + "</span>"
                h += '<span style="font-size:10px;color:#999;">' + cas + "</span>"
                if (r.suppressed) h += '<span style="font-size:10px;color:#999;">[suppressed]</span>'
                if (r.success === 0) h += '<span style="font-size:10px;">[failed]</span>'
                h += "</div>"
            }
            div.innerHTML = h
        })
}

// naplneni selectu zarizenimi pro maintenance
function NactiZarizeni() {
    fetch("/devices", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(devs) {
            var sel = document.getElementById("maintDevice")
            var h = ""
            for (var i = 0; i < devs.length; i++) {
                h += '<option value="' + devs[i].id + '">' + devs[i].name + " (" + devs[i].ip + ")</option>"
            }
            sel.innerHTML = h
        })
}

document.getElementById("addMaintBtn").addEventListener("click", function() {
    var did = parseInt(document.getElementById("maintDevice").value)
    if (!did) {
        alert("Select a device")
        return
    }
    var od = new Date(document.getElementById("maintStart").value).getTime()
    var doo = new Date(document.getElementById("maintEnd").value).getTime()
    var poznamka = document.getElementById("maintNote").value.trim()

    if (!od || !doo || od >= doo) {
        alert("Set valid start/end times")
        return
    }

    fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: did, startsAt: od, endsAt: doo, note: poznamka }),
        credentials: "include",
    })
    .then(function(r) {
        if (r.ok) NactiMaint()
        else alert("Failed")
    })
});

function NactiMaint() {
    fetch("/api/maintenance", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(radky) {
            var div = document.getElementById("maintList")
            if (radky.length == 0) {
                div.textContent = "No maintenance windows."
                return
            }
            var h = ""
            for (var i = 0; i < radky.length; i++) {
                var r = radky[i]
                var od = new Date(r.starts_at).toLocaleString("cs")
                var doo = new Date(r.ends_at).toLocaleString("cs")
                var jmeno = r.device_name || "Device #" + r.device_id
                h += '<div style="padding:8px 0;border-bottom:1px solid #3a3a3a;display:flex;gap:10px;align-items:center;">'
                h += "<span style='flex:1;'>" + jmeno + "</span>"
                h += '<span style="font-size:10px;color:#999;">' + od + " — " + doo + "</span>"
                if (r.note) h += '<span style="font-size:10px;color:#999;">(' + r.note + ")</span>"
                h += '<button class="button2 danger" onclick="deleteMaint(' + r.id + ')">Delete</button>'
                h += "</div>"
            }
            div.innerHTML = h
        })
}

window.deleteMaint = function(id) {
    fetch("/api/maintenance/" + id, { method: "DELETE", credentials: "include" })
        .then(function(){ NactiMaint() })
}

NactiKanaly()
NactiLog()
NactiZarizeni()
NactiMaint()
}

mnbvlk()
