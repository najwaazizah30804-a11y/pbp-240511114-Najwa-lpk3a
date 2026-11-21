(function () {
  const stage = document.getElementById("mascot-stage");
  const bubble = document.getElementById("mascot-bubble");
  const moodBadge = document.getElementById("mascot-mood-badge");
  if (!stage || !bubble || !moodBadge) return;

  const ENCOURAGEMENTS = [
    "Semangat, Najwa! 💪",
    "Satu langkah kecil tiap hari itu keren ✨",
    "Mochi bangga sama progresmu! 🐾",
    "Pelan-pelan tapi pasti beres 🌸",
    "Jangan lupa minum air dulu ya 🍓"
  ];

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isReducedMotion = () => reducedMotionQuery.matches;

  let currentStats = window.todoStats || { total: 0, selesai: 0, belum: 0 };
  let currentMood = "empty";
  let pokeLockUntil = 0;

  function computeMood(stats) {
    if (!stats || stats.total === 0) return "empty";
    if (stats.belum === 0) return "happy";
    return "busy";
  }

  function updateMoodUI(stats, preservePoke = false) {
    currentStats = stats || { total: 0, selesai: 0, belum: 0 };
    currentMood = computeMood(currentStats);

    if (currentMood === "empty") {
      moodBadge.textContent = "Lagi Sepi 😿";
      moodBadge.dataset.mood = "empty";
      if (!preservePoke || Date.now() > pokeLockUntil) {
        bubble.textContent = "Belum ada tugas nih, Najwa! Yuk tambah satu 🐾";
      }
    } else if (currentMood === "happy") {
      moodBadge.textContent = "Hore! Beres 🌸";
      moodBadge.dataset.mood = "happy";
      if (!preservePoke || Date.now() > pokeLockUntil) {
        bubble.textContent = "Yeay! Semua tugas selesai, Najwa hebat! 🌟";
      }
    } else {
      moodBadge.textContent = "Semangat! 🐾";
      moodBadge.dataset.mood = "busy";
      if (!preservePoke || Date.now() > pokeLockUntil) {
        bubble.textContent = `Ada ${currentStats.belum} tugas lagi! Kamu pasti bisa 💪`;
      }
    }
  }

  function showRandomEncouragement() {
    const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
    pokeLockUntil = Date.now() + 2800;
    bubble.textContent = msg;
    if (!isReducedMotion()) {
      bubble.style.transform = "scale(1.04)";
      setTimeout(() => {
        bubble.style.transform = "scale(1)";
      }, 180);
    }
  }

  updateMoodUI(currentStats);

  // State hooks that Three.js will enhance if WebGL + CDN succeed
  let onPoke3D = null;
  let onStats3D = null;
  let onCelebrate3D = null;

  stage.addEventListener("click", () => {
    showRandomEncouragement();
    if (onPoke3D) onPoke3D();
  });

  stage.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showRandomEncouragement();
      if (onPoke3D) onPoke3D();
    }
  });

  document.addEventListener("todos:changed", (e) => {
    updateMoodUI(e.detail, true);
    if (onStats3D) onStats3D(e.detail);
  });

  document.addEventListener("todo:completed", () => {
    if (onCelebrate3D) onCelebrate3D();
  });

  // Muat Three.js secara dinamis agar tetap kompatibel di file:// maupun http://
  (async function initThreeMascot() {
    let THREE;
    try {
      THREE = await import(
        "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
      );
    } catch {
      // Offline atau CDN gagal: fallback CSS tetap aktif
      return;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }

    const width = Math.max(stage.clientWidth, 240);
    const height = Math.max(stage.clientHeight, 200);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    stage.appendChild(renderer.domElement);
    stage.classList.add("has-webgl");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.12, 5.25);
    camera.lookAt(0, 0.15, 0);

    // Pencahayaan lembut pastel
    const hemiLight = new THREE.HemisphereLight(0xfff6fc, 0xd8c3ff, 1.38);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3.2, 5, 4.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffd2e6, 0.55);
    fillLight.position.set(-3.2, 2, 2.5);
    scene.add(fillLight);

    // Alas mint pastel
    const baseGroup = new THREE.Group();
    baseGroup.position.set(0, -0.82, 0);
    scene.add(baseGroup);

    const basePad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.28, 0.24, 32),
      new THREE.MeshToonMaterial({ color: 0xb5f0d8 })
    );
    baseGroup.add(basePad);

    const cushionTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.98, 1.02, 0.08, 32),
      new THREE.MeshToonMaterial({ color: 0xfff5fa })
    );
    cushionTop.position.y = 0.13;
    baseGroup.add(cushionTop);

    // Cincin Progres 3D (Track + Arc)
    const ringTrack = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.075, 12, 64),
      new THREE.MeshToonMaterial({
        color: 0xe6d8ff,
        transparent: true,
        opacity: 0.72
      })
    );
    ringTrack.rotation.x = -Math.PI / 2;
    ringTrack.position.y = -0.83;
    scene.add(ringTrack);

    const progressMat = new THREE.MeshToonMaterial({ color: 0xff75a9 });
    const progressRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.082, 12, 64, 0.001),
      progressMat
    );
    progressRing.rotation.x = -Math.PI / 2;
    progressRing.rotation.z = -Math.PI / 2;
    progressRing.position.y = -0.81;
    progressRing.visible = false;
    scene.add(progressRing);

    let lastProgressRatio = -1;
    function rebuildProgressRing(stats) {
      const ratio =
        !stats || stats.total === 0
          ? 0
          : Math.max(0, Math.min(1, stats.selesai / stats.total));
      if (Math.abs(ratio - lastProgressRatio) < 0.001) return;
      lastProgressRatio = ratio;

      if (ratio <= 0) {
        progressRing.visible = false;
        return;
      }

      progressRing.visible = true;
      const oldGeom = progressRing.geometry;
      const arc = Math.max(0.06, ratio * Math.PI * 2);
      progressRing.geometry = new THREE.TorusGeometry(1.6, 0.082, 12, 64, arc);
      oldGeom.dispose();
      progressMat.color.setHex(ratio >= 1 ? 0x62d4a5 : 0xff75a9);
    }

    // Maskot Kucing Mochi 3D
    const catGroup = new THREE.Group();
    catGroup.position.set(0, -0.14, 0);
    scene.add(catGroup);

    const pinkFur = new THREE.MeshToonMaterial({ color: 0xffb8d2 });
    const innerFur = new THREE.MeshToonMaterial({ color: 0xffe6f0 });
    const blushMat = new THREE.MeshToonMaterial({ color: 0xff7aa8 });
    const darkMat = new THREE.MeshToonMaterial({ color: 0x3b2347 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const noseMat = new THREE.MeshToonMaterial({ color: 0xd9487b });

    // Badan
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.74, 28, 22), pinkFur);
    body.scale.set(1.04, 0.85, 0.96);
    body.position.set(0, -0.14, 0);
    catGroup.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), innerFur);
    belly.scale.set(0.95, 0.88, 0.4);
    belly.position.set(0, -0.18, 0.59);
    catGroup.add(belly);

    // Kaki mungil
    const pawGeom = new THREE.SphereGeometry(0.17, 16, 12);
    const leftPaw = new THREE.Mesh(pawGeom, innerFur);
    leftPaw.scale.set(1.05, 0.72, 1.2);
    leftPaw.position.set(-0.34, -0.58, 0.48);
    const rightPaw = new THREE.Mesh(pawGeom, innerFur);
    rightPaw.scale.set(1.05, 0.72, 1.2);
    rightPaw.position.set(0.34, -0.58, 0.48);
    catGroup.add(leftPaw, rightPaw);

    // Ekor melengkung
    const tail = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.085, 12, 24, Math.PI * 1.1),
      pinkFur
    );
    tail.position.set(0.45, -0.32, -0.5);
    tail.rotation.set(0.25, -0.7, -0.4);
    catGroup.add(tail);

    // Kepala
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.54, 0.05);
    catGroup.add(headGroup);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.66, 28, 22), pinkFur);
    head.scale.set(1.08, 0.9, 0.98);
    headGroup.add(head);

    // Telinga (ConeGeometry 4 segmen = low-poly manis)
    const earOuterGeom = new THREE.ConeGeometry(0.23, 0.42, 4);
    const earInnerGeom = new THREE.ConeGeometry(0.12, 0.25, 4);

    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(-0.42, 0.5, 0.02);
    leftEarGroup.rotation.set(0.08, 0, 0.34);
    const leftEar = new THREE.Mesh(earOuterGeom, pinkFur);
    leftEar.rotation.y = Math.PI / 4;
    const leftEarInner = new THREE.Mesh(earInnerGeom, innerFur);
    leftEarInner.rotation.y = Math.PI / 4;
    leftEarInner.position.set(0, -0.04, 0.09);
    leftEarGroup.add(leftEar, leftEarInner);

    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(0.42, 0.5, 0.02);
    rightEarGroup.rotation.set(0.08, 0, -0.34);
    const rightEar = new THREE.Mesh(earOuterGeom, pinkFur);
    rightEar.rotation.y = Math.PI / 4;
    const rightEarInner = new THREE.Mesh(earInnerGeom, innerFur);
    rightEarInner.rotation.y = Math.PI / 4;
    rightEarInner.position.set(0, -0.04, 0.09);
    rightEarGroup.add(rightEar, rightEarInner);

    headGroup.add(leftEarGroup, rightEarGroup);

    // Mata + kilau mata
    const eyeGeom = new THREE.SphereGeometry(0.084, 16, 14);
    const glintGeom = new THREE.SphereGeometry(0.028, 10, 10);

    const leftEye = new THREE.Mesh(eyeGeom, darkMat);
    leftEye.position.set(-0.25, 0.03, 0.59);
    const leftGlint = new THREE.Mesh(glintGeom, whiteMat);
    leftGlint.position.set(0.028, 0.032, 0.068);
    leftEye.add(leftGlint);

    const rightEye = new THREE.Mesh(eyeGeom, darkMat);
    rightEye.position.set(0.25, 0.03, 0.59);
    const rightGlint = new THREE.Mesh(glintGeom, whiteMat);
    rightGlint.position.set(0.028, 0.032, 0.068);
    rightEye.add(rightGlint);

    headGroup.add(leftEye, rightEye);

    // Pipi merona
    const blushGeom = new THREE.SphereGeometry(0.105, 14, 12);
    const leftBlush = new THREE.Mesh(blushGeom, blushMat);
    leftBlush.scale.set(1.25, 0.72, 0.38);
    leftBlush.position.set(-0.4, -0.1, 0.52);

    const rightBlush = new THREE.Mesh(blushGeom, blushMat);
    rightBlush.scale.set(1.25, 0.72, 0.38);
    rightBlush.position.set(0.4, -0.1, 0.52);
    headGroup.add(leftBlush, rightBlush);

    // Hidung mungil
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), noseMat);
    nose.scale.set(1.25, 0.85, 0.75);
    nose.position.set(0, -0.05, 0.64);
    headGroup.add(nose);

    // Mulut (busur torus — senyum atau sedih)
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.024, 10, 20, Math.PI),
      darkMat
    );
    mouth.position.set(0, -0.11, 0.62);
    mouth.rotation.z = Math.PI;
    headGroup.add(mouth);

    // Bintang berputar untuk mood bahagia (semua tugas selesai)
    const starsGroup = new THREE.Group();
    starsGroup.position.set(0, 0.55, 0);
    catGroup.add(starsGroup);

    const starGeom = new THREE.OctahedronGeometry(0.11, 0);
    const starMat1 = new THREE.MeshToonMaterial({ color: 0xffd166 });
    const starMat2 = new THREE.MeshToonMaterial({ color: 0xb5f0d8 });
    const starCount = 5;
    for (let i = 0; i < starCount; i++) {
      const a = (i / starCount) * Math.PI * 2;
      const star = new THREE.Mesh(starGeom, i % 2 === 0 ? starMat1 : starMat2);
      star.scale.set(1, 1.2, 0.45);
      star.position.set(Math.cos(a) * 1.18, Math.sin(a * 2) * 0.18 + 0.35, Math.sin(a) * 1.18);
      starsGroup.add(star);
    }
    starsGroup.visible = false;

    function applyMoodVisuals() {
      if (currentMood === "empty") {
        mouth.rotation.z = 0;
        mouth.position.y = -0.17;
        leftEarGroup.rotation.z = 0.55;
        rightEarGroup.rotation.z = -0.55;
        starsGroup.visible = false;
      } else if (currentMood === "happy") {
        mouth.rotation.z = Math.PI;
        mouth.position.y = -0.1;
        leftEarGroup.rotation.z = 0.3;
        rightEarGroup.rotation.z = -0.3;
        starsGroup.visible = true;
      } else {
        mouth.rotation.z = Math.PI;
        mouth.position.y = -0.11;
        leftEarGroup.rotation.z = 0.34;
        rightEarGroup.rotation.z = -0.34;
        starsGroup.visible = false;
      }
    }

    // Pointer follow state
    let targetPointerX = 0;
    let targetPointerY = 0;

    window.addEventListener(
      "pointermove",
      (e) => {
        const rect = stage.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = (e.clientX - cx) / Math.max(window.innerWidth * 0.45, 220);
        const ny = (e.clientY - cy) / Math.max(window.innerHeight * 0.45, 220);
        targetPointerX = Math.max(-1, Math.min(1, nx));
        targetPointerY = Math.max(-1, Math.min(1, ny));
      },
      { passive: true }
    );

    // Animasi state
    let celebrateStart = -1;
    let squishStart = -1;
    let nextBlinkAt = performance.now() + 2600 + Math.random() * 2000;
    let blinkEndAt = -1;

    onCelebrate3D = () => {
      if (isReducedMotion()) return;
      celebrateStart = performance.now();
    };

    onPoke3D = () => {
      if (isReducedMotion()) return;
      squishStart = performance.now();
    };

    onStats3D = (stats) => {
      rebuildProgressRing(stats);
      applyMoodVisuals();
    };

    // Sinkronisasi awal segera setelah Three.js siap
    rebuildProgressRing(currentStats);
    applyMoodVisuals();

    // ResizeObserver agar proporsi tetap tajam
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 160);
        const h = Math.max(Math.floor(entry.contentRect.height), 160);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
      }
    });
    ro.observe(stage);

    function animate(now) {
      const t = now * 0.001;
      const reduced = isReducedMotion();

      // Blink otomatis setiap 3-5 detik
      if (now >= nextBlinkAt) {
        blinkEndAt = now + 130;
        nextBlinkAt = now + 3000 + Math.random() * 2000;
      }
      const eyeScaleY = now < blinkEndAt ? 0.1 : 1;
      leftEye.scale.y = THREE.MathUtils.lerp(leftEye.scale.y, eyeScaleY, 0.45);
      rightEye.scale.y = THREE.MathUtils.lerp(rightEye.scale.y, eyeScaleY, 0.45);

      // Kepala mengikuti kursor dengan lerp halus
      const targetRotY = reduced ? 0 : targetPointerX * 0.42;
      const targetRotX = reduced ? (currentMood === "empty" ? 0.14 : 0) : targetPointerY * 0.22 + (currentMood === "empty" ? 0.12 : 0);
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetRotY, 0.1);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, targetRotX, 0.1);

      // Posisi & rotasi tubuh (idle / celebrate / squish)
      let yOffset = reduced ? 0 : Math.sin(t * 2.2) * 0.05;
      let rotY = 0;
      let sx = 1;
      let sy = 1;

      if (!reduced && celebrateStart > 0) {
        const elapsed = now - celebrateStart;
        const dur = 620;
        if (elapsed < dur) {
          const p = elapsed / dur;
          yOffset += Math.sin(p * Math.PI) * 0.62;
          rotY = p * Math.PI * 2;
        } else {
          celebrateStart = -1;
        }
      }

      if (!reduced && squishStart > 0) {
        const elapsed = now - squishStart;
        const dur = 360;
        if (elapsed < dur) {
          const p = elapsed / dur;
          const wave = Math.sin(p * Math.PI * 2) * (1 - p);
          sx = 1 + wave * 0.18;
          sy = 1 - wave * 0.18;
        } else {
          squishStart = -1;
        }
      }

      catGroup.position.y = -0.14 + yOffset;
      catGroup.rotation.y = rotY;
      catGroup.scale.set(sx, sy, sx);

      if (!reduced) {
        tail.rotation.z = -0.4 + Math.sin(t * 3.1) * 0.18;
        if (starsGroup.visible) {
          starsGroup.rotation.y = t * 1.3;
        }
      }

      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);
  })();
})();
