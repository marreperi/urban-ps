(function () {
  var totalEl = document.querySelector("[data-cart-total]");
  if (!totalEl) return;

  // Get VAT rate from data attribute or default to 19%
  var vatRatePercent = parseFloat(
    totalEl.getAttribute("data-vat-rate") || "19"
  );
  var vatRate = vatRatePercent / 100;

  // Store original gross total
  var originalGrossTotal = null;

  function formatMoney(cents) {
    try {
      // Use theme.Currency.formatMoney if available (most reliable)
      if (
        typeof theme !== "undefined" &&
        theme.Currency &&
        theme.Currency.formatMoney
      ) {
        return theme.Currency.formatMoney(cents);
      }
      // Fallback to Shopify.formatMoney with money format
      if (typeof Shopify !== "undefined" && Shopify.formatMoney) {
        var moneyFormat =
          window.Shopify && window.Shopify.moneyFormat
            ? window.Shopify.moneyFormat
            : "€{{amount}}";
        return Shopify.formatMoney(cents, moneyFormat);
      }
    } catch (e) {
      console.warn("[header-cart-total] Format error:", e);
    }
    // Final fallback: basic formatting
    var amount = (cents / 100).toFixed(2);
    return "€ " + amount;
  }

  function getPriceMode() {
    try {
      // price-toggle.liquid and product-template use price_mode; prefer it so the
      // header matches the visible toggle. urbanps_price_mode (e.g. mr-vue-cart) is fallback only.
      var priceMode = localStorage.getItem("price_mode");
      if (priceMode === "net" || priceMode === "gross") {
        return priceMode === "net" ? "net" : "gross";
      }
      var urban = localStorage.getItem("urbanps_price_mode");
      if (urban === "net" || urban === "gross") {
        return urban === "net" ? "net" : "gross";
      }
      return "gross";
    } catch (_) {
      return "gross";
    }
  }

  function computeNetFromGross(grossCents) {
    // Calculate net: gross / (1 + VAT rate)
    var gross = grossCents / 100;
    var net = gross / (1 + vatRate);
    // Round to 2 decimals
    return Math.round(net * 100);
  }

  function updateDisplay() {
    if (originalGrossTotal === null) return;

    var mode = getPriceMode();
    var displayAmount = originalGrossTotal;

    if (mode === "net") {
      displayAmount = computeNetFromGross(originalGrossTotal);
    }

    var formatted = formatMoney(displayAmount);
    totalEl.textContent = formatted;
  }

  async function refresh() {
    try {
      var res = await fetch("/cart.js", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      var cart = await res.json();
      // Store the original gross total
      originalGrossTotal = cart.total_price;
      // Update display based on current mode
      updateDisplay();
    } catch (_) {}
  }

  // Listen for price mode changes
  window.addEventListener("priceToggle:mode", function (e) {
    if (e.detail && e.detail.mode) {
      updateDisplay();
    }
  });

  window.addEventListener("price:mode", function (e) {
    if (e.detail && e.detail.mode) {
      updateDisplay();
    }
  });

  // Listen for storage changes (when price mode changes in another tab)
  window.addEventListener("storage", function (e) {
    if (e.key === "urbanps_price_mode" || e.key === "price_mode") {
      updateDisplay();
    }
  });

  window.addEventListener("cart:updated", refresh);
  document.addEventListener("cart:updated", refresh);
  document.addEventListener("product:added", refresh);
  document.addEventListener("cart-drawer:closed", refresh);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
