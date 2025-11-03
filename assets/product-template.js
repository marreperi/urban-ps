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
    console.log("[product-template] initAddOnProduct: Starting");
    const addOnCheckbox = document.querySelector("[data-addon-variant-id]");
    console.log("[product-template] Add-on checkbox found:", !!addOnCheckbox);
    if (!addOnCheckbox) {
      console.log("[product-template] No add-on checkbox found, skipping");
      return;
    }

    // Find the product form - try multiple selectors
    // The checkbox might not be inside the form, so we need to search for it
    let form = null;

    // Strategy 1: Find form by class (most reliable)
    form = document.querySelector("form.product-single__form");
    console.log(
      "[product-template] Form from .product-single__form:",
      !!form,
      form?.tagName,
      form?.id
    );

    // Strategy 2: If not found, find form by ID pattern (AddToCartForm-*)
    if (!form || form.tagName !== "FORM") {
      const allForms = document.querySelectorAll('form[id^="AddToCartForm"]');
      if (allForms.length > 0) {
        form = allForms[allForms.length - 1]; // Get the last one (most recent)
        console.log(
          "[product-template] Form from id^='AddToCartForm' (found",
          allForms.length,
          "forms):",
          !!form,
          form?.tagName,
          form?.id
        );
      }
    }

    // Strategy 3: Find form containing the variant select
    if (!form || form.tagName !== "FORM") {
      const variantSelect = document.querySelector(
        'select[name="id"][data-product-select]'
      );
      if (variantSelect) {
        const foundForm = variantSelect.closest("form");
        if (foundForm && foundForm.tagName === "FORM") {
          form = foundForm;
          console.log(
            "[product-template] Form from variant select closest:",
            !!form,
            form?.tagName,
            form?.id
          );
        }
      }
    }

    // Strategy 4: Find form containing add-to-cart button
    if (!form || form.tagName !== "FORM") {
      const addToCartBtn = document.querySelector(
        "[data-add-to-cart], .add-to-cart"
      );
      if (addToCartBtn) {
        const foundForm = addToCartBtn.closest("form");
        if (foundForm && foundForm.tagName === "FORM") {
          form = foundForm;
          console.log(
            "[product-template] Form from add-to-cart button closest:",
            !!form,
            form?.tagName,
            form?.id
          );
        }
      }
    }

    // Final validation
    console.log(
      "[product-template] Final form:",
      !!form,
      form?.tagName,
      form?.className,
      form?.id
    );
    if (!form || form.tagName !== "FORM") {
      console.error(
        "[product-template] Could not find valid product form for add-on. Last found:",
        form
      );
      console.error(
        "[product-template] Available forms on page:",
        document.querySelectorAll("form").length
      );
      console.error(
        "[product-template] Forms:",
        Array.from(document.querySelectorAll("form")).map((f) => ({
          tagName: f.tagName,
          id: f.id,
          className: f.className,
        }))
      );
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

    // ALWAYS intercept form submission to prevent redirect
    form.addEventListener("submit", function (e) {
      console.log("[product-template] Form submit intercepted");
      e.preventDefault();
      e.stopPropagation();

      const addToCartButton = form.querySelector(
        "[data-add-to-cart], .add-to-cart"
      );
      console.log("[product-template] Add to cart button:", !!addToCartButton);
      if (addToCartButton) {
        addToCartButton.classList.add("btn--loading");
      }

      const formData = new FormData(form);
      const variantId =
        formData.get("id") || form.querySelector('[name="id"]')?.value;
      const quantity = parseInt(formData.get("quantity") || "1", 10);
      console.log(
        "[product-template] Main product - variantId:",
        variantId,
        "quantity:",
        quantity
      );

      const items = [{ id: variantId, quantity: quantity }];

      // Add add-on product if checkbox is checked
      if (addOnCheckbox.checked) {
        console.log("[product-template] Add-on checkbox is checked");
        const addonVariantId = addOnCheckbox.getAttribute(
          "data-addon-variant-id"
        );
        const addonQuantity = parseInt(
          addOnCheckbox.getAttribute("data-addon-quantity") || "1",
          10
        );
        console.log(
          "[product-template] Add-on product - variantId:",
          addonVariantId,
          "quantity:",
          addonQuantity
        );
        if (addonVariantId) {
          items.push({ id: addonVariantId, quantity: addonQuantity });
        }
      } else {
        console.log("[product-template] Add-on checkbox is NOT checked");
      }

      console.log("[product-template] Sending items to cart:", items);

      fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items: items }),
      })
        .then(function (res) {
          console.log(
            "[product-template] Cart add response status:",
            res.status
          );
          if (!res.ok) {
            return res.json().then(function (err) {
              console.error("[product-template] Cart add error response:", err);
              // 422 means validation error (often product already in cart or max quantity)
              // Still refresh cart display even on error
              if (res.status === 422) {
                console.log(
                  "[product-template] 422 error - refreshing cart display"
                );
                window.dispatchEvent(new CustomEvent("cart:updated"));
                // Also fetch cart to update UI
                fetch("/cart.js")
                  .then(function (res) {
                    return res.json();
                  })
                  .then(function (cart) {
                    window.dispatchEvent(
                      new CustomEvent("cart:updated", { detail: cart })
                    );
                  })
                  .catch(function (e) {
                    console.warn(
                      "[product-template] Failed to refresh cart:",
                      e
                    );
                  });
              }
              throw new Error(err.description || "Add to cart failed");
            });
          }
          return res.json();
        })
        .then(function (cart) {
          console.log("[product-template] Cart add success, cart:", cart);
          announce("Produkt zum Warenkorb hinzugefügt");

          // The theme's CartDrawer listens for 'ajaxProduct:added' event
          // Dispatch it to trigger cart drawer open
          const addToCartBtn = form.querySelector(
            "[data-add-to-cart], .add-to-cart"
          );
          console.log("[product-template] Dispatching ajaxProduct:added event");
          form.dispatchEvent(
            new CustomEvent("ajaxProduct:added", {
              detail: {
                product: cart.items && cart.items[0] ? cart.items[0] : cart,
                addToCartBtn: addToCartBtn,
              },
              bubbles: true,
            })
          );

          // Also dispatch on document for CartDrawer listener
          document.dispatchEvent(
            new CustomEvent("ajaxProduct:added", {
              detail: {
                product: cart.items && cart.items[0] ? cart.items[0] : cart,
                addToCartBtn: addToCartBtn,
              },
              bubbles: true,
            })
          );

          // Update cart count and total
          window.dispatchEvent(new CustomEvent("cart:updated"));
          console.log("[product-template] Dispatched cart:updated event");

          // Remove loading state
          if (addToCartButton) {
            addToCartButton.classList.remove("btn--loading");
          }
          console.log("[product-template] Form submission complete");
        })
        .catch(function (err) {
          console.error("[product-template] Add to cart error:", err);
          announce("Fehler beim Hinzufügen zum Warenkorb");

          // Remove loading state
          if (addToCartButton) {
            addToCartButton.classList.remove("btn--loading");
          }

          // Don't redirect on error, just show message
        });
    });
    console.log("[product-template] Form submit listener attached");
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
