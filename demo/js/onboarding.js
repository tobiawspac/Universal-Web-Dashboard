// onboarding 4 kroky
function qwertyu() {

var krok = 1

// prepnuti kroku (musi byt globalni kvuli onclick)
window.goStep = function(n) {
    console.log("krok " + n)

    var steps = document.querySelectorAll(".onboard-step")
    for (var i = 0; i < steps.length; i++) steps[i].classList.remove("active")
    var dots = document.querySelectorAll(".step-dot")
    for (var j = 0; j < dots.length; j++) dots[j].classList.remove("active")

    // predchozi kroky oznac jako hotove
    for (var k = 1; k < n; k++) {
        document.getElementById("dot" + k).classList.add("done")
    }

    document.getElementById("step" + n).classList.add("active")
    document.getElementById("dot" + n).classList.add("active")
    krok = n
}

// krok 2 - nastavit heslo
document.getElementById("onboardSetPass").addEventListener("click", function() {
    var pw1 = document.getElementById("onboardPassword").value
    var pw2 = document.getElementById("onboardPasswordConfirm").value
    var st = document.getElementById("onboardPassStatus")

    if (pw1.length < 4) {
        st.textContent = "Password must be at least 4 characters."
        return
    }
    if (pw1 != pw2) {
        st.textContent = "Passwords do not match."
        return
    }

    fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: "admin123", newPassword: pw1 }),
        credentials: "include",
    })
    .then(function(r){ return r.json() })
    .then(function(odp) {
        if (!odp.error) {
            st.textContent = "Password set!"
            setTimeout(function(){ window.goStep(3) }, 800)
        } else {
            st.textContent = odp.error || "Failed"
        }
    })
});

// test spojeni v kroku 3
document.getElementById("onboardTestDevice").addEventListener("click", function() {
    var ip = document.getElementById("onboardDeviceIP").value.trim()
    if (!ip) {
        alert("Enter an IP address")
        return
    }
    var st = document.getElementById("onboardTestResult")
    st.textContent = "Testing..."

    fetch("/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: ip, timeout: 3000 }),
        credentials: "include",
    })
    .then(function(r){ return r.json() })
    .then(function(v) {
        if (v.alive) st.textContent = "Online (" + v.latencyMs + "ms)"
        else st.textContent = "Offline or unreachable"
    })
});

document.getElementById("onboardAddDevice").addEventListener("click", function() {
    var jmeno = document.getElementById("onboardDeviceName").value.trim()
    var ip = document.getElementById("onboardDeviceIP").value.trim()
    var typ = document.getElementById("onboardDeviceType").value

    if (!jmeno || !ip) {
        alert("Enter name and IP")
        return
    }

    fetch("/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: jmeno, ip: ip, type: typ }),
        credentials: "include",
    })
    .then(function(r) {
        if (r.ok) window.goStep(4)
        else alert("Failed to add device")
    })
});

}

qwertyu()
