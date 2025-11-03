/**
 * Product Info Tabs - Smooth scroll and active state management
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
    const tabContents = tabsContainer.querySelectorAll(".tab-content");

    if (tabButtons.length === 0 || tabContents.length === 0) return;

    // Tab switching functionality
    tabButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const targetTabId = button.getAttribute("data-tab");
        if (!targetTabId) return;

        // Update button states
        tabButtons.forEach(function (btn) {
          btn.classList.remove("active");
          btn.setAttribute("aria-selected", "false");
        });
        button.classList.add("active");
        button.setAttribute("aria-selected", "true");

        // Update tab content visibility
        tabContents.forEach(function (content) {
          content.classList.remove("active");
        });

        const targetContent = document.getElementById(targetTabId);
        if (targetContent) {
          targetContent.classList.add("active");
        }

        // Update URL hash
        if (history.pushState) {
          history.pushState(null, null, "#" + targetTabId);
        } else {
          location.hash = "#" + targetTabId;
        }
      });

      // Keyboard navigation
      button.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          button.click();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const nextButton = getNextTabButton(button);
          if (nextButton) {
            nextButton.focus();
            nextButton.click();
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          const prevButton = getPreviousTabButton(button);
          if (prevButton) {
            prevButton.focus();
            prevButton.click();
          }
        }
      });
    });

    // Helper function to get next tab button
    function getNextTabButton(currentButton) {
      const buttons = Array.from(tabButtons);
      const currentIndex = buttons.indexOf(currentButton);
      return buttons[currentIndex + 1] || buttons[0]; // Wrap to first
    }

    // Helper function to get previous tab button
    function getPreviousTabButton(currentButton) {
      const buttons = Array.from(tabButtons);
      const currentIndex = buttons.indexOf(currentButton);
      return buttons[currentIndex - 1] || buttons[buttons.length - 1]; // Wrap to last
    }

    // Handle initial hash in URL (on page load)
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      const targetButton = tabsContainer.querySelector(
        'button[data-tab="' + targetId + '"]'
      );
      if (targetButton) {
        targetButton.click();
      }
    }
  }
})();
