var telegram = window.Telegram && window.Telegram.WebApp;
var config = window.LAMA_VERIFY_CONFIG || {};
var statusEl = document.getElementById("status");

if (telegram) {
  telegram.ready();
  telegram.expand();
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = "status show " + type;
}

function sendToBackend(token) {
  var initData = telegram ? telegram.initData : "";

  if (!config.apiUrl || config.apiUrl.indexOf("YOUR-DOMAIN") > -1) {
    showStatus("API URL not set.", "error");
    return;
  }
  if (!initData) {
    showStatus("Open from Telegram only.", "error");
    return;
  }

  showStatus("Verifying...", "loading");

  fetch(config.apiUrl.replace(/\/$/, "") + "/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      init_data: initData,
      turnstile_token: token
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      showStatus("Device verified! Closing...", "done");
      var dev = document.querySelector(".device span");
      if (dev) dev.style.borderColor = "#15733b";
      setTimeout(function() {
        if (telegram) telegram.close();
      }, 1800);
    } else {
      showStatus(result.message || "Failed.", "error");
      if (window.turnstile) window.turnstile.reset();
    }
  })
  .catch(function() {
    showStatus("Network error. Try again.", "error");
    if (window.turnstile) window.turnstile.reset();
  });
}

function onTurnstileCallback(token) {
  sendToBackend(token);
}

function onTurnstileError() {
  showStatus("Security check failed. Refresh page.", "error");
}
    turnstileContainer.style.display = "block";
    statusText.textContent = "Complete the security check below to continue.";
    title.textContent = "Device Verification";

    try {
      turnstileWidgetId = window.turnstile.render("#turnstile-container", {
        sitekey: config.turnstileSiteKey,
        theme: "light",
        callback: function(token) {
          doVerify(token);
        },
        "expired-callback": function() {
          showRetry("Challenge expired. Please try again.");
        },
        "error-callback": function() {
          showRetry("Security check failed. Please refresh and try again.");
        }
      });
    } catch(e) {
      showRetry("Failed to load security check. Refresh page.");
    }
  }

  retryBtn.addEventListener("click", function() {
    retryBtn.style.display = "none";
    status.className = "status";
    statusText.textContent = "Complete the security check below to continue.";
    title.textContent = "Device Verification";
    turnstileContainer.style.display = "block";
    resetTurnstile();
  });

  window.addEventListener("load", function() {
    renderChallenge();
  });
})();
