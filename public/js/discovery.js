// discovery sken site
function zxcvas() {

var vysledky = []   // co naslo skenovani
var scanning = false

// nacte subnety do selectu
fetch("/api/discovery/subnets", { credentials: "include" })
    .then(function(r){ return r.json() })
    .then(function(subnety) {
        var sel = document.getElementById("subnetSelect")
        if (!subnety.length) {
            sel.innerHTML = '<option value="">No subnets found</option>'
            return
        }
        var h = ""
        for (var i = 0; i < subnety.length; i++) {
            h += '<option value="' + subnety[i].cidr + '">' + subnety[i].cidr + " (" + subnety[i].iface + ")</option>"
        }
        sel.innerHTML = h
    })
    .catch(function(e){})

function ResetSken() {
    scanning = false
    document.getElementById("scanBtn").textContent = "Start Scan"
    document.getElementById("scanBtn").disabled = false
    document.getElementById("scanProgress").style.display = "none"
    document.getElementById("progressBar").style.width = "0%"
}

// start skenovani
document.getElementById("scanBtn").addEventListener("click", function() {
    if (scanning) return
    var cidr = document.getElementById("cidrInput").value.trim()
    if (cidr == "") cidr = document.getElementById("subnetSelect").value
    if (!cidr) {
        alert("Select or enter a subnet")
        return
    }

    scanning = true
    this.textContent = "Scanning..."
    this.disabled = true
    document.getElementById("scanProgress").style.display = ""

    fetch("/api/discovery/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidr: cidr }),
        credentials: "include",
    })
    .then(function(r){ return r.json() })
    .then(function(odp) {
        // chybu resi socket discovery:done, tady jen alert kdyz je error
        if (odp.error) {
            alert(odp.error)
            ResetSken()
        }
    })
});

// progress ze socketu
try {
    var sock = io()
    sock.on("discovery:progress", function(d) {
        var pct = 0
        if (d.total > 0) pct = Math.round((d.checked / d.total) * 100)
        document.getElementById("progressBar").style.width = pct + "%"
        document.getElementById("progressText").textContent = "Scanning... " + pct + "%"
        document.getElementById("progressCount").textContent = d.checked + "/" + d.total
    })
    sock.on("discovery:done", function(d) {
        ResetSken()
        document.getElementById("progressText").textContent = "Done — found " + d.foundCount + " device(s)"
        NactiVysledky()
    })
} catch (e) {}

// nacteni nalezenych zarizeni
function NactiVysledky() {
    fetch("/api/discovery/results?status=new", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(v) {
            vysledky = v
            Vykresli()
        })
}

function Vykresli() {
    var div = document.getElementById("resultsTable")
    if (vysledky.length == 0) {
        div.textContent = "No new devices found."
        return
    }

    var h = '<table class="data-table"><tr><th><input type="checkbox" id="selectAll"></th><th>IP</th><th>MAC</th><th>Vendor</th><th>Action</th></tr>'
    for (var i = 0; i < vysledky.length; i++) {
        var v = vysledky[i]
        h += '<tr>'
        h += '<td><input type="checkbox" class="result-check" data-id="' + v.id + '"></td>'
        h += "<td>" + v.ip + "</td>"
        h += '<td style="font-size:10px;color:var(--dim);">' + (v.mac || "—") + "</td>"
        h += "<td>" + (v.vendor_guess || "—") + "</td>"
        h += '<td><button class="button1" style="padding:4px 10px;font-size:10px;" onclick="openAdopt(\'' + v.ip + '\')">Adopt</button></td>'
        h += "</tr>"
    }
    h += "</table>"
    div.innerHTML = h

    // vybrat vsechno
    document.getElementById("selectAll").addEventListener("change", function(e) {
        var chb = document.querySelectorAll(".result-check")
        for (var i = 0; i < chb.length; i++) chb[i].checked = e.target.checked
        Pocitej()
    })
    var chb2 = document.querySelectorAll(".result-check")
    for (var j = 0; j < chb2.length; j++) {
        chb2[j].addEventListener("change", Pocitej)
    }
}

function Pocitej() {
    var cnt = document.querySelectorAll(".result-check:checked").length
    document.getElementById("selectedCount").textContent = cnt > 0 ? cnt + " selected" : ""
}

// adopt dialog - musi byt globalni kvuli onclick v tabulce
window.openAdopt = function(ip) {
    document.getElementById("adoptIp").value = ip
    document.getElementById("adoptName").value = ip
    document.getElementById("adoptDialog").classList.add("open")
}

document.getElementById("adoptCancelBtn").addEventListener("click", function() {
    document.getElementById("adoptDialog").classList.remove("open")
})

document.getElementById("adoptConfirmBtn").addEventListener("click", function() {
    var ip = document.getElementById("adoptIp").value
    var jmeno = document.getElementById("adoptName").value.trim()
    if (jmeno == "") {
        alert("Enter a name")
        return
    }

    // najit id z vysledku
    var did = null
    for (var i = 0; i < vysledky.length; i++) {
        if (vysledky[i].ip == ip) did = vysledky[i].id
    }

    fetch("/api/discovery/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoveredId: did, name: jmeno, type: document.getElementById("adoptType").value }),
        credentials: "include",
    })
    .then(function(r) {
        if (r.ok) {
            document.getElementById("adoptDialog").classList.remove("open")
            NactiVysledky()
        } else {
            r.json().then(function(e){ alert(e.error || "Failed") })
        }
    })
});

// hromadny adopt vsech oznacenych
document.getElementById("adoptBtn").addEventListener("click", function() {
    var chb = document.querySelectorAll(".result-check:checked")
    if (chb.length == 0) {
        alert("Select devices first")
        return
    }

    var hotovo = 0
    for (var i = 0; i < chb.length; i++) {
        var id = parseInt(chb[i].dataset.id)
        var dev = null
        for (var k = 0; k < vysledky.length; k++) {
            if (vysledky[k].id == id) dev = vysledky[k]
        }
        if (!dev) continue

        fetch("/api/discovery/adopt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discoveredId: id, name: dev.vendor_guess || dev.ip, type: "router" }),
            credentials: "include",
        })
        .then(function() {
            hotovo++
            // TODO: reload jen jednou na konci
            if (hotovo == chb.length) NactiVysledky()
        })
    }
});

document.getElementById("ignoreBtn").addEventListener("click", function() {
    var chb = document.querySelectorAll(".result-check:checked")
    if (chb.length == 0) return

    var hotovo = 0
    for (var i = 0; i < chb.length; i++) {
        var id = parseInt(chb[i].dataset.id)
        fetch("/api/discovery/ignore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discoveredId: id }),
            credentials: "include",
        })
        .then(function() {
            hotovo++
            if (hotovo == chb.length) NactiVysledky()
        })
    }
});

NactiVysledky()
}

zxcvas()
