/**
 * PDF-RAG Interactive 3D Visualization
 * Three.js WebGL Scene:
 * Floating 3D PDF Document -> Text Fragmentation -> Knowledge Nodes ->
 * Glowing Semantic Connection Paths -> Retrieval Pulses -> Holographic Chat
 */

(function () {
  "use strict";

  // Check if WebGL / Three.js is available
  if (typeof THREE === "undefined") {
    console.warn("Three.js not loaded. Falling back to CSS ambient visualization.");
    return;
  }

  const canvas = document.getElementById("hero-three-canvas");
  const container = document.getElementById("hero-3d-wrapper");
  const holoCard = document.getElementById("holo-chat-preview");

  if (!canvas || !container) return;

  // Scene setup
  let scene, camera, renderer;
  let docGroup, pagesGroup, particlesGroup, nodesGroup, connectionsGroup;
  let knowledgeNodes = [];
  let connectionCurves = [];
  let pulsePhotons = [];
  let particles = [];
  let width = container.clientWidth || 600;
  let height = container.clientHeight || 560;

  // Interaction tracking
  let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };
  let manualRotation = { x: 0, y: 0 };
  let isVisible = true;
  let animationFrameId = null;
  let clock = new THREE.Clock();
  const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Helper: Create a procedural canvas texture for the central PDF document cover
  function createDocCoverTexture() {
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 512;
    texCanvas.height = 720;
    const ctx = texCanvas.getContext("2d");

    // Dark sleek gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 720);
    bgGrad.addColorStop(0, "#13131c");
    bgGrad.addColorStop(1, "#0a0a0f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 720);

    // Decorative geometric background line grid
    ctx.strokeStyle = "rgba(99, 102, 241, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 40; i < 512; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 720);
      ctx.stroke();
    }
    for (let j = 40; j < 720; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(512, j);
      ctx.stroke();
    }

    // Document header badge: "PDF"
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(40, 50, 70, 32, 6) : ctx.rect(40, 50, 70, 32);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("PDF", 56, 73);

    // Metadata
    ctx.fillStyle = "#9496a8";
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillText("arXiv:1706.03762v7", 130, 72);

    // Document Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Attention Is All", 40, 140);
    ctx.fillText("You Need", 40, 175);

    // Abstract Vector Graph Graphic on Cover
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(140, 290, 40, 0, Math.PI * 2);
    ctx.arc(360, 270, 35, 0, Math.PI * 2);
    ctx.arc(260, 390, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(140, 290, 6, 0, Math.PI * 2);
    ctx.arc(360, 270, 6, 0, Math.PI * 2);
    ctx.arc(260, 390, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.beginPath();
    ctx.moveTo(140, 290);
    ctx.lineTo(260, 390);
    ctx.lineTo(360, 270);
    ctx.stroke();

    // Abstract text lines
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    const lineY = [470, 495, 520, 545, 570, 605, 630, 655];
    lineY.forEach((y, idx) => {
      const w = idx % 3 === 0 ? 320 : idx % 2 === 0 ? 410 : 380;
      ctx.fillRect(40, y, w, 8);
    });

    const texture = new THREE.CanvasTexture(texCanvas);
    texture.generateMipmaps = true;
    return texture;
  }

  // Helper: Create a procedural texture for orbiting loose pages
  function createPageTexture(pageNumber) {
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 256;
    texCanvas.height = 360;
    const ctx = texCanvas.getContext("2d");

    ctx.fillStyle = "#0e0e16";
    ctx.fillRect(0, 0, 256, 360);

    // Border
    ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 358);

    // Page indicator
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.fillText(`PAGE 0${pageNumber}`, 20, 30);

    // Text lines
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    for (let y = 60; y < 320; y += 18) {
      const w = Math.random() > 0.2 ? 210 : 140;
      ctx.fillRect(20, y, w, 5);
    }

    const texture = new THREE.CanvasTexture(texCanvas);
    return texture;
  }

  // Initialize Three.js scene
  function initScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07070a, 0.022);

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 24);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa5b4fc, 1.2);
    dirLight.position.set(10, 15, 20);
    scene.add(dirLight);

    // Point lights for colored aura
    const emeraldLight = new THREE.PointLight(0x10b981, 2.5, 30);
    emeraldLight.position.set(8, -2, 6);
    scene.add(emeraldLight);

    const indigoLight = new THREE.PointLight(0x6366f1, 2.2, 35);
    indigoLight.position.set(-8, 6, 8);
    scene.add(indigoLight);

    const amberLight = new THREE.PointLight(0xf59e0b, 1.5, 25);
    amberLight.position.set(4, 8, -4);
    scene.add(amberLight);

    // Master Groups
    docGroup = new THREE.Group();
    pagesGroup = new THREE.Group();
    particlesGroup = new THREE.Group();
    nodesGroup = new THREE.Group();
    connectionsGroup = new THREE.Group();

    scene.add(docGroup);
    scene.add(pagesGroup);
    scene.add(particlesGroup);
    scene.add(nodesGroup);
    scene.add(connectionsGroup);

    buildCentralDocument();
    buildOrbitingPages();
    buildFragmentParticles();
    buildKnowledgeNodes();
    buildSemanticConnections();

    // Event listeners
    window.addEventListener("resize", onWindowResize);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", onMouseLeave);

    // Touch support for mobile
    container.addEventListener("touchmove", onTouchMove, { passive: true });

    // Intersection Observer to pause rendering when offscreen
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
            if (isVisible && !animationFrameId) {
              clock.start();
              animate();
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(container);
    }

    document.addEventListener("visibilitychange", () => {
      isVisible = !document.hidden;
      if (isVisible && !animationFrameId) {
        clock.start();
        animate();
      }
    });

    updateSceneLayout();
    animate();
    initHoloSimulation();
  }

  // 1. Build Central 3D PDF Document
  function buildCentralDocument() {
    const docWidth = 4.8;
    const docHeight = 6.8;
    const docDepth = 0.5;

    // Cover material with dynamic canvas texture
    const coverTexture = createDocCoverTexture();
    const coverMaterial = new THREE.MeshStandardMaterial({
      map: coverTexture,
      roughness: 0.25,
      metalness: 0.15,
    });

    // Spine & Pages paper materials
    const pagesMaterial = new THREE.MeshStandardMaterial({
      color: 0xdedee8,
      roughness: 0.8,
    });
    const spineMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f1f2e,
      roughness: 0.4,
    });

    const materials = [
      pagesMaterial, // right
      spineMaterial, // left
      pagesMaterial, // top
      pagesMaterial, // bottom
      coverMaterial, // front
      spineMaterial, // back
    ];

    const docGeometry = new THREE.BoxGeometry(docWidth, docHeight, docDepth);
    const docMesh = new THREE.Mesh(docGeometry, materials);
    docGroup.add(docMesh);

    // Glowing border wireframe around the central document
    const wireGeom = new THREE.BoxGeometry(docWidth + 0.05, docHeight + 0.05, docDepth + 0.05);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    docGroup.add(wireMesh);

    // Position document slightly toward the left of center to balance with knowledge graph
    docGroup.position.set(-2.6, 0.4, 0);
    docGroup.rotation.y = 0.28;
    docGroup.rotation.x = 0.1;
  }

  // 2. Build Multiple Floating Orbiting Pages
  function buildOrbitingPages() {
    const pageCount = 4;
    const pageWidth = 2.4;
    const pageHeight = 3.4;
    const pageGeom = new THREE.PlaneGeometry(pageWidth, pageHeight);

    const positions = [
      { x: -5.6, y: 3.2, z: -2.5, rx: 0.2, ry: 0.5, rz: -0.1 },
      { x: -4.8, y: -3.5, z: 1.2, rx: -0.3, ry: 0.4, rz: 0.15 },
      { x: -0.4, y: 4.2, z: -1.8, rx: 0.15, ry: -0.35, rz: 0.08 },
      { x: 0.2, y: -3.8, z: 2.0, rx: -0.2, ry: -0.45, rz: -0.12 },
    ];

    for (let i = 0; i < pageCount; i++) {
      const pageTex = createPageTexture(i + 2);
      const pageMat = new THREE.MeshStandardMaterial({
        map: pageTex,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        roughness: 0.3,
      });

      const pageMesh = new THREE.Mesh(pageGeom, pageMat);
      const pos = positions[i];
      pageMesh.position.set(pos.x, pos.y, pos.z);
      pageMesh.rotation.set(pos.rx, pos.ry, pos.rz);

      pageMesh.userData = {
        initialY: pos.y,
        initialX: pos.x,
        speed: 1.2 + i * 0.35,
        offset: i * 1.5,
      };

      pagesGroup.add(pageMesh);
    }
  }

  // 3. Build Text Fragment & Token Particles
  function buildFragmentParticles() {
    const particleCount = 120;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x6366f1); // Indigo
    const color2 = new THREE.Color(0x10b981); // Emerald
    const color3 = new THREE.Color(0xf59e0b); // Amber

    for (let i = 0; i < particleCount; i++) {
      // Stream particles from document towards knowledge nodes
      const t = Math.random();
      const x = -2.5 + t * 9.5 + (Math.random() - 0.5) * 3;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 6;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color interpolation along trajectory
      const mixedColor = t < 0.5 ? color1.clone().lerp(color2, t * 2) : color2.clone().lerp(color3, (t - 0.5) * 2);

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      particles.push({
        origX: x,
        origY: y,
        origZ: z,
        speedX: 0.02 + Math.random() * 0.03,
        speedY: (Math.random() - 0.5) * 0.015,
        t: Math.random() * Math.PI * 2,
      });
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Custom circular sprite texture for particles
    const canvasP = document.createElement("canvas");
    canvasP.width = 32;
    canvasP.height = 32;
    const ctxP = canvasP.getContext("2d");
    const radGrad = ctxP.createRadialGradient(16, 16, 0, 16, 16, 16);
    radGrad.addColorStop(0, "rgba(255,255,255,1)");
    radGrad.addColorStop(0.4, "rgba(255,255,255,0.7)");
    radGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctxP.fillStyle = radGrad;
    ctxP.fillRect(0, 0, 32, 32);

    const pTex = new THREE.CanvasTexture(canvasP);

    const mat = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      map: pTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const pSystem = new THREE.Points(geom, mat);
    particlesGroup.add(pSystem);
    particlesGroup.userData.system = pSystem;
  }

  // 4. Build Knowledge Nodes Constellation
  function buildKnowledgeNodes() {
    const nodeCoords = [
      // Cluster 1 (Semantic core)
      { x: 3.2, y: 2.4, z: 0.5, r: 0.38, color: 0x10b981, label: "Vector Embeddings" },
      { x: 4.8, y: 3.2, z: -1.2, r: 0.32, color: 0x34d399, label: "Attention Head" },
      { x: 5.6, y: 1.2, z: 1.0, r: 0.35, color: 0x10b981, label: "FAISS Index" },
      { x: 3.8, y: 0.4, z: -0.5, r: 0.42, color: 0x6366f1, label: "Subspace Projection" },

      // Cluster 2 (Document Context Chunks)
      { x: 5.2, y: -1.2, z: 0.2, r: 0.36, color: 0x818cf8, label: "Positional Encoding" },
      { x: 6.4, y: -0.4, z: -1.8, r: 0.3, color: 0xf59e0b, label: "180w Chunk Window" },
      { x: 4.2, y: -2.6, z: 1.4, r: 0.38, color: 0xfbbf24, label: "Page 4 Attribution" },
      { x: 2.8, y: -1.8, z: -1.0, r: 0.34, color: 0x6366f1, label: "Query Vector" },

      // Peripheral context nodes
      { x: 6.8, y: 2.0, z: -0.5, r: 0.26, color: 0x10b981, label: "Cosine Match" },
      { x: 7.2, y: -2.2, z: 0.8, r: 0.28, color: 0x34d399, label: "Groq LPU Synthesis" },
      { x: 2.2, y: 3.8, z: -1.6, r: 0.28, color: 0x818cf8, label: "all-MiniLM-L6-v2" },
    ];

    nodeCoords.forEach((coord, i) => {
      const nodeGeom = new THREE.IcosahedronGeometry(coord.r, 2);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: coord.color,
        emissive: coord.color,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8,
      });

      const nodeMesh = new THREE.Mesh(nodeGeom, nodeMat);
      nodeMesh.position.set(coord.x, coord.y, coord.z);

      // Outer glow shell
      const glowGeom = new THREE.SphereGeometry(coord.r * 1.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: coord.color,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      });
      const glowMesh = new THREE.Mesh(glowGeom, glowMat);
      nodeMesh.add(glowMesh);

      nodeMesh.userData = {
        baseY: coord.y,
        baseX: coord.x,
        baseZ: coord.z,
        freq: 1.0 + Math.random() * 0.8,
        glowMesh: glowMesh,
        color: coord.color,
        id: i,
      };

      knowledgeNodes.push(nodeMesh);
      nodesGroup.add(nodeMesh);
    });
  }

  // 5. Build Glowing Semantic Connection Paths (Curves & Light Pulses)
  function buildSemanticConnections() {
    // Inter-node connection pairs
    const pairs = [
      [0, 1], [0, 2], [0, 3], [1, 2], [2, 3],
      [3, 4], [4, 5], [4, 6], [5, 6], [6, 7],
      [3, 7], [1, 8], [5, 9], [0, 10],
    ];

    // Also connect document to initial nodes
    const docOrigin = new THREE.Vector3(-0.4, 0.4, 0.2);

    // Document to knowledge node splines
    [0, 3, 7].forEach((nodeIdx) => {
      const targetNode = knowledgeNodes[nodeIdx];
      const midPoint = new THREE.Vector3(
        (docOrigin.x + targetNode.position.x) / 2,
        (docOrigin.y + targetNode.position.y) / 2 + (Math.random() - 0.5) * 1.5,
        (docOrigin.z + targetNode.position.z) / 2 + 1.2
      );

      const curve = new THREE.CatmullRomCurve3([docOrigin, midPoint, targetNode.position]);
      createCurveMesh(curve, 0x6366f1, 0.35);
      connectionCurves.push(curve);
    });

    // Inter-node connections
    pairs.forEach(([i, j]) => {
      const nodeA = knowledgeNodes[i];
      const nodeB = knowledgeNodes[j];
      if (!nodeA || !nodeB) return;

      const midPoint = new THREE.Vector3(
        (nodeA.position.x + nodeB.position.x) / 2,
        (nodeA.position.y + nodeB.position.y) / 2 + (Math.random() - 0.5) * 0.8,
        (nodeA.position.z + nodeB.position.z) / 2 + (Math.random() - 0.5) * 0.8
      );

      const curve = new THREE.CatmullRomCurve3([nodeA.position, midPoint, nodeB.position]);
      const color = i % 2 === 0 ? 0x10b981 : 0x6366f1;
      createCurveMesh(curve, color, 0.28);
      connectionCurves.push(curve);
    });

    // Create moving pulse photons along curves
    for (let c = 0; c < connectionCurves.length; c++) {
      const photonGeom = new THREE.SphereGeometry(0.08, 8, 8);
      const photonMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
      });
      const photon = new THREE.Mesh(photonGeom, photonMat);
      connectionsGroup.add(photon);

      pulsePhotons.push({
        mesh: photon,
        curve: connectionCurves[c],
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.006,
      });
    }
  }

  function createCurveMesh(curve, color, opacity) {
    const points = curve.getPoints(36);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geometry, material);
    connectionsGroup.add(line);
  }

  // Mouse & Touch interaction handlers
  function onMouseMove(event) {
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / height) * 2 - 1);
    mouse.targetX = x;
    mouse.targetY = y;

    if (isDragging) {
      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;
      manualRotation.y += deltaX * 0.005;
      manualRotation.x += deltaY * 0.005;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onMouseLeave() {
    isDragging = false;
    mouse.targetX = 0;
    mouse.targetY = 0;
  }

  function onTouchMove(event) {
    if (event.touches.length > 0) {
      const rect = container.getBoundingClientRect();
      const touch = event.touches[0];
      const x = ((touch.clientX - rect.left) / width) * 2 - 1;
      const y = -(((touch.clientY - rect.top) / height) * 2 - 1);
      mouse.targetX = x * 0.7;
      mouse.targetY = y * 0.7;
    }
  }

  function updateSceneLayout() {
    if (!docGroup || !nodesGroup || !camera) return;
    if (width < 860) {
      docGroup.position.set(-1.0, 1.0, 0);
      docGroup.scale.set(0.78, 0.78, 0.78);
      nodesGroup.position.set(-0.6, -1.6, 0);
      nodesGroup.scale.set(0.72, 0.72, 0.72);
      camera.position.z = 28;
    } else {
      docGroup.position.set(-2.6, 0.4, 0);
      docGroup.scale.set(1, 1, 1);
      nodesGroup.position.set(0, 0, 0);
      nodesGroup.scale.set(1, 1, 1);
      camera.position.z = 24;
    }
  }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    width = container.clientWidth || 600;
    height = container.clientHeight || 560;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    updateSceneLayout();
  }

  // Animation Loop
  function animate() {
    if (!isVisible) {
      animationFrameId = null;
      return;
    }

    if (isReducedMotion) {
      renderer.render(scene, camera);
      return;
    }

    animationFrameId = requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // Smooth lerp mouse parallax
    mouse.x += (mouse.targetX - mouse.x) * 0.06;
    mouse.y += (mouse.targetY - mouse.y) * 0.06;

    // Apply gentle rotation & oscillation to central PDF document
    if (docGroup) {
      docGroup.position.y = 0.4 + Math.sin(time * 1.2) * 0.22;
      docGroup.rotation.y = 0.28 + mouse.x * 0.35 + manualRotation.y;
      docGroup.rotation.x = 0.1 - mouse.y * 0.25 + manualRotation.x;
    }

    // Oscillate orbiting loose pages
    if (pagesGroup) {
      pagesGroup.children.forEach((page) => {
        const u = page.userData;
        page.position.y = u.initialY + Math.sin(time * u.speed + u.offset) * 0.35;
        page.rotation.z += 0.0015;
      });
    }

    // Animate streaming text fragment particles
    if (particlesGroup && particlesGroup.userData.system) {
      const sys = particlesGroup.userData.system;
      const posAttr = sys.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.t += 0.015;
        arr[i * 3] += p.speedX; // Flow right toward knowledge nodes
        arr[i * 3 + 1] += Math.sin(p.t) * 0.015;

        // Reset if particle moves past knowledge nodes
        if (arr[i * 3] > 8.0) {
          arr[i * 3] = -2.5 + (Math.random() - 0.5) * 1.5;
          arr[i * 3 + 1] = (Math.random() - 0.5) * 6;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Gentle pulsing & oscillation for knowledge nodes
    if (nodesGroup) {
      knowledgeNodes.forEach((node) => {
        const u = node.userData;
        node.position.y = u.baseY + Math.sin(time * u.freq + u.id) * 0.15;
        if (u.glowMesh) {
          const s = 1.0 + Math.sin(time * 3 + u.id) * 0.15;
          u.glowMesh.scale.set(s, s, s);
        }
      });
    }

    // Animate retrieval pulses (photons) along spline curves
    pulsePhotons.forEach((p) => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;
      const point = p.curve.getPoint(p.progress);
      if (point) {
        p.mesh.position.copy(point);
      }
    });

    // Camera subtle breathing movement
    camera.position.x = mouse.x * 1.2;
    camera.position.y = mouse.y * 1.2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // Periodic Simulation Sync with Holographic Chat Card
  function initHoloSimulation() {
    if (!holoCard) return;

    const queries = [
      {
        q: "How does Multi-Head Attention attend to different subspaces?",
        a: "Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions...",
        sources: ["Page 4", "Page 5"],
        score: "Score 0.94",
        activeNodes: [0, 1, 3],
      },
      {
        q: "What formula is used for sinusoidal Positional Encoding?",
        a: "PE(pos, 2i) = sin(pos/10000^(2i/d_model)) and PE(pos, 2i+1) = cos(pos/10000^(2i/d_model)), allowing linear relative shifts...",
        sources: ["Page 6"],
        score: "Score 0.96",
        activeNodes: [4, 6],
      },
      {
        q: "Why does self-attention yield faster training than recurrence?",
        a: "Self-attention layers compute constant sequential operations O(1) across positions via matrix multiplication, enabling massive parallelization...",
        sources: ["Page 4", "Page 7"],
        score: "Score 0.91",
        activeNodes: [2, 5, 7],
      },
    ];

    let currentIdx = 0;

    function triggerRetrievalCycle() {
      currentIdx = (currentIdx + 1) % queries.length;
      const data = queries[currentIdx];

      // Flash target knowledge nodes
      data.activeNodes.forEach((nodeIdx) => {
        const node = knowledgeNodes[nodeIdx];
        if (node) {
          node.material.emissiveIntensity = 2.0;
          setTimeout(() => {
            if (node.material) node.material.emissiveIntensity = 0.5;
          }, 1200);
        }
      });

      // Update holographic card content with subtle fade
      holoCard.style.opacity = "0.4";
      holoCard.style.transform = "translateY(4px)";

      setTimeout(() => {
        const qEl = holoCard.querySelector(".holo-query");
        const aEl = holoCard.querySelector(".holo-answer");
        const metaEl = holoCard.querySelector(".holo-meta");
        const footerEl = holoCard.querySelector(".holo-footer");

        if (qEl) qEl.innerHTML = `<span class="holo-q-tag">Q:</span> "${data.q}"`;
        if (aEl) aEl.innerHTML = `<span class="holo-a-tag">AI:</span> "${data.a}"`;
        if (metaEl) metaEl.textContent = data.score;

        if (footerEl) {
          footerEl.innerHTML = `
            ${data.sources.map((s) => `<span class="holo-source-pill">${s}</span>`).join("")}
            <span class="holo-model-pill">Groq LPU</span>
          `;
        }

        holoCard.style.opacity = "1";
        holoCard.style.transform = "translateY(0)";
      }, 300);
    }

    // Cycle every 5.5 seconds
    setInterval(triggerRetrievalCycle, 5500);
  }

  // Boot up
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScene);
  } else {
    initScene();
  }
})();
