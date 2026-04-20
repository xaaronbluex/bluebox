import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import earthColourCJpg from "../../03_planet/earth_colour_c.jpg";
import moon1Jpg from "../../03_planet/moon1.jpg";

// Texture assignment using your provided files:
// - earth_colour.jpg: Earth color map
// - Moon.jpg: moon map (also used as bump map for now)
const EARTH_MAP_URL = earthColourCJpg;
const EARTH_STL_URL = "/Earth.stl";
const MOON_MAP_URL = moon1Jpg;
const MOON_BUMP_URL = moon1Jpg;

function applySphericalUVs(geometry) {
  geometry.computeBoundingBox();
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const radius = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / radius;
    const ny = y / radius;
    const nz = z / radius;

    // Longitude/latitude spherical mapping
    const u = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI);
    const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, ny))) / Math.PI;
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export default function EarthMoonThree() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#01050d");

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(0, 10, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.minDistance = 12;
    controls.maxDistance = 120;

    // Lighting tuned for stronger day/night contrast on Earth.
    scene.add(new THREE.AmbientLight("#8aa0c8", 0.12));
    const earthRadius = 6;
    const sunLight = new THREE.DirectionalLight("#ffffff", 2.35);
    sunLight.position.set(35, 20, 25);
    sunLight.castShadow = true;
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight("#8fb9ff", 0.14);
    fillLight.position.set(-25, -8, -20);
    scene.add(fillLight);

    const loader = new THREE.TextureLoader();
    const earthMap = loader.load(EARTH_MAP_URL);
    const moonMap = loader.load(MOON_MAP_URL);
    const moonBump = loader.load(MOON_BUMP_URL);
    [earthMap, moonMap, moonBump].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    let earth = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius, 64, 64),
      new THREE.MeshStandardMaterial({
        map: earthMap,
        roughness: 0.72,
        metalness: 0.02,
        emissive: "#000000",
        emissiveIntensity: 0,
      })
    );
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);

    // STL is geometry data (not a texture). If Earth.stl exists, use it as Earth's mesh.
    // If it does not exist or fails to load, keep the textured sphere fallback above.
    const stlLoader = new STLLoader();
    stlLoader.load(
      EARTH_STL_URL,
      (stlGeometry) => {
        stlGeometry.computeVertexNormals();
        stlGeometry.center();
        stlGeometry.computeBoundingSphere();
        const radius = stlGeometry.boundingSphere?.radius || 1;
        const scale = 6 / radius;
        stlGeometry.scale(scale, scale, scale);
        applySphericalUVs(stlGeometry);

        const stlEarth = new THREE.Mesh(
          stlGeometry,
          new THREE.MeshStandardMaterial({
            map: earthMap,
            roughness: 0.62,
            metalness: 0.03,
            emissive: "#1a3760",
            emissiveIntensity: 0.08,
          })
        );
        stlEarth.castShadow = true;
        stlEarth.receiveShadow = true;

        scene.remove(earth);
        earth.geometry.dispose();
        earth.material.map?.dispose?.();
        earth.material.dispose();
        earth = stlEarth;
        scene.add(earth);
      },
      undefined,
      () => {
        // Keep sphere fallback silently.
      }
    );

    const moonPivot = new THREE.Object3D();
    scene.add(moonPivot);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 48, 48),
      new THREE.MeshStandardMaterial({
        map: moonMap,
        bumpMap: moonBump,
        bumpScale: 0.12,
        roughness: 0.95,
        metalness: 0.0,
      })
    );
    moon.position.set(15, 0, 0);
    moon.castShadow = true;
    moon.receiveShadow = true;
    moonPivot.add(moon);
    // Approximate lunar orbital inclination.
    moonPivot.rotation.z = THREE.MathUtils.degToRad(5.1);

    const starSpriteCanvas = document.createElement("canvas");
    starSpriteCanvas.width = 64;
    starSpriteCanvas.height = 64;
    const starCtx = starSpriteCanvas.getContext("2d");
    if (starCtx) {
      const gradient = starCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.4, "rgba(210,230,255,0.95)");
      gradient.addColorStop(1, "rgba(210,230,255,0)");
      starCtx.fillStyle = gradient;
      starCtx.beginPath();
      starCtx.arc(32, 32, 32, 0, Math.PI * 2);
      starCtx.fill();
    }
    const starSpriteTexture = new THREE.CanvasTexture(starSpriteCanvas);

    const stars = new THREE.Points(
      (() => {
        const geo = new THREE.BufferGeometry();
        const count = 1000;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
          positions[i * 3] = (Math.random() - 0.5) * 500;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geo;
      })(),
      new THREE.PointsMaterial({
        map: starSpriteTexture,
        color: "#dce8ff",
        size: 1.0,
        transparent: true,
        opacity: 0.8,
        alphaTest: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(stars);

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    // Requested ratio: 1 minute real time = 5 Earth days
    // -> 1 Earth day = 12 seconds.
    const earthSpinRadPerSec = (Math.PI * 2) / 12;
    // Approx moon sidereal orbit at the same accelerated day ratio.
    const moonOrbitRadPerSec = (Math.PI * 2) / (27.321661 * 12);

    let frameId = 0;
    const animate = () => {
      const dt = clock.getDelta();
      earth.rotation.y += earthSpinRadPerSec * dt;
      moonPivot.rotation.y += moonOrbitRadPerSec * dt; // Moon orbit around Earth
      // Keep one lunar hemisphere facing Earth (tidal locking) for natural phases.
      moon.lookAt(earth.position);
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      earth.geometry.dispose();
      earth.material.map?.dispose();
      earth.material.dispose();
      moon.geometry.dispose();
      moon.material.map?.dispose();
      moon.material.bumpMap?.dispose();
      moon.material.dispose();
      starSpriteTexture.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}
