// nastaveni - heslo, 2fa, session
function asdfgh() {

// zmena hesla
document.getElementById("changePasswordBtn").addEventListener("click", function() {
    var stare = document.getElementById("currentPassword").value
    var nove = document.getElementById("newPassword").value
    var znovu = document.getElementById("confirmPassword").value
    var st = document.getElementById("passwordStatus")

    if (stare == "" || nove == "") {
        st.textContent = "Fill in all fields."
        return
    }
    if (nove != znovu) {
        st.textContent = "New passwords do not match."
        return
    }
    if (nove.length < 4) {
        st.textContent = "Password must be at least 4 characters."
        return
    }

    fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: stare, newPassword: nove }),
        credentials: "include",
    })
    .then(function(r){ return r.json() })
    .then(function(odp) {
        if (!odp.error) {
            st.textContent = "Password changed successfully."
            document.getElementById("currentPassword").value = ""
            document.getElementById("newPassword").value = ""
            document.getElementById("confirmPassword").value = ""
        } else {
            st.textContent = odp.error
        }
    })
});

function Nacti2fa() {
    fetch("/api/settings/status", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(stav) {
            console.log(stav)
            var divStav = document.getElementById("2faStatus")
            var divSetup = document.getElementById("2faSetup")
            var btnVyp = document.getElementById("disable2faBtn")

            if (stav.totpEnabled == true) {
                divStav.textContent = "2FA is enabled"
                divSetup.style.display = "none"
                btnVyp.style.display = ""
            } else {
                divStav.textContent = "2FA is disabled"
                divSetup.style.display = ""
                btnVyp.style.display = "none"
            }
        })
}

// overit a zapnout 2fa
document.getElementById("verify2faBtn").addEventListener("click", function() {
    fetch("/api/settings/2fa/setup", { method: "POST", credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(setup) {
            if (setup.error) {
                alert(setup.error)
                return
            }
            // qr kod + secret
            document.getElementById("qrCode").src = setup.qrCode
            document.getElementById("manualCode").textContent = setup.secret

            var kod = document.getElementById("totpCode").value.trim()
            if (kod.length != 6) {
                document.getElementById("2faStatus2").textContent = "Enter a 6-digit code"
                return
            }

            fetch("/api/settings/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: kod }),
                credentials: "include",
            })
            .then(function(r){ return r.json() })
            .then(function(overeni) {
                var st2 = document.getElementById("2faStatus2")
                if (!overeni.error) {
                    st2.textContent = "2FA enabled!"
                    Nacti2fa()
                } else {
                    st2.textContent = overeni.error || "Invalid code"
                }
            })
        })
});

document.getElementById("disable2faBtn").addEventListener("click", function() {
    var pw = prompt("Enter your password to disable 2FA:")
    if (!pw) return

    fetch("/api/settings/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
        credentials: "include",
    })
    .then(function(r){ return r.json() })
    .then(function(odp) {
        if (!odp.error) Nacti2fa()
        else alert(odp.error || "Failed")
    })
});

function NactiSession() {
    fetch("/api/settings/sessions", { credentials: "include" })
        .then(function(r){ return r.json() })
        .then(function(sessiony) {
            var div = document.getElementById("sessionsList")
            if (sessiony.length == 0) {
                div.textContent = "No active sessions."
                return
            }
            var h = ""
            for (var i = 0; i < sessiony.length; i++) {
                h += '<div style="padding:6px 0;border-bottom:1px solid #3a3a3a;">Session: ' + sessiony[i].token + "...</div>"
            }
            div.innerHTML = h
        })
}

Nacti2fa()
NactiSession()
}

asdfgh()
