/**
 * Product Info Tabs - Smooth scroll and active state management
 * All content is visible; tabs are anchor links that scroll to sections
 */

(function () {
  "use strict";

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    const tabsContainer = document.querySelector(".classic-tabs-container");
    if (!tabsContainer) return;

    const tabButtons = tabsContainer.querySelectorAll(".tab-button");
    const contentBlocks = tabsContainer.querySelectorAll(
      ".cms-block[id^='block-']"
    );

    if (tabButtons.length === 0 || contentBlocks.length === 0) return;

    // Smooth scroll on tab click
    tabButtons.forEach(function (button) {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = button.getAttribute("href");
        if (!targetId || !targetId.startsWith("#")) return;

        const target = document.querySelector(targetId);
        if (target) {
          // Update active state before scroll
          updateActiveNav(button);

          // Smooth scroll to target
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          // Update URL hash without scrolling again
          if (history.pushState) {
            history.pushState(null, null, targetId);
          } else {
            location.hash = targetId;
          }
        }
      });
    });

    // Update active state on scroll using IntersectionObserver
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px", // Trigger when block is in upper third of viewport
      threshold: 0,
    };

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const blockId = entry.target.id;
          const correspondingButton = tabsContainer.querySelector(
            'a[href="#' + blockId + '"]'
          );
          if (correspondingButton) {
            updateActiveNav(correspondingButton);
          }
        }
      });
    }, observerOptions);

    // Observe all content blocks
    contentBlocks.forEach(function (block) {
      observer.observe(block);
    });

    // Update active nav helper
    function updateActiveNav(activeButton) {
      tabButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });
      activeButton.classList.add("active");
    }

    // Handle initial hash in URL (on page load)
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(function () {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          const correspondingButton = tabsContainer.querySelector(
            'a[href="' + window.location.hash + '"]'
          );
          if (correspondingButton) {
            updateActiveNav(correspondingButton);
          }
        }, 100);
      }
    }
  }
})();
