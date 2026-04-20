import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import earthColourDJpg from "../../03_planet/earth_colour_d.jpg";
import moon1Jpg from "../../03_planet/moon1.jpg";

const MOON_MAP_URL = moon1Jpg;

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

    scene.add(new THREE.AmbientLight("#b8c8e8", 0.32));
    const earthRadius = 6;
    const sunLight = new THREE.DirectionalLight("#ffffff", 3.2);
    sunLight.position.set(35, 20, 25);
    sunLight.castShadow = true;
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight("#a8c4ff", 0.28);
    fillLight.position.set(-25, -8, -20);
    scene.add(fillLight);

    const loader = new THREE.TextureLoader();
    const earthTex = loader.load(earthColourDJpg);
    earthTex.colorSpace = THREE.SRGBColorSpace;
    earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const moonMap = loader.load(MOON_MAP_URL);
    moonMap.colorSpace = THREE.SRGBColorSpace;
    moonMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius, 64, 64),
      new THREE.MeshStandardMaterial({
        map: earthTex,
        bumpMap: earthTex,
        bumpScale: 0.08,
        roughness: 0.52,
        metalness: 0.02,
      })
    );
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);

    const moonPivot = new THREE.Object3D();
    scene.add(moonPivot);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 48, 48),
      new THREE.MeshStandardMaterial({
        map: moonMap,
        roughness: 0.95,
        metalness: 0.0,
      })
    );
    moon.position.set(15, 0, 0);
    moon.castShadow = true;
    moon.receiveShadow = true;
    moonPivot.add(moon);
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
    const earthSpinRadPerSec = (Math.PI * 2) / 12;
    const moonOrbitRadPerSec = (Math.PI * 2) / (27.321661 * 12);

    let frameId = 0;
    const animate = () => {
      const dt = clock.getDelta();
      earth.rotation.y += earthSpinRadPerSec * dt;
      moonPivot.rotation.y += moonOrbitRadPerSec * dt;
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
      const earthTexRef = earth.material.map;
      earth.material.dispose();
      if (earthTexRef) earthTexRef.dispose();
      moon.geometry.dispose();
      moon.material.map?.dispose();
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
