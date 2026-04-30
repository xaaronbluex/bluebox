import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const planetTextureAssets = Object.entries(
  import.meta.glob("../../public/static/img/03_planet/*.{jpg,jpeg,png,webp}", { eager: true, import: "default" })
).reduce((acc, [filePath, assetUrl]) => {
  const fileName = filePath.split("/").pop() ?? "";
  const base = fileName.replace(/\.[^.]+$/, "").toLowerCase();
  acc[base] = assetUrl;
  return acc;
}, {});

const ECCENTRICITY = {
  Mercury: 0.2056,
  Venus: 0.0068,
  Earth: 0.0167,
  Mars: 0.0934,
  Jupiter: 0.0489,
  Saturn: 0.0565,
  Uranus: 0.0463,
  Neptune: 0.0095,
  Pluto: 0.2488,
};

const ORBIT_CYCLES = {
  Mercury: 365.256 / 87.969,
  Venus: 365.256 / 224.701,
  Earth: 1,
  Mars: 365.256 / 686.98,
  Jupiter: 365.256 / 4332.59,
  Saturn: 365.256 / 10759.22,
  Uranus: 365.256 / 30688.5,
  Neptune: 365.256 / 60182,
  Pluto: 365.256 / 90560,
};

const SEMI_MAJOR_AU = {
  Mercury: 0.387,
  Venus: 0.723,
  Earth: 1,
  Mars: 1.524,
  Jupiter: 5.203,
  Saturn: 9.537,
  Uranus: 19.191,
  Neptune: 30.07,
  Pluto: 39.482,
};

const EARTH_RADIUS_KM = 6371;
const MOON_RADIUS_KM = 1737.4;
const EARTH_MOON_DISTANCE_KM = 384400;
const PRESENTATION_SIZE_MULTIPLIER = {
  Mercury: 3.8,
  Venus: 4.3,
  Earth: 5.0,
  Mars: 4.2,
  Jupiter: 1.5,
  Saturn: 1.8,
  Uranus: 2.2,
  Neptune: 2.2,
  Pluto: 4.8,
};
const REAL_SCALE_PLANET_SIZE_MULTIPLIER = 3;
const REAL_SCALE_SUN_SIZE_MULTIPLIER = 3;

function makeLabelSprite(text, options = {}) {
  const { width = 512, height = 128, font = "italic 48px Georgia", scale = [24, 6, 1] } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(236, 245, 255, 0.95)";
  ctx.shadowColor = "rgba(4, 8, 25, 0.95)";
  ctx.shadowBlur = 12;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale[0], scale[1], scale[2]);
  return sprite;
}

