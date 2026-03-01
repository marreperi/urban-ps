(function () {
  "use strict";

  function readConfig() {
    var el = document.querySelector("[data-price-toggle-config]");
    if (!el) return null;
    try {
      var json = el.getAttribute("data-price-toggle-config");
      return JSON.parse(json);
    } catch (e) {
      console.warn("[price-toggle] Invalid config JSON");
      return null;
    }
  }

  function selectAll(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function getMode(key) {
    try {
      var saved = localStorage.getItem(key);
      return saved === "net" ? "net" : "gross";
    } catch (_) {
      return "gross";
    }
  }

  function setMode(key, mode) {
    try {
      localStorage.setItem(key, mode);
    } catch (_) {}
  }

  function parseNumberFromText(text, dec, thou) {
    if (typeof text !== "string") return NaN;
    var cleaned = text.trim();
    // remove currency symbols and spaces
    cleaned = cleaned.replace(/[^0-9.,\-\s]/g, "");
    // remove thousands separators
    if (thou === "space") cleaned = cleaned.replace(/\s+/g, "");
    else if (thou === ",") cleaned = cleaned.replace(/,(?=\d{3}(\D|$))/g, "");
    else if (thou === ".") cleaned = cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
    // normalize decimal
    if (dec === ",") cleaned = cleaned.replace(/,/g, ".");
    return parseFloat(cleaned);
  }

  function formatNumber(value, cfg) {
    var decimals = Math.max(0, Math.min(4, parseInt(cfg.decimals || 2, 10)));
    var dec = cfg.decimal_separator || ",";
    var thou = cfg.thousands_separator || ".";
    var parts;
    var n = value;
    if (!isFinite(n)) return "";
    var sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    var s = n.toFixed(decimals);
    parts = s.split(".");
    var intPart = parts[0];
    var fracPart = parts[1] || "";
    if (thou !== "none") {
      var rgx = /\B(?=(\d{3})+(?!\d))/g;
      var sep = thou === "space" ? " " : thou;
      intPart = intPart.replace(rgx, sep);
    }
    return (
      sign +
      intPart +
      (decimals ? (dec === "." ? "." : ",") : "") +
      (decimals ? fracPart : "")
    );
  }

  function roundByMode(value, decimals, mode) {
    var factor = Math.pow(10, decimals);
    var x = value * factor;
    switch (mode) {
      case "floor":
        return Math.floor(x) / factor;
      case "ceil":
        return Math.ceil(x) / factor;
      case "bankers": {
        var n = Math.floor(x);
        var r = x - n;
        if (r > 0.5) return (n + 1) / factor;
        if (r < 0.5) return n / factor;
        return (n % 2 === 0 ? n : n + 1) / factor;
      }
      case "half-up":
      default:
        return Math.round(x) / factor;
    }
  }

  function ensureAmountWrapper(node) {
    var span = node.querySelector("[data-price-amount]");
    if (span) return span;
    // create wrapper around numeric portion: fallback to wrap entire text
    span = document.createElement("span");
    span.setAttribute("data-price-amount", "");
    span.textContent = node.textContent.trim();
    node.textContent = "";
    node.appendChild(span);
    return span;
  }

  function readGrossFromNode(node, cfg) {
    if (node.hasAttribute("data-price-value")) {
      var v = parseFloat(node.getAttribute("data-price-value"));
      return isFinite(v) ? v : NaN;
    }
    var txt = node.textContent || "";
    return parseNumberFromText(
      txt,
      cfg.decimal_separator,
      cfg.thousands_separator
    );
  }

  function computeNet(gross, cfg) {
    var rate = parseFloat(cfg.vat_rate_percent || 0) / 100;
    var net = gross / (1 + rate);
    return roundByMode(
      net,
      parseInt(cfg.decimals || 2, 10),
      cfg.rounding_mode || "half-up"
    );
  }

  function renderAll(mode, cfg) {
    if (!cfg || !cfg.price_selectors) return;
    var selectors = cfg.price_selectors
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (!selectors.length) return;
    var nodes = selectAll(selectors.join(","));
    if (!nodes.length) return;

    var updates = [];
    nodes.forEach(function (node) {
      if (node.querySelector(".pt-price-gross") && node.querySelector(".pt-price-net")) {
        return;
      }
      if (!node.__priceOriginalGross) {
        var gross = readGrossFromNode(node, cfg);
        if (!isFinite(gross)) return;
        node.__priceOriginalGross = gross;
        ensureAmountWrapper(node);
        if (!node.querySelector(".price-suffix")) {
          var suffix = document.createElement("span");
          suffix.className = "price-suffix";
          suffix.style.marginInlineStart = "4px";
          node.appendChild(suffix);
        }
      }
      if (!isFinite(node.__priceOriginalGross)) return;
      updates.push(node);
    });

    updates.forEach(function (node) {
      var amountEl = node.querySelector("[data-price-amount]") || node;
      var value =
        mode === "net"
          ? computeNet(node.__priceOriginalGross, cfg)
          : node.__priceOriginalGross;
      var formatted = formatNumber(value, cfg);
      var nodePrefix = node.getAttribute("data-price-prefix") || "";
      var currencyPrefix = cfg.currency_prefix || "";
      var parts = [];
      if (nodePrefix) parts.push(nodePrefix);
      parts.push((currencyPrefix ? currencyPrefix + " " : "") + formatted);
      amountEl.textContent = parts.join(" ");
      var suffixEl = node.querySelector(".price-suffix");
      if (suffixEl)
        suffixEl.textContent =
          mode === "net"
            ? cfg.net_suffix_text || ""
            : cfg.gross_suffix_text || "";
      node.setAttribute("data-price-processed", "true");
    });
  }

  function syncToggles(mode) {
    selectAll("[data-price-toggle]").forEach(function (wrap) {
      var input = wrap.querySelector("[data-price-toggle-input]");
      var checked = mode === "gross";
      if (input) input.checked = checked;
      wrap.setAttribute("aria-checked", String(checked));
      wrap.classList.add("animate");
      window.setTimeout(function () {
        wrap.classList.remove("animate");
      }, 200);
    });
  }

  function initUI(mode) {
    syncToggles(mode);
  }

  function main() {
    var cfg = readConfig();
    if (!cfg) return; // graceful no-op
    var key = cfg.persist_key || "price_mode";
    var mode = getMode(key);
    initUI(mode);
    renderAll(mode, cfg);

    // Toggle listeners
    selectAll("[data-price-toggle-input]").forEach(function (input) {
      input.addEventListener("change", function (e) {
        var next = e.target.checked ? "gross" : "net";
        setMode(key, next);
        syncToggles(next);
        renderAll(next, cfg);
        window.dispatchEvent(
          new CustomEvent("priceToggle:mode", { detail: { mode: next } })
        );
      });
    });

    window.addEventListener("storage", function (e) {
      if (e.key === key || e.key === "price_mode") {
        var next = e.newValue === "net" ? "net" : "gross";
        syncToggles(next);
        renderAll(next, cfg);
      }
    });

    window.addEventListener("price:mode", function (e) {
      if (e && e.detail && e.detail.mode) {
        var next = e.detail.mode;
        syncToggles(next);
        renderAll(next, cfg);
      }
    });

    window.addEventListener("priceToggle:mode", function (e) {
      var next = (e && e.detail && e.detail.mode) || mode;
      syncToggles(next);
      renderAll(next, cfg);
    });

    // Optional observer for dynamically injected prices
    try {
      var mo = new MutationObserver(function (mutations) {
        var shouldRender = mutations.some(function (m) {
          return Array.prototype.some.call(m.addedNodes || [], function (n) {
            return n.nodeType === 1;
          });
        });
        if (shouldRender) renderAll(getMode(key), cfg);
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
