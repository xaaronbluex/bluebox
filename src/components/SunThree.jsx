import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const SUN_MAP_URL = "/static/img/03_planet/sun.jpg";

export default function SunThree() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050208");

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(0, 4, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    controls.minDistance = 8;
    controls.maxDistance = 80;

    scene.add(new THREE.AmbientLight("#ffe8cc", 0.35));
    const key = new THREE.DirectionalLight("#fff5e0", 1.1);
    key.position.set(12, 18, 14);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#ffaa66", 0.45);
    rim.position.set(-10, -6, -12);
    scene.add(rim);

    const loader = new THREE.TextureLoader();
    const sunTex = loader.load(SUN_MAP_URL);
    sunTex.colorSpace = THREE.SRGBColorSpace;
    sunTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(6, 64, 64),
      new THREE.MeshStandardMaterial({
        map: sunTex,
        bumpMap: sunTex,
        bumpScale: 0.08,
        roughness: 0.92,
        metalness: 0,
        emissive: "#ff8c33",
        emissiveIntensity: 0.35,
        emissiveMap: sunTex,
      })
    );
    scene.add(sun);

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
      sun.rotation.y += 0.15 * dt;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      sun.geometry.dispose();
      sun.material.map?.dispose();
      sun.material.bumpMap?.dispose();
      sun.material.emissiveMap?.dispose();
      sun.material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}