function makePlanetTexture(name, unlocked) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (!unlocked) {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, "#d1d8e3");
    g.addColorStop(0.5, "#8f97a6");
    g.addColorStop(1, "#606979");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE.CanvasTexture(canvas);
  }

  const palettes = {
    Mercury: ["#d9d9d2", "#b3aea8", "#8a857d"],
    Venus: ["#ffe1a6", "#e4bc7d", "#c9965d"],
    Earth: ["#5fa0ff", "#3f84df", "#2a5ea8"],
    Mars: ["#e7773f", "#c55d2f", "#8f3f25"],
    Jupiter: ["#e4cfad", "#d1b285", "#b88f61", "#f0dfbf", "#a9815a"],
    Saturn: ["#ead5a9", "#d8bc86", "#bf9f68", "#f2e2bd"],
    Uranus: ["#c8fcff", "#9de4ea", "#75c4cf"],
    Neptune: ["#79a4ff", "#4f78ef", "#3153bf"],
    Pluto: ["#ead2bf", "#c5a894", "#947b6a"],
  };
  const colors = palettes[name] ?? ["#a0b3d9", "#6b7ea8", "#3b4b6a"];

  for (let y = 0; y < canvas.height; y += 10) {
    ctx.fillStyle = colors[(Math.floor(y / 10) + (name.length % colors.length)) % colors.length];
    ctx.fillRect(0, y, canvas.width, 10);
  }
  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#000000";
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 1 + Math.random() * 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (name === "Earth") {
    ctx.fillStyle = "rgba(72, 188, 103, 0.85)";
    for (let i = 0; i < 16; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const w = 24 + Math.random() * 52;
      const h = 12 + Math.random() * 34;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSunTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const radial = ctx.createRadialGradient(512, 512, 80, 512, 512, 512);
  radial.addColorStop(0, "#fff7bd");
  radial.addColorStop(0.42, "#ffd56f");
  radial.addColorStop(0.75, "#ff9b3d");
  radial.addColorStop(1, "#d95b1a");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 420; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 430;
    const x = 512 + Math.cos(angle) * dist;
    const y = 512 + Math.sin(angle) * dist;
    const r = 12 + Math.random() * 36;
    const alpha = 0.08 + Math.random() * 0.2;
    ctx.fillStyle = `rgba(255, ${140 + Math.floor(Math.random() * 70)}, ${60 + Math.floor(Math.random() * 50)}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMoonTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#f1f1ee");
  g.addColorStop(0.5, "#c8c8c4");
  g.addColorStop(1, "#8e8f93");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 4 + Math.random() * 24;
    ctx.fillStyle = `rgba(${80 + Math.floor(Math.random() * 40)}, ${80 + Math.floor(Math.random() * 40)}, ${85 + Math.floor(Math.random() * 40)}, ${0.16 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,245,245,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getTextureCandidates(bodyName) {
  const key = bodyName.toLowerCase();
  if (key === "earth") return ["earth", "earth_colour_d", "earth_colour_c", "earth_colour_b", "earth_colour"];
  if (key === "moon") return ["moon1", "moon_colour", "moon"];
  return [key];
}

function loadBodyTexture(loader, bodyName) {
  const candidates = getTextureCandidates(bodyName);
  for (const candidate of candidates) {
    const url = planetTextureAssets[candidate];
    if (!url) continue;
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }
  return null;
}

export default function SolarSystemThree({
  planets,
  scaleMode = "real",
  onHoverPlanet,
  onLeavePlanet,
}) {
  const mountRef = useRef(null);
  const hoverCbRef = useRef(onHoverPlanet);
  const leaveCbRef = useRef(onLeavePlanet);
  const planetEntriesRef = useRef([]);
  const sceneRef = useRef(null);

  useEffect(() => {
    hoverCbRef.current = onHoverPlanet;
  }, [onHoverPlanet]);

  useEffect(() => {
    leaveCbRef.current = onLeavePlanet;
  }, [onLeavePlanet]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#040814");
    sceneRef.current = scene;

    const isPresentation = scaleMode === "presentation";
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 6000);
    camera.position.set(0, isPresentation ? 170 : 180, isPresentation ? 640 : 760);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = isPresentation ? 150 : 180;
    controls.maxDistance = isPresentation ? 1800 : 2200;
    controls.target.set(0, isPresentation ? 18 : 20, 0);
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = Math.PI * 0.35;
    controls.update();

    const ambient = new THREE.AmbientLight("#a9b8ff", 0.18);
    scene.add(ambient);

    const sunLight = new THREE.PointLight("#fff1b8", 2.35, 1600);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight("#8ab8ff", 0.42);
    rimLight.position.set(-140, 60, -180);
    scene.add(rimLight);

    const textureLoader = new THREE.TextureLoader();
    const sunTexture = loadBodyTexture(textureLoader, "sun") ?? makeSunTexture();
    const sunRadiusScene = isPresentation ? 15 : 15 * REAL_SCALE_SUN_SIZE_MULTIPLIER;
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(sunRadiusScene, 64, 64),
      new THREE.MeshStandardMaterial({
        color: "#ffc35e",
        map: sunTexture,
        bumpMap: sunTexture,
        bumpScale: 0.34,
        emissive: "#ff9d32",
        emissiveIntensity: 1.45,
      })
    );
    sun.castShadow = false;
    sun.receiveShadow = false;
    scene.add(sun);
    const sunLabel = makeLabelSprite("Sun", {
      width: 640,
      height: 160,
      font: "italic 58px Georgia",
      scale: [34, 9, 1],
    });
    if (sunLabel) {
      sunLabel.position.set(0, sunRadiusScene + 9, 0);
      sunLabel.material.depthTest = false;
      sunLabel.renderOrder = 3;
      scene.add(sunLabel);
    }

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1700;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 760 + Math.random() * 680;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 700;
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starsGeo,
      new THREE.PointsMaterial({
        color: "#ffffff",
        size: 0.8,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    stars.position.z = -210;
    scene.add(stars);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-10, -10);
    let lastPointer = { x: 0, y: 0 };
    const sunRadius = sun.geometry.parameters.radius;
    const earthRadiusScene = Math.max(0.2, (EARTH_RADIUS_KM / 7200) * (isPresentation ? 1.7 : 0.9));
    const kmToScene = earthRadiusScene / EARTH_RADIUS_KM;
    const planetEntries = planets.map((planet, idx) => {
      const baseRadius = planet.radiusKm * kmToScene;
      const radius = isPresentation
        ? baseRadius * (PRESENTATION_SIZE_MULTIPLIER[planet.name] ?? 2.4)
        : baseRadius * REAL_SCALE_PLANET_SIZE_MULTIPLIER;
      const au = SEMI_MAJOR_AU[planet.name] ?? 1 + idx;
      const orbitRadius = isPresentation
        ? 96 + Math.log10(1 + au) * 440
        : 145 + Math.log10(1 + au) * 620;
      const tex =
        (planet.name === "Jupiter" ? loadBodyTexture(textureLoader, "jupiter") : null) ??
        (isPresentation && planet.unlocked ? loadBodyTexture(textureLoader, planet.name) : null) ??
        makePlanetTexture(planet.name, planet.unlocked);
      const materialProfile = {
        Mercury: { roughness: 0.9, metalness: 0.04, emissive: "#293647", emissiveIntensity: 0.36, color: "#fff7ed" },
        Venus: { roughness: 0.84, metalness: 0.03, emissive: "#5f3e1f", emissiveIntensity: 0.4, color: "#fff0cc" },
        Earth: { roughness: 0.68, metalness: 0.03, emissive: "#2f4f7f", emissiveIntensity: 0.5, color: "#f3fbff" },
        Mars: { roughness: 0.8, metalness: 0.03, emissive: "#6a3522", emissiveIntensity: 0.42, color: "#ffe6db" },
        Jupiter: { roughness: 0.74, metalness: 0.04, emissive: "#5e4425", emissiveIntensity: 0.44, color: "#fff5e8" },
        Saturn: { roughness: 0.72, metalness: 0.05, emissive: "#6b5327", emissiveIntensity: 0.46, color: "#fff8de" },
        Uranus: { roughness: 0.68, metalness: 0.04, emissive: "#1f5d66", emissiveIntensity: 0.44, color: "#efffff" },
        Neptune: { roughness: 0.69, metalness: 0.05, emissive: "#233b7a", emissiveIntensity: 0.5, color: "#edf3ff" },
        Pluto: { roughness: 0.86, metalness: 0.03, emissive: "#513a2f", emissiveIntensity: 0.34, color: "#fff0e6" },
      };
      const profile = materialProfile[planet.name] ?? {
        roughness: 0.8,
        metalness: 0.03,
        emissive: "#2f4470",
        emissiveIntensity: 0.5,
        color: "#ffffff",
      };
      const mat = new THREE.MeshStandardMaterial({
        color: planet.unlocked ? "#ffffff" : "#a2adbf",
        map: tex,
        bumpMap: tex,
        bumpScale: planet.unlocked ? 0.22 : 0.05,
        roughness: planet.unlocked ? profile.roughness : 0.9,
        metalness: planet.unlocked ? profile.metalness : 0.03,
        emissive: planet.unlocked ? profile.emissive : "#000000",
        emissiveIntensity: planet.unlocked ? profile.emissiveIntensity : 0,
      });
      if (planet.unlocked) mat.color.set(profile.color);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 40), mat);
      mesh.userData = { planet };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      let aura = null;
      if (planet.unlocked) {
        aura = new THREE.Mesh(
          new THREE.SphereGeometry(radius * 1.14, 28, 28),
          new THREE.MeshBasicMaterial({
            color: "#9fc6ff",
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        scene.add(aura);
      }

      let ring = null;
      if (planet.name === "Saturn") {
        ring = new THREE.Mesh(
          new THREE.RingGeometry(radius * 1.38, radius * 2.2, 88),
          new THREE.MeshStandardMaterial({
            color: "#d6c39e",
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            roughness: 1,
            metalness: 0,
          })
        );
        ring.rotation.x = THREE.MathUtils.degToRad(75);
        ring.receiveShadow = true;
        scene.add(ring);
      }

      let label = null;
      if (planet.unlocked) {
        label = makeLabelSprite(planet.name);
        if (label) scene.add(label);
      }

      let atmosphere = null;
      if (planet.name === "Earth" && planet.unlocked) {
        atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(radius * 1.06, 64, 64),
          new THREE.MeshPhysicalMaterial({
            color: "#8fd3ff",
            transparent: true,
            opacity: 0.12,
            roughness: 0.12,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            transmission: 0.55,
            thickness: 0.35,
            ior: 1.06,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        atmosphere.renderOrder = 2;
        scene.add(atmosphere);
      }

      return { planet, mesh, aura, ring, label, atmosphere, orbitRadius, orbitA: orbitRadius, orbitB: orbitRadius };
    });
    planetEntriesRef.current = planetEntries;
    const earthEntry = planetEntries.find((entry) => entry.planet.name === "Earth");
    const moonTexture = (isPresentation ? loadBodyTexture(textureLoader, "moon") : null) ?? makeMoonTexture();
    const moonSizeMultiplier = isPresentation ? PRESENTATION_SIZE_MULTIPLIER.Earth : 1;
    const moonRadiusScene = MOON_RADIUS_KM * kmToScene * moonSizeMultiplier;
    const moonOrbitRadiusScene = EARTH_MOON_DISTANCE_KM * kmToScene * (isPresentation ? 1.22 : 1);
    const moon = earthEntry
      ? new THREE.Mesh(
          new THREE.SphereGeometry(moonRadiusScene, 40, 40),
          new THREE.MeshStandardMaterial({
            color: "#efeff2",
            map: moonTexture,
            bumpMap: moonTexture,
            bumpScale: 0.22,
            roughness: 0.94,
            metalness: 0.02,
            emissive: "#202330",
            emissiveIntensity: 0.14,
          })
        )
      : null;
    if (moon) {
      moon.castShadow = true;
      moon.receiveShadow = true;
      moon.userData = {
        planet: {
          name: "Moon",
          unlocked: true,
          mass: "7.342e22 kg",
          gravity: "1.62 m/s²",
          tempMinC: -173,
          tempMaxC: 127,
          ageBillionYears: 4.51,
        },
      };
      scene.add(moon);
    }
    const moonLabel = moon ? makeLabelSprite("Moon", { scale: isPresentation ? [20, 5, 1] : [16, 4, 1] }) : null;
    if (moonLabel) scene.add(moonLabel);

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    const handlePointerMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      lastPointer = { x: event.clientX, y: event.clientY };
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const handlePointerLeave = () => {
      mouse.set(-10, -10);
      leaveCbRef.current?.();
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);

    let frameId = 0;
    const startMs = Date.now();
    const timeScale = 0.5;
    const animate = () => {
      const elapsedSec = (Date.now() - startMs) / 1000;
      const earthYears = (elapsedSec / 30) * timeScale;
      stars.rotation.y = 0;
      stars.rotation.x = 0;

      planetEntries.forEach((entry) => {
        const { planet, mesh, aura, ring, label, orbitA, orbitB } = entry;
        const e = ECCENTRICITY[planet.name] ?? 0.02;
        const phase = THREE.MathUtils.degToRad(planet.meanLongitudeDegJ2000);
        const speed = ORBIT_CYCLES[planet.name] ?? 1;
        const angle = phase + earthYears * Math.PI * 2 * speed;
        const perihelionFloor = sunRadius + mesh.geometry.parameters.radius + 6;
        const requiredA = perihelionFloor / Math.max(0.3, 1 - e);
        const a = Math.max(orbitA, requiredA);
        const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
        const x = a * (Math.cos(angle) - e);
        const z = b * Math.sin(angle);
        const y = z * 0.08;
        mesh.position.set(x, y, z);
        mesh.rotation.y += 0.009 * timeScale;
        const toSun = new THREE.Vector3(-x, -y, -z).normalize();
        const lit = Math.max(0, toSun.dot(new THREE.Vector3(0, 0, 1)));
        if (planet.unlocked) {
          mesh.material.emissiveIntensity = 0.52 + lit * 0.9;
        }
        if (aura) {
          aura.position.copy(mesh.position);
          aura.material.opacity = 0.18;
        }
        if (entry.atmosphere) {
          entry.atmosphere.position.copy(mesh.position);
        }

        if (ring) {
          ring.position.copy(mesh.position);
          ring.material.transparent = true;
          ring.material.opacity = 0.75;
        }
        if (label) {
          label.position.set(x, y + mesh.geometry.parameters.radius + 4.4, z);
          label.material.opacity = 1;
        }
      });
      if (moon && earthEntry) {
        const lunarCyclesPerEarthYear = 13.37;
        const moonAngle = earthYears * Math.PI * 2 * lunarCyclesPerEarthYear;
        const mx = earthEntry.mesh.position.x + Math.cos(moonAngle) * moonOrbitRadiusScene;
        const mz = earthEntry.mesh.position.z + Math.sin(moonAngle) * moonOrbitRadiusScene;
        const my = earthEntry.mesh.position.y + Math.sin(moonAngle * 1.35) * (moonOrbitRadiusScene * 0.08);
        moon.position.set(mx, my, mz);
        moon.rotation.y += 0.011 * timeScale;
        if (moonLabel) {
          moonLabel.position.set(mx, my + moonRadiusScene + 2.2, mz);
          moonLabel.material.opacity = 1;
        }
      }
      if (sunLabel) {
        sunLabel.position.set(0, sun.geometry.parameters.radius + 10, 0);
      }

      raycaster.setFromCamera(mouse, camera);
      const pickMeshes = moon ? [...planetEntries.map((p) => p.mesh), moon] : planetEntries.map((p) => p.mesh);
      const hits = raycaster.intersectObjects(pickMeshes, false);
      if (hits.length > 0) {
        const hit = hits[0].object.userData.planet;
        hoverCbRef.current?.(hit, lastPointer.x, lastPointer.y);
      } else {
        leaveCbRef.current?.();
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      controls.dispose();
      planetEntries.forEach(({ mesh, aura, ring, label }) => {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.dispose();
        if (aura) {
          aura.geometry.dispose();
          aura.material.dispose();
        }
        if (ring) {
          ring.geometry.dispose();
          ring.material.dispose();
        }
        if (label) {
          label.material.map?.dispose();
          label.material.dispose();
        }
      });
      if (moon) {
        moon.geometry.dispose();
        moon.material.map?.dispose();
        moon.material.dispose();
      }
      if (moonLabel) {
        moonLabel.material.map?.dispose();
        moonLabel.material.dispose();
      }
      sun.geometry.dispose();
      sun.material.map?.dispose();
      sun.material.dispose();
      if (sunLabel) {
        sunLabel.material.map?.dispose();
        sunLabel.material.dispose();
      }
      starsGeo.dispose();
      stars.material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [scaleMode]);

  useEffect(() => {
    const scene = sceneRef.current;
    const entries = planetEntriesRef.current;
    if (!scene || entries.length === 0) return;

    entries.forEach((entry) => {
      const updated = planets.find((p) => p.name === entry.planet.name);
      if (!updated) return;

      const prevUnlocked = entry.planet.unlocked;
      entry.planet = updated;
      entry.mesh.userData = { planet: updated };

      if (!prevUnlocked && updated.unlocked) {
        const tex = makePlanetTexture(updated.name, true);
        entry.mesh.material.map?.dispose?.();
        if (entry.mesh.material.bumpMap && entry.mesh.material.bumpMap !== entry.mesh.material.map) {
          entry.mesh.material.bumpMap?.dispose?.();
        }
        entry.mesh.material.map = tex;
        entry.mesh.material.bumpMap = tex;
        entry.mesh.material.bumpScale = 0.22;
        entry.mesh.material.needsUpdate = true;

        const profileDefaults = {
          roughness: 0.78,
          metalness: 0.03,
          emissive: "#2f4470",
          emissiveIntensity: 0.5,
          color: "#ffffff",
        };
        const materialProfile = {
          Mercury: { roughness: 0.9, metalness: 0.04, emissive: "#293647", emissiveIntensity: 0.36, color: "#fff7ed" },
          Venus: { roughness: 0.84, metalness: 0.03, emissive: "#5f3e1f", emissiveIntensity: 0.4, color: "#fff0cc" },
          Earth: { roughness: 0.68, metalness: 0.03, emissive: "#2f4f7f", emissiveIntensity: 0.5, color: "#f3fbff" },
          Mars: { roughness: 0.8, metalness: 0.03, emissive: "#6a3522", emissiveIntensity: 0.42, color: "#ffe6db" },
          Jupiter: { roughness: 0.74, metalness: 0.04, emissive: "#5e4425", emissiveIntensity: 0.44, color: "#fff5e8" },
          Saturn: { roughness: 0.72, metalness: 0.05, emissive: "#6b5327", emissiveIntensity: 0.46, color: "#fff8de" },
          Uranus: { roughness: 0.68, metalness: 0.04, emissive: "#1f5d66", emissiveIntensity: 0.44, color: "#efffff" },
          Neptune: { roughness: 0.69, metalness: 0.05, emissive: "#233b7a", emissiveIntensity: 0.5, color: "#edf3ff" },
          Pluto: { roughness: 0.86, metalness: 0.03, emissive: "#513a2f", emissiveIntensity: 0.34, color: "#fff0e6" },
        };
        const profile = materialProfile[updated.name] ?? profileDefaults;

        entry.mesh.material.roughness = profile.roughness;
        entry.mesh.material.metalness = profile.metalness;
        entry.mesh.material.emissive = new THREE.Color(profile.emissive);
        entry.mesh.material.emissiveIntensity = profile.emissiveIntensity;
        entry.mesh.material.color = new THREE.Color(profile.color);

        if (!entry.aura) {
          entry.aura = new THREE.Mesh(
            new THREE.SphereGeometry(entry.mesh.geometry.parameters.radius * 1.14, 28, 28),
            new THREE.MeshBasicMaterial({
              color: "#9fc6ff",
              transparent: true,
              opacity: 0.15,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            })
          );
          scene.add(entry.aura);
        }
        if (!entry.label) {
          entry.label = makeLabelSprite(updated.name);
          if (entry.label) scene.add(entry.label);
        }
      }

      if (prevUnlocked && !updated.unlocked) {
        // Revert to "locked" look on reset.
        const lockedTex = makePlanetTexture(updated.name, false);
        entry.mesh.material.map?.dispose?.();
        if (entry.mesh.material.bumpMap && entry.mesh.material.bumpMap !== entry.mesh.material.map) {
          entry.mesh.material.bumpMap?.dispose?.();
        }
        entry.mesh.material.map = lockedTex;
        entry.mesh.material.bumpMap = lockedTex;
        entry.mesh.material.bumpScale = 0.05;
        entry.mesh.material.roughness = 0.9;
        entry.mesh.material.metalness = 0.03;
        entry.mesh.material.emissive = new THREE.Color("#000000");
        entry.mesh.material.emissiveIntensity = 0;
        entry.mesh.material.color = new THREE.Color("#a2adbf");
        entry.mesh.material.needsUpdate = true;

        if (entry.aura) {
          scene.remove(entry.aura);
          entry.aura.geometry.dispose();
          entry.aura.material.dispose();
          entry.aura = null;
        }
        if (entry.label) {
          scene.remove(entry.label);
          entry.label.material.map?.dispose();
          entry.label.material.dispose();
          entry.label = null;
        }
        if (entry.atmosphere) {
          scene.remove(entry.atmosphere);
          entry.atmosphere.geometry.dispose();
          entry.atmosphere.material.dispose();
          entry.atmosphere = null;
        }
      }

      if (!prevUnlocked && updated.unlocked && updated.name === "Earth" && !entry.atmosphere) {
        const r = entry.mesh.geometry.parameters.radius;
        entry.atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(r * 1.06, 64, 64),
          new THREE.MeshPhysicalMaterial({
            color: "#8fd3ff",
            transparent: true,
            opacity: 0.12,
            roughness: 0.12,
            metalness: 0,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
            transmission: 0.55,
            thickness: 0.35,
            ior: 1.06,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        entry.atmosphere.renderOrder = 2;
        scene.add(entry.atmosphere);
      }
    });
  }, [planets]);

  return <div ref={mountRef} className="h-full w-full" />;
}

