(function () {
  var totalEl = document.querySelector("[data-cart-total]");
  if (!totalEl) return;

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

  async function refresh() {
    try {
      var res = await fetch("/cart.js", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      var cart = await res.json();
      var formatted = formatMoney(cart.total_price);
      totalEl.textContent = formatted;
    } catch (_) {}
  }

  window.addEventListener("cart:updated", refresh);
  document.addEventListener("product:added", refresh);
  document.addEventListener("cart-drawer:closed", refresh);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
