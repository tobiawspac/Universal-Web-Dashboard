// terminal
function poiqwe() {

var term = document.getElementById("terminal")
var inp = document.getElementById("commandInput")

// vypis radku do terminalu
function Pis(txt, trida) {
    var d = document.createElement("div")
    var s = document.createElement("span")
    s.textContent = txt
    if (trida) s.className = trida
    d.appendChild(s)
    term.appendChild(d)
    term.scrollTop = term.scrollHeight
}

function Prompt() {
    Pis("beacon@field:~$ ", "prompt")
}

// provedeni prikazu
function Exec(cmdRadek) {
    var parts = cmdRadek.trim().split(" ")
    var cmd = parts[0].toLowerCase()
    var args = []
    for (var i = 1; i < parts.length; i++) args.push(parts[i])

    if (cmd == "") {
        // prazdny enter
    }
    else if (cmd == "help") {
        Pis("Available commands:")
        Pis("  ping <ip>     - Ping a device")
        Pis("  devices       - List all devices")
        Pis("  clear / cls   - Clear terminal")
        Pis("  help          - Show this help")
    }
    else if (cmd == "clear") {
        term.innerHTML = ""
        Prompt()
    }
    else if (cmd == "ping") {
        if (!args[0]) {
            Pis("Usage: ping <ip>", "output-error")
        } else {
            var ip = args[0]
            Pis("Pinging " + ip + "...")
            fetch("/ping", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ host: ip, timeout: 5000 }),
                credentials: "include"
            })
            .then(function(r){ return r.json() })
            .then(function(v) {
                if (v.alive) Pis("Reply from " + ip + ": alive, latency=" + (v.latencyMs || "?") + "ms", "output-success")
                else Pis("Request timed out for " + ip, "output-error")
            })
            .catch(function(e) {
                Pis("Error: " + e.message, "output-error")
            })
        }
    }
    else if (cmd == "devices") {
        fetch("/devices", { credentials: "include" })
            .then(function(r){ return r.ok ? r.json() : null })
            .then(function(devs) {
                console.log(devs)
                if (!devs || devs.length == 0) {
                    Pis("No devices configured.", "output-error")
                    return
                }
                Pis("Configured devices:")
                for (var i = 0; i < devs.length; i++) {
                    Pis("  " + devs[i].name + " (" + devs[i].ip + ") [" + (devs[i].type || "unknown") + "]", "output-success")
                }
            })
            .catch(function() {
                Pis("Error loading devices", "output-error")
            })
    }
    else {
        Pis("Unknown command: " + cmd, "output-error")
        Pis('Type "help" for available commands.')
    }

    if (cmd != "clear") Prompt()
}

inp.addEventListener("keydown", function(e) {
    if (e.key != "Enter") return
    var radek = inp.value
    inp.value = ""
    Pis("> " + radek, "muted")
    Exec(radek)
})

Pis("BEACON Field Terminal v1.1")
Pis('Type "help" for available commands.')
Prompt()
inp.focus()

}

poiqwe()
