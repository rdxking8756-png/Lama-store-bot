(() => {
  const config = window.LAMA_VERIFY_CONFIG || {};
  const telegram = window.Telegram && window.Telegram.WebApp;
  const statusText = document.getElementById("status-text");
  const title = document.getElementById("title");
  const retryBtn = document.getElementById("retry-button");
  const status = document.getElementById("status");
  const turnstileContainer = document.getElementById("turnstile-container");
  
  let turnstileWidgetId = null;

  if (telegram) {
    telegram.ready();
    telegram.expand();
    telegram.setHeaderColor('#eef4fb');
    telegram.setBackgroundColor('#eef4fb');
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = "status show " + type;
  }

  function showRetry(message) {
    statusText.textContent = message || "Verification failed. Please try again.";
    title.textContent = "Verification Failed";
    retryBtn.style.display = "block";
    showStatus(message || "Something went wrong.", "error");
  }

  function showSuccess() {
    statusText.textContent = "Your device has been verified. You can close this window now.";
    title.textContent = "Verified ✓";
    
    const deviceDiv = document.querySelector(".device span");
    if (deviceDiv) {
      deviceDiv.style.borderColor = "#15733b";
    }
    
    showStatus("Device verified successfully!", "done");
    
    setTimeout(function() {
      if (telegram) {
        telegram.close();
      }
    }, 2000);
  }

  function doVerify(token) {
    const initData = telegram ? telegram.initData : "";

    if (!config.apiUrl || config.apiUrl.includes("YOUR-DOMAIN")) {
      showRetry("API URL not configured. Contact admin.");
      return;
    }
    if (!initData) {
      showRetry("Open this page only from Telegram bot.");
      return;
    }

    statusText.textContent = "Completing verification...";
    showStatus("Verifying...", "loading");

    fetch(config.apiUrl.replace(/\/$/, "") + "/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        init_data: initData,
        turnstile_token: token
      })
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
      if (result.success) {
        showSuccess();
      } else {
        showRetry(result.message || "Verification failed.");
        resetTurnstile();
      }
    })
    .catch(function(error) {
      showRetry(error.message || "Network error. Try again.");
      resetTurnstile();
    });
  }

  function resetTurnstile() {
    if (turnstileWidgetId !== null && window.turnstile) {
      try {
        window.turnstile.reset(turnstileWidgetId);
      } catch(e) {}
    }
  }

  function renderChallenge() {
    if (!window.turnstile) {
      setTimeout(renderChallenge, 200);
      return;
    }

    if (!config.turnstileSiteKey || config.turnstileSiteKey.includes("PASTE_")) {
      showRetry("Turnstile site key not configured. Contact admin.");
      return;
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
