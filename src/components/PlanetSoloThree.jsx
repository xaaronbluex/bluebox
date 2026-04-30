import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const textureByBase = Object.entries(
  import.meta.glob("../../public/static/img/03_planet/*.{jpg,jpeg,png,webp}", { eager: true, import: "default" })
).reduce((acc, [filePath, assetUrl]) => {
  const fileName = filePath.split("/").pop() ?? "";
  const base = fileName.replace(/\.[^.]+$/, "").toLowerCase();
  acc[base] = assetUrl;
  return acc;
}, {});

function resolvePlanetTextureUrl(planetId) {
  const id = planetId.toLowerCase();
  if (textureByBase[id]) return textureByBase[id];
  const cap = id.charAt(0).toUpperCase() + id.slice(1);
  if (textureByBase[cap.toLowerCase()]) return textureByBase[cap.toLowerCase()];
  return textureByBase[id] ?? null;
}

export default function PlanetSoloThree({ planetId }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030611");

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(0, 3, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.minDistance = 6;
    controls.maxDistance = 64;

    scene.add(new THREE.AmbientLight("#c8d4e8", 0.35));
    const key = new THREE.DirectionalLight("#ffffff", 1.25);
    key.position.set(14, 12, 10);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#8899bb", 0.35);
    fill.position.set(-8, -4, -10);
    scene.add(fill);

    const url = resolvePlanetTextureUrl(planetId);
    const loader = new THREE.TextureLoader();
    let planet;
    if (url) {
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      planet = new THREE.Mesh(
        new THREE.SphereGeometry(6, 64, 64),
        new THREE.MeshStandardMaterial({
          color: "#ffffff",
          map: tex,
          bumpMap: tex,
          bumpScale: 0.06,
          roughness: 0.88,
          metalness: 0.02,
        })
      );
    } else {
      planet = new THREE.Mesh(
        new THREE.SphereGeometry(6, 64, 64),
        new THREE.MeshStandardMaterial({ color: "#6b7280", roughness: 0.9, metalness: 0.05 })
      );
    }
    scene.add(planet);

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    const animate = () => {
      const dt = clock.getDelta();
      planet.rotation.y += 0.12 * dt;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      planet.geometry.dispose();
      const tex = planet.material.map ?? planet.material.bumpMap;
      if (tex) tex.dispose();
      planet.material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [planetId]);

  return <div ref={mountRef} className="h-full w-full" />;
}
