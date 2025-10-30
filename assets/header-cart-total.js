(function () {
  var totalEl = document.querySelector("[data-cart-total]");
  if (!totalEl) return;

  function formatMoney(cents) {
    try {
      if (typeof Shopify !== "undefined" && Shopify.formatMoney) {
        return Shopify.formatMoney(cents);
      }
    } catch (_) {}
    return (cents / 100).toFixed(2);
  }

  async function refresh() {
    try {
      var res = await fetch("/cart.js", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      var cart = await res.json();
      totalEl.textContent = formatMoney(cart.total_price);
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
