// pluginy
function qwsazx() {

// upload zip s pluginem
document.getElementById("uploadBtn").addEventListener("click", function() {
    var fileInput = document.getElementById("pluginFile")
    var st = document.getElementById("uploadStatus")

    if (fileInput.files.length == 0) {
        alert("Select a ZIP file")
        return
    }

    st.textContent = "Uploading..."

    fileInput.files[0].arrayBuffer().then(function(buf) {
        return fetch("/api/plugins/upload", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: buf,
            credentials: "include",
        })
    })
    .then(function(r){ return r.json() })
    .then(function(odp) {
        console.log(odp)
        if (odp.id) {
            var zprava = "Installed: " + odp.id
            if (odp.warnings && odp.warnings.length > 0) {
                zprava += " (warnings: " + odp.warnings.join(", ") + ")"
            }
            st.textContent = zprava
            NactiPluginy()
        } else {
            st.textContent = "Error: " + odp.error
        }
    })
});

function NactiPluginy() {
    fetch("/api/plugins", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(pluginy) {
            var div = document.getElementById("pluginsList")
            if (pluginy.length == 0) {
                div.textContent = "No plugins installed."
                return
            }
            var h = ""
            for (var i = 0; i < pluginy.length; i++) {
                var p = pluginy[i]
                var onoff = p.enabled ? "ON" : "OFF"

                h += '<div style="padding:10px 0;border-bottom:1px solid #3a3a3a;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
                h += '<span style="font-weight:bold;min-width:120px;">' + p.name + "</span>"
                h += '<span style="font-size:10px;color:#999;">v' + p.version + "</span>"
                h += '<span style="font-size:10px;" class="mono">[' + p.type.join(", ") + "]</span>"
                h += '<span style="font-size:10px;" class="mono">' + onoff + "</span>"

                if (p.enabled) h += '<button class="button2" onclick="togglePlugin(\'' + p.id + '\', 0)">Disable</button>'
                else h += '<button class="button2" onclick="togglePlugin(\'' + p.id + '\', 1)">Enable</button>'
                h += '<button class="button2 danger" onclick="deletePlugin(\'' + p.id + '\')">Uninstall</button>'
                h += "</div>"
            }
            div.innerHTML = h
        })
}

window.togglePlugin = function(id, en) {
    var ep = en == 1 ? "enable" : "disable"
    fetch("/api/plugins/" + id + "/" + ep, { method: "POST", credentials: "include" })
        .then(function(){ NactiPluginy() })
}

window.deletePlugin = function(id) {
    if (!confirm("Uninstall plugin " + id + "?")) return

    fetch("/api/plugins/" + id, { method: "DELETE", credentials: "include" })
        .then(function(r) {
            if (r.ok) NactiPluginy()
            else r.json().then(function(e){ alert(e.error || "Failed") })
        })
}

NactiPluginy()
}

qwsazx()
