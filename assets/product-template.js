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
      const formData = new FormData(form);
      const quantity = parseInt(formData.get("quantity") || "1", 10);
      const ctaRow = form.querySelector(".pt-cta-row[data-quote-threshold]");
      const threshold = ctaRow
        ? parseInt(ctaRow.getAttribute("data-quote-threshold") || "3", 10)
        : 3;
      if (quantity >= threshold) {
        e.preventDefault();
        e.stopPropagation();
        const sectionEl = form.closest("[data-section-id][data-product-id]");
        if (sectionEl) {
          openQuoteModal(sectionEl, quantity);
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const addToCartButton = form.querySelector(
        "[data-add-to-cart], .add-to-cart"
      );
      console.log("[product-template] Add to cart button:", !!addToCartButton);
      if (addToCartButton) {
        addToCartButton.classList.add("btn--loading");
      }

      const variantId =
        formData.get("id") || form.querySelector('[name="id"]')?.value;
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

      // Helper function to add items to cart
      function addItemsToCart(itemsToAdd) {
        return fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ items: itemsToAdd }),
        });
      }

      // Helper function to handle successful cart add
      function handleCartSuccess(cart, was422) {
        console.log("[product-template] Cart add success, cart:", cart);
        
        // Only announce success if this wasn't a 422 error
        if (!was422) {
          announce("Produkt zum Warenkorb hinzugefügt");
        }

        // The theme's CartDrawer listens for 'ajaxProduct:added' event
        const addToCartBtn = form.querySelector(
          "[data-add-to-cart], .add-to-cart"
        );
        console.log("[product-template] Dispatching ajaxProduct:added event");
        form.dispatchEvent(
          new CustomEvent("ajaxProduct:added", {
            detail: {
              product: cart.items && cart.items.length > 0 ? cart.items[0] : cart,
              addToCartBtn: addToCartBtn,
            },
            bubbles: true,
          })
        );

        document.dispatchEvent(
          new CustomEvent("ajaxProduct:added", {
            detail: {
              product: cart.items && cart.items.length > 0 ? cart.items[0] : cart,
              addToCartBtn: addToCartBtn,
            },
            bubbles: true,
          })
        );

        // Update cart count and total (only if not already updated from 422 handler)
        if (!was422) {
          window.dispatchEvent(new CustomEvent("cart:updated"));
          console.log("[product-template] Dispatched cart:updated event");
        }

        // Remove loading state
        if (addToCartButton) {
          addToCartButton.classList.remove("btn--loading");
        }
        console.log("[product-template] Form submission complete");
      }

      // Helper function to refresh cart after 422
      function refreshCartAfter422() {
        return fetch("/cart.js")
          .then(function (res) {
            return res.json();
          })
          .then(function (cart) {
            console.log("[product-template] Cart refreshed after 422");
            cart._was422 = true;
            window.dispatchEvent(
              new CustomEvent("cart:updated", { detail: cart })
            );
            // Trigger cart drawer to open/update
            const addToCartBtn = form.querySelector(
              "[data-add-to-cart], .add-to-cart"
            );
            form.dispatchEvent(
              new CustomEvent("ajaxProduct:added", {
                detail: {
                  product: cart.items && cart.items.length > 0 ? cart.items[0] : cart,
                  addToCartBtn: addToCartBtn,
                },
                bubbles: true,
              })
            );
            document.dispatchEvent(
              new CustomEvent("ajaxProduct:added", {
                detail: {
                  product: cart.items && cart.items.length > 0 ? cart.items[0] : cart,
                  addToCartBtn: addToCartBtn,
                },
                bubbles: true,
              })
            );
            return cart;
          });
      }

      // Try adding all items together first
      addItemsToCart(items)
        .then(function (res) {
          console.log(
            "[product-template] Cart add response status:",
            res.status
          );
          if (!res.ok) {
            return res.json().then(function (err) {
              console.error("[product-template] Cart add error response:", err);
              // 422 means validation error (often product already in cart or max quantity)
              if (res.status === 422) {
                console.log(
                  "[product-template] 422 error - checking if add-on needs separate handling"
                );
                
                // If we have multiple items and one failed, try adding them separately
                // This handles the case where main product is at max but add-on can still be added
                if (items.length > 1 && addOnCheckbox.checked) {
                  console.log(
                    "[product-template] Multiple items failed, trying to add add-on separately"
                  );
                  const addonVariantId = addOnCheckbox.getAttribute(
                    "data-addon-variant-id"
                  );
                  const addonQuantity = parseInt(
                    addOnCheckbox.getAttribute("data-addon-quantity") || "1",
                    10
                  );
                  
                  if (addonVariantId) {
                    // Try adding just the add-on product
                    return addItemsToCart([
                      { id: addonVariantId, quantity: addonQuantity },
                    ])
                      .then(function (addonRes) {
                        if (addonRes.ok) {
                          console.log(
                            "[product-template] Add-on added successfully separately"
                          );
                          return addonRes.json();
                        } else {
                          console.log(
                            "[product-template] Add-on also failed, refreshing cart"
                          );
                          return refreshCartAfter422();
                        }
                      })
                      .catch(function (e) {
                        console.warn(
                          "[product-template] Error adding add-on separately:",
                          e
                        );
                        return refreshCartAfter422();
                      });
                  }
                }
                
                // Single item failed or no add-on - just refresh cart
                return refreshCartAfter422();
              }
              // For other errors, show error message
              throw new Error(err.description || "Add to cart failed");
            });
          }
          return res.json();
        })
        .then(function (cart) {
          const was422 = cart._was422;
          handleCartSuccess(cart, was422);
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

  // Open quote request modal and set hidden quantity field
  function openQuoteModal(sectionEl, quantity) {
    const sectionId = sectionEl.getAttribute("data-section-id");
    const productId = sectionEl.getAttribute("data-product-id");
    if (!sectionId || !productId) return;
    const modal = document.getElementById(
      "QuoteRequestModal-" + sectionId + "-" + productId
    );
    if (!modal) return;
    const qtyInput = document.getElementById(
      "QuoteRequestQuantity-" + sectionId + "-" + productId
    );
    if (qtyInput) qtyInput.value = String(quantity);
    if (!modal._quoteCloseBound) {
      modal._quoteCloseBound = true;
      var close = function () {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      };
      modal.querySelectorAll("[data-quote-modal-close]").forEach(function (el) {
        el.addEventListener("click", close);
      });
    }
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  // Quote request: button text by quantity + submit opens modal when qty >= threshold
  function initQuoteRequest() {
    var rows = document.querySelectorAll(".pt-cta-row[data-quote-threshold]");
    rows.forEach(function (ctaRow) {
      var form = ctaRow.closest("form");
      if (!form) return;
      var quantityInput = form.querySelector('input[name="quantity"]');
      var button = form.querySelector("[data-add-to-cart], .add-to-cart");
      var buttonSpan = button
        ? button.querySelector("[data-add-to-cart-text]")
        : null;
      var threshold = parseInt(
        ctaRow.getAttribute("data-quote-threshold") || "3",
        10
      );
      var quoteText =
        ctaRow.getAttribute("data-quote-button-text") ||
        "Jetzt Angebot einholen";
      var defaultText = buttonSpan
        ? buttonSpan.getAttribute("data-default-text") || "In den Warenkorb"
        : "In den Warenkorb";

      function updateButtonText() {
        if (!buttonSpan || !button) return;
        var qty = parseInt(quantityInput.value || "1", 10);
        if (qty >= threshold) {
          buttonSpan.textContent = quoteText;
          button.setAttribute("data-quote-mode", "true");
        } else {
          buttonSpan.textContent = defaultText;
          button.removeAttribute("data-quote-mode");
        }
      }

      if (quantityInput) {
        quantityInput.addEventListener("input", updateButtonText);
        quantityInput.addEventListener("change", updateButtonText);
        quantityInput.addEventListener("keyup", updateButtonText);
        updateButtonText();
        var qtyWrapper = quantityInput.closest(".js-qty__wrapper");
        if (qtyWrapper) {
          qtyWrapper.addEventListener("click", function () {
            setTimeout(updateButtonText, 0);
          });
        }
      }

      form.addEventListener(
        "submit",
        function (e) {
          var qty = parseInt(
            form.querySelector('input[name="quantity"]').value || "1",
            10
          );
          if (qty >= threshold) {
            e.preventDefault();
            e.stopPropagation();
            var sectionEl = form.closest("[data-section-id][data-product-id]");
            if (sectionEl) openQuoteModal(sectionEl, qty);
          }
        },
        true
      );
    });
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initPriceMode();
      initQuoteRequest();
      initAddOnProduct();
      initCTARow();
    });
  } else {
    initPriceMode();
    initQuoteRequest();
    initAddOnProduct();
    initCTARow();
  }
})();
