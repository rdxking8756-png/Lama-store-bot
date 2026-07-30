(() => {
  const config = window.LAMA_VERIFY_CONFIG || {};
  const telegram = window.Telegram && window.Telegram.WebApp;
  const loader = document.getElementById("loader");
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

  function hideLoader() {
    loader.style.display = "none";
  }

  function showRetry(message) {
    hideLoader();
    statusText.textContent = message || "Verification failed. Please try again.";
    title.textContent = "Verification Failed";
    retryBtn.style.display = "block";
    showStatus(message || "Something went wrong.", "error");
  }

  function showSuccess() {
    hideLoader();
    statusText.textContent = "Your device has been verified. You can close this window now.";
    title.textContent = "Verified ✓";
    
    const deviceDiv = document.querySelector(".device span");
    if (deviceDiv) {
      deviceDiv.style.borderColor = "#15733b";
    }
    
    showStatus("Device verified successfully!", "done");
    
    // Auto-close after 2 seconds
    setTimeout(() => {
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

    fetch(config.apiUrl.replace(/\/$/, "") + "/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        init_data: initData,
        turnstile_token: token
      })
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        showSuccess();
      } else {
        showRetry(result.message || "Verification failed.");
        if (turnstileWidgetId !== null && window.turnstile) {
          window.turnstile.reset(turnstileWidgetId);
        }
      }
    })
    .catch(error => {
      showRetry(error.message || "Network error. Try again.");
      if (turnstileWidgetId !== null && window.turnstile) {
        window.turnstile.reset(turnstileWidgetId);
      }
    });
  }

  function renderChallenge() {
    if (!window.turnstile) {
      setTimeout(renderChallenge, 100);
      return;
    }

    if (!config.turnstileSiteKey || config.turnstileSiteKey.includes("PASTE_")) {
      showRetry("Turnstile site key not configured. Contact admin.");
      return;
    }

    turnstileWidgetId = window.turnstile.render("#turnstile-container", {
      sitekey: config.turnstileSiteKey,
      theme: "light",
      size: "invisible",
      callback(token) {
        // Challenge passed — verify now
        doVerify(token);
      },
      "expired-callback"() {
        showRetry("Challenge expired. Retrying...");
        setTimeout(() => {
          if (turnstileWidgetId !== null && window.turnstile) {
            window.turnstile.reset(turnstileWidgetId);
            window.turnstile.execute(turnstileWidgetId);
          }
        }, 500);
      },
      "error-callback"() {
        showRetry("Security check failed. Try again.");
      }
    });

    // Auto-execute invisible challenge
    setTimeout(() => {
      if (turnstileWidgetId !== null && window.turnstile) {
        window.turnstile.execute(turnstileWidgetId);
      }
    }, 500);
  }

  retryBtn.addEventListener("click", () => {
    retryBtn.style.display = "none";
    status.className = "status";
    statusText.textContent = "Verifying your device...";
    title.textContent = "Device Verification";
    loader.style.display = "block";
    
    if (turnstileWidgetId !== null && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId);
      setTimeout(() => {
        window.turnstile.execute(turnstileWidgetId);
      }, 300);
    } else {
      renderChallenge();
    }
  });

  window.addEventListener("load", () => {
    statusText.textContent = "Verifying your device...";
    renderChallenge();
  });
})();