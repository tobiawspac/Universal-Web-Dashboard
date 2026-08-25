// login + 2fa
function kxzqwp() {

var form1 = document.getElementById("loginForm")
var form2 = document.getElementById("tfaForm")

// prihlaseni heslem
form1.addEventListener("submit", function(e) {
    e.preventDefault()
    var heslo = document.getElementById("loginPassword").value
    var st = document.getElementById("loginStatus")
    var btn = e.target.querySelector('button[type="submit"]')
    btn.disabled = true
    btn.textContent = "Checking..."

    fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: heslo }),
        credentials: "include"
    })
    .then(function(r){ return r.json() })
    .then(function(odp) {
        console.log(odp)
        if (odp.ok == true) {
            location.href = "index.html"
            return
        }
        if (odp.requires2fa == true) {
            // schovaj heslo ukaz kod
            form1.style.display = "none"
            form2.style.display = ""
            document.getElementById("tfaCode").focus()
            return
        }
        st.textContent = "Nespravne heslo"
    })
    .catch(function() {
        st.textContent = "Server neběží. Spusť: node app.js"
    })
    .finally(function() {
        btn.disabled = false
        btn.textContent = "Enter Beacon"
    })
})

// overeni 2fa kodu
form2.addEventListener("submit", function(e) {
    e.preventDefault()
    var kod = document.getElementById("tfaCode").value.trim()
    var st = document.getElementById("tfaStatus")
    var btn = e.target.querySelector('button[type="submit"]')
    btn.disabled = true

    fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            password: document.getElementById("loginPassword").value,
            totpCode: kod
        }),
        credentials: "include"
    })
    .then(function(r){ return r.json() })
    .then(function(odp) {
        if (odp.ok == true) {
            location.href = "index.html"
            return
        }
        st.textContent = odp.error || "Nespravny kod"
    })
    .catch(function() {
        st.textContent = "Chyba spojeni"
    })
    .finally(function() {
        btn.disabled = false
    })
})

}

kxzqwp()
