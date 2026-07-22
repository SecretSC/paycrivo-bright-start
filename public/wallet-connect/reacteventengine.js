// PayCrivo Wallet Connect — universal engine (PLACEHOLDER).
//
// Replace the contents of this file with the real production
// `reacteventengine.js` you were given. This placeholder just fires the
// PayCrivo wallet events so the checkout flow can be exercised in dev.
//
// The real engine must:
//   - bind to buttons with class `cnnctAprBtn` (PayCrivo's connect button)
//   - talk to run_bcccb840ee.php in the SAME folder as this file
//     (relative path './run_bcccb840ee.php')
//   - dispatch `paycrivo:wallet-connected` on success
//     and `paycrivo:wallet-error` on failure
(function () {
  if (typeof window === "undefined") return;
  if (window.__paycrivoWalletEnginePlaceholder) return;
  window.__paycrivoWalletEnginePlaceholder = true;

  function bind() {
    document.querySelectorAll("button.cnnctAprBtn").forEach(function (btn) {
      if (btn.__paycrivoBound) return;
      btn.__paycrivoBound = true;
      btn.addEventListener("click", function () {
        // Placeholder: pretend the wallet connected after a short delay.
        setTimeout(function () {
          window.dispatchEvent(new CustomEvent("paycrivo:wallet-connected", {
            detail: { placeholder: true },
          }));
        }, 800);
      }, { passive: true });
    });
  }

  window.paycrivoInitWallet = bind;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
  // Rebind when React remounts the button.
  window.addEventListener("paycrivo:wallet-button-ready", bind);
})();