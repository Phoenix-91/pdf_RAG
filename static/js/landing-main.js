/**
 * PDF-RAG Landing Page Main Interactions
 * Lenis Smooth Scrolling · GSAP ScrollTrigger Animations · Interactive Product Preview
 */

(function () {
  "use strict";

  // 1. Initialize Lenis Smooth Scrolling
  let lenis = null;
  const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof Lenis !== "undefined" && !isReducedMotion) {
    try {
      lenis = new Lenis({
        lerp: 0.12, // Responsive, instantaneous physical feel without delay
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        smoothWheel: true,
        smoothTouch: false, // Keep native 1:1 touch response on mobile & trackpads
      });

      // Integrate Lenis with GSAP ScrollTrigger
      if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);

        lenis.on("scroll", ScrollTrigger.update);

        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      } else {
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
    } catch (e) {
      console.warn("Lenis init fallback:", e);
    }
  }

  // Smooth scroll helper for internal anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(targetEl, { offset: -60, duration: 0.8 });
        } else {
          targetEl.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // 2. Navbar Scroll Styling
  const navbar = document.getElementById("navbar");
  function handleNavScroll() {
    if (!navbar) return;
    if (window.scrollY > 40) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", handleNavScroll, { passive: true });
  handleNavScroll();

  // Mobile menu toggle
  const mobileToggle = document.getElementById("mobile-toggle");
  const navMenu = document.getElementById("nav-menu");
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", () => {
      navMenu.classList.toggle("mobile-open");
    });
    navMenu.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        navMenu.classList.remove("mobile-open");
      });
    });
  }

  // 3. GSAP ScrollTrigger & Reveal Animations
  function initScrollAnimations() {
    if (typeof gsap === "undefined" || isReducedMotion) {
      // Fallback: make all reveal elements visible immediately
      document.querySelectorAll("[data-reveal]").forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    // Reveal elements on scroll
    const revealElements = document.querySelectorAll("[data-reveal]");
    revealElements.forEach((el) => {
      const effect = el.getAttribute("data-reveal") || "fade-up";
      const delay = parseFloat(el.getAttribute("data-delay") || 0) / 1000;

      let fromVars = { opacity: 0, duration: 0.85, delay: delay, ease: "power3.out" };

      if (effect === "fade-up") {
        fromVars.y = 35;
      } else if (effect === "fade-right") {
        fromVars.x = -40;
      } else if (effect === "fade-left") {
        fromVars.x = 40;
      }

      if (typeof ScrollTrigger !== "undefined") {
        gsap.from(el, {
          ...fromVars,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      } else {
        gsap.from(el, fromVars);
      }
    });

    // Timeline Progress Bar Animation in How It Works section
    const howSection = document.getElementById("how-it-works");
    const timelineProgress = document.getElementById("timeline-progress");

    if (howSection && timelineProgress && typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: howSection,
        start: "top 60%",
        end: "bottom 80%",
        onUpdate: (self) => {
          const progressPercent = Math.min(100, Math.max(0, self.progress * 100));
          timelineProgress.style.height = `${progressPercent}%`;
        },
      });
    }

    // Step cards active pulse as they scroll into view
    const steps = [
      document.getElementById("story-step-1"),
      document.getElementById("story-step-2"),
      document.getElementById("story-step-3"),
    ];

    steps.forEach((stepEl, idx) => {
      if (!stepEl || typeof ScrollTrigger === "undefined") return;
      ScrollTrigger.create({
        trigger: stepEl,
        start: "top 70%",
        end: "bottom 40%",
        onEnter: () => {
          stepEl.classList.add("in-view");
        },
        onLeaveBack: () => {
          stepEl.classList.remove("in-view");
        },
      });
    });
  }

  // 4. Interactive Product Demonstration (Preview Section)
  const previewQuestions = [
    {
      q: "What is Multi-Head Attention and what is its primary benefit?",
      a: "<strong>Multi-Head Attention</strong> linearly projects queries, keys, and values <code>h</code> times with different learned linear projections to dimensions <code>d_k</code>, <code>d_k</code>, and <code>d_v</code>.<br/><br/>This allows the model to jointly attend to information from different representation subspaces at different positions, which single attention heads cannot achieve simultaneously.",
      sources: ["Page 4", "Page 5"],
    },
    {
      q: "How does Positional Encoding work in the Transformer architecture?",
      a: "Since the Transformer contains no recurrence or convolution, <strong>sinusoidal positional encodings</strong> are added directly to input embeddings:<br/><br/><code>PE(pos, 2i) = sin(pos / 10000^(2i/d_model))</code><br/><code>PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))</code><br/><br/>This allows the model to extrapolate easily to sequence lengths longer than those encountered during training.",
      sources: ["Page 6"],
    },
    {
      q: "What were the training parameters and hardware used?",
      a: "The base model was trained for <strong>100,000 steps (12 hours)</strong> on 8 NVIDIA P100 GPUs using the Adam optimizer with <code>β1 = 0.9</code>, <code>β2 = 0.98</code>, and <code>ε = 10^-9</code>.<br/><br/>Residual dropout with <code>P_drop = 0.1</code> and label smoothing of <code>ε_ls = 0.1</code> were applied to prevent overfitting.",
      sources: ["Page 7", "Page 8"],
    },
    {
      q: "What datasets and BLEU scores were evaluated?",
      a: "On the <strong>WMT 2014 English-to-German</strong> translation task, the big Transformer achieved a state-of-the-art score of <strong>28.4 BLEU</strong>, improving over existing ensembles by +2.0 BLEU.<br/><br/>On English-to-French, it established a new single-model record of <strong>41.8 BLEU</strong> after training for just 3.5 days.",
      sources: ["Page 8", "Page 9"],
    },
  ];

  function initPreviewMockup() {
    const chips = document.querySelectorAll(".preview-chip");
    const userMsgText = document.getElementById("mockup-user-text");
    const aiMsgText = document.getElementById("mockup-ai-text");
    const sourcesContainer = document.getElementById("mockup-sources-container");
    const statusLabel = document.getElementById("mockup-status-label");
    const inputDisplay = document.getElementById("mockup-input-display");
    const clearBtn = document.getElementById("mockup-clear-trigger");

    if (!chips.length || !userMsgText || !aiMsgText) return;

    let isMockTyping = false;

    function applyQuestion(index) {
      if (isMockTyping) return;
      const data = previewQuestions[index];
      if (!data) return;

      chips.forEach((c) => c.classList.remove("active"));
      chips[index].classList.add("active");

      isMockTyping = true;
      if (statusLabel) statusLabel.textContent = "Retrieving context…";
      if (inputDisplay) inputDisplay.textContent = data.q;

      // Animate user message
      userMsgText.textContent = data.q;
      userMsgText.parentElement.style.opacity = "0.4";
      setTimeout(() => {
        userMsgText.parentElement.style.opacity = "1";
      }, 150);

      // Show typing indicator in AI bubble
      aiMsgText.innerHTML = '<span style="opacity: 0.6; font-style: italic;">Thinking & synthesizing answer with Groq Cloud…</span>';
      if (sourcesContainer) sourcesContainer.style.display = "none";

      setTimeout(() => {
        if (statusLabel) statusLabel.textContent = "Ready";
        aiMsgText.innerHTML = data.a;

        if (sourcesContainer) {
          sourcesContainer.innerHTML = data.sources
            .map((s) => `<span class="mockup-source-tag">${s}</span>`)
            .join("");
          sourcesContainer.style.display = "flex";
        }

        isMockTyping = false;
      }, 650);
    }

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const qIdx = parseInt(chip.getAttribute("data-q"), 10);
        applyQuestion(qIdx);
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        aiMsgText.innerHTML = "Session cleared. Select or enter a question to start.";
        userMsgText.textContent = "No prompt submitted.";
        if (sourcesContainer) sourcesContainer.innerHTML = "";
        if (inputDisplay) inputDisplay.textContent = "Ask a question about your PDF…";
      });
    }
  }

  // 5. Card Interactive Spotlight / 3D Tilt Effect
  function initCardSpotlights() {
    const cards = document.querySelectorAll(".problem-card, .feature-card, .visual-card");
    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      });
    });
  }

  // Initialize all landing logic once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initScrollAnimations();
      initPreviewMockup();
      initCardSpotlights();
    });
  } else {
    initScrollAnimations();
    initPreviewMockup();
    initCardSpotlights();
  }
})();

