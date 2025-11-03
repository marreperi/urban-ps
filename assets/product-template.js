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
    ariaLive.style.position = "absolute";
    ariaLive.style.left = "-9999px";
    document.body.appendChild(ariaLive);

    function announce(message) {
      ariaLive.textContent = message;
      setTimeout(function () {
        ariaLive.textContent = "";
      }, 1000);
    }

    function openCartDrawer() {
      // Trigger cart drawer open
      if (typeof theme !== "undefined" && theme.CartDrawer) {
        if (
          window.CartDrawer &&
          window.CartDrawer.drawer &&
          window.CartDrawer.drawer.open
        ) {
          window.CartDrawer.drawer.open();
        } else {
          // Fallback: trigger drawer open event
          document.dispatchEvent(new CustomEvent("cart:updated"));
          var drawerBtn = document.querySelector(".js-drawer-open-cart");
          if (drawerBtn) {
            drawerBtn.click();
          }
        }
      } else {
        // Fallback: trigger drawer open event
        document.dispatchEvent(new CustomEvent("cart:updated"));
        var drawerBtn = document.querySelector(".js-drawer-open-cart");
        if (drawerBtn) {
          drawerBtn.click();
        }
      }
    }

    // ALWAYS intercept form submission to prevent redirect
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const addToCartButton = form.querySelector(
        "[data-add-to-cart], .add-to-cart"
      );
      if (addToCartButton) {
        addToCartButton.classList.add("btn--loading");
      }

      const formData = new FormData(form);
      const variantId =
        formData.get("id") || form.querySelector('[name="id"]')?.value;
      const quantity = parseInt(formData.get("quantity") || "1", 10);

      const items = [{ id: variantId, quantity: quantity }];

      // Add add-on product if checkbox is checked
      if (addOnCheckbox.checked) {
        const addonVariantId = addOnCheckbox.getAttribute(
          "data-addon-variant-id"
        );
        const addonQuantity = parseInt(
          addOnCheckbox.getAttribute("data-addon-quantity") || "1",
          10
        );
        if (addonVariantId) {
          items.push({ id: addonVariantId, quantity: addonQuantity });
        }
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
          if (!res.ok) {
            return res.json().then(function (err) {
              throw new Error(err.description || "Add to cart failed");
            });
          }
          return res.json();
        })
        .then(function (cart) {
          announce("Produkt zum Warenkorb hinzugefügt");

          // Update cart count and total
          window.dispatchEvent(new CustomEvent("cart:updated"));
          window.dispatchEvent(
            new CustomEvent("product:added", { detail: cart })
          );

          // Open cart drawer
          openCartDrawer();

          // Remove loading state
          if (addToCartButton) {
            addToCartButton.classList.remove("btn--loading");
          }
        })
        .catch(function (err) {
          console.error("Add to cart error:", err);
          announce("Fehler beim Hinzufügen zum Warenkorb");

          // Remove loading state
          if (addToCartButton) {
            addToCartButton.classList.remove("btn--loading");
          }

          // Don't redirect on error, just show message
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
