// pridani zarizeni
function brtzmq() {

var st = document.getElementById("statusMessage")
var typChecku = document.getElementById("checkType")
var portWrap = document.getElementById("portWrap")
var pathWrap = document.getElementById("pathWrap")
var httpsWrap = document.getElementById("httpsWrap")
var snmpChk = document.getElementById("snmpEnabled")
var snmpComm = document.getElementById("snmpCommunity")

function Vypis(txt, err) {
    st.textContent = txt
    if (err) st.style.color = "#bfbfbf"
    else st.style.color = "white"
}

// nacte nastaveni checku z formulare
function Cfg() {
    var c = {}
    c.checkType = typChecku.value
    var p = document.getElementById("devicePort").value
    if (p != "") c.port = Number(p)
    var ph = document.getElementById("httpPath").value
    if (ph != "") c.httpPath = ph
    c.https = document.getElementById("useHttps").checked
    return c
}

// ukaz/schovej pole podle typu checku
typChecku.addEventListener("change", function() {
    var t = typChecku.value
    if (t == "http" || t == "tcp") portWrap.style.display = ""
    else portWrap.style.display = "none"

    if (t == "http") {
        pathWrap.style.display = ""
        httpsWrap.style.display = ""
    } else {
        pathWrap.style.display = "none"
        httpsWrap.style.display = "none"
    }
})

snmpChk.addEventListener("change", function() {
    if (snmpChk.checked) snmpComm.style.display = ""
    else snmpComm.style.display = "none"
})

// test dostupnosti tlacitko
document.getElementById("pingIp").addEventListener("click", function() {
    var btn = this
    var ip = document.getElementById("deviceIP").value.trim()
    if (ip == "") {
        Vypis("Zadejte IP adresu.", true)
        return
    }

    btn.disabled = true
    btn.textContent = "Checking..."
    Vypis("Kontroluji dostupnost...")

    var body = { host: ip, timeout: 5000, checkType: Cfg().checkType }
    if (Cfg().port != null) body.port = Cfg().port
    if (Cfg().httpPath != null) body.httpPath = Cfg().httpPath
    body.https = Cfg().https

    fetch("/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
    })
    .then(function(r){ return r.json() })
    .then(function(vysl) {
        console.log(vysl)
        if (vysl.alive) {
            var ms = ""
            if (vysl.latencyMs != null) ms = " (" + vysl.latencyMs + " ms)"
            Vypis("Zařízení " + ip + " je online" + ms + ".")
        } else {
            Vypis("Zařízení " + ip + " není dostupné.", true)
        }
    })
    .catch(function() {
        Vypis("Server error. Check if node app.js is running.", true)
    })
    .finally(function() {
        btn.disabled = false
        btn.textContent = "Test Check"
    })
});

// samotne pridani
document.getElementById("addDeviceButton").addEventListener("click", function() {
    var jmeno = document.getElementById("deviceName").value.trim()
    var ip = document.getElementById("deviceIP").value.trim()
    var typ = document.getElementById("deviceType").value
    var poznamky = document.getElementById("deviceNotes").value.trim()

    if (jmeno == "" || ip == "") {
        Vypis("Zadejte jmeno a IP adresu.", true)
        return
    }

    var body = {
        name: jmeno,
        ip: ip,
        type: typ,
        notes: poznamky,
        checkType: Cfg().checkType,
        https: Cfg().https,
        snmp_enabled: 0,
        snmp_community: "public"
    }
    // TODO: zkratit tenhle blok
    if (Cfg().port != null) body.port = Cfg().port
    if (Cfg().httpPath != null) body.httpPath = Cfg().httpPath

    if (snmpChk.checked) {
        body.snmp_enabled = 1
        if (snmpComm.value.trim() != "") body.snmp_community = snmpComm.value.trim()
    }

    fetch("/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
    })
    .then(function(res) {
        if (res.ok) {
            Vypis("Zarizeni pridano.")
            setTimeout(function(){ location.href = "index.html" }, 500)
        } else {
            res.json().then(function(e) {
                Vypis(e.error || "Chyba pri pridavani.", true)
            })
        }
    })
    .catch(function() {
        Vypis("Server error. Check if node app.js is running.", true)
    })
});

}

brtzmq()
