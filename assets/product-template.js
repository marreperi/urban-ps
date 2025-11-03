/**
 * Product Template JS
 * Handles price mode sync and add-on product cart additions
 */

(function () {
  "use strict";

  const STORAGE_KEY = "price_mode";
  const DEFAULT_MODE = "gross";

  // Price mode sync
  function initPriceMode() {
    const priceEls = document.querySelectorAll(
      ".pt-price[data-price-gross][data-price-net]"
    );
    if (!priceEls.length) return;

    function getMode() {
      try {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_MODE;
      } catch (_) {
        return DEFAULT_MODE;
      }
    }

    function setMode(mode) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (_) {}
    }

    function updatePrices() {
      const mode = getMode();
      priceEls.forEach(function (el) {
        el.setAttribute("data-price-mode", mode);
        const grossEl = el.querySelector(".pt-price-gross");
        const netEl = el.querySelector(".pt-price-net");
        if (grossEl && netEl) {
          grossEl.style.display = mode === "gross" ? "" : "none";
          netEl.style.display = mode === "net" ? "" : "none";
        }
      });

      const toggle = document.querySelector("[data-price-toggle-input]");
      if (toggle) {
        const isGross = mode === "gross";
        toggle.checked = isGross;
        toggle.setAttribute("aria-checked", String(isGross));
        const wrapper = toggle.closest("[data-price-toggle]");
        if (wrapper) {
          wrapper.setAttribute("aria-checked", String(isGross));
          wrapper.classList.add("animate");
          setTimeout(function () {
            wrapper.classList.remove("animate");
          }, 200);
        }
      }
    }

    function handleToggle(e) {
      const mode = e.target.checked ? "gross" : "net";
      setMode(mode);
      updatePrices();
      window.dispatchEvent(
        new CustomEvent("price:mode", { detail: { mode: mode } })
      );
    }

    const toggle = document.querySelector("[data-price-toggle-input]");
    if (toggle) {
      toggle.addEventListener("change", handleToggle);
    }

    window.addEventListener("price:mode", function (e) {
      if (e.detail && e.detail.mode) {
        setMode(e.detail.mode);
        updatePrices();
      }
    });

    window.addEventListener("storage", function (e) {
      if (e.key === STORAGE_KEY) {
        updatePrices();
      }
    });

    updatePrices();
  }

  // Add-on product cart logic
  function initAddOnProduct() {
    const addOnCheckbox = document.querySelector("[data-addon-variant-id]");
    if (!addOnCheckbox) return;

    // Find the product form - try multiple selectors
    const form =
      addOnCheckbox.closest("form") ||
      document.querySelector("form.product-single__form") ||
      document.querySelector('form[id^="product-form"]');
    if (!form) {
      console.warn("[product-template] Could not find product form for add-on");
      return;
    }

    const ariaLive = document.createElement("div");
    ariaLive.className = "pt-aria-live";
    ariaLive.setAttribute("aria-live", "polite");
    ariaLive.setAttribute("aria-atomic", "true");
    document.body.appendChild(ariaLive);

    function announce(message) {
      ariaLive.textContent = message;
      setTimeout(function () {
        ariaLive.textContent = "";
      }, 1000);
    }

    form.addEventListener("submit", function (e) {
      if (!addOnCheckbox.checked) return;

      e.preventDefault();
      e.stopPropagation();

      const formData = new FormData(form);
      const variantId =
        formData.get("id") || form.querySelector('[name="id"]')?.value;
      const quantity = parseInt(formData.get("quantity") || "1", 10);
      const addonVariantId = addOnCheckbox.getAttribute(
        "data-addon-variant-id"
      );
      const addonQuantity = parseInt(
        addOnCheckbox.getAttribute("data-addon-quantity") || "1",
        10
      );

      const items = [{ id: variantId, quantity: quantity }];

      if (addonVariantId) {
        items.push({ id: addonVariantId, quantity: addonQuantity });
      }

      fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items: items }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Add to cart failed");
          return res.json();
        })
        .then(function (cart) {
          announce("Produkt zum Warenkorb hinzugefügt");
          if (typeof window.updateCartDrawer === "function") {
            window.updateCartDrawer(cart);
          } else if (
            typeof window.CartDrawer !== "undefined" &&
            window.CartDrawer.open
          ) {
            window.CartDrawer.open();
          }
          if (form.dataset.productFormSubmit) {
            const submitFn = new Function(
              "return " + form.dataset.productFormSubmit
            )();
            if (typeof submitFn === "function") {
              submitFn(cart);
            }
          }
        })
        .catch(function (err) {
          console.error("Add to cart error:", err);
          announce("Fehler beim Hinzufügen zum Warenkorb");
          form.submit();
        });
    });
  }

  // Quantity + CTA row layout (enforce grid)
  function initCTARow() {
    const ctaRow = document.querySelector(".pt-cta-row");
    if (!ctaRow) return;
    const quantityBlock = ctaRow.querySelector(".product__quantity");
    const buttonBlock =
      ctaRow.querySelector("[data-product-form]") ||
      ctaRow.querySelector("form");
    if (quantityBlock && buttonBlock) {
      quantityBlock.style.gridColumn = "1";
      buttonBlock.style.gridColumn = "2";
    }
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initPriceMode();
      initAddOnProduct();
      initCTARow();
    });
  } else {
    initPriceMode();
    initAddOnProduct();
    initCTARow();
  }
})();
