import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ModelHoverPreview({ modelUrl, fileName }) {
  const mountRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) return undefined;

    setError("");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a1220");

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(0, 1.8, 4.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;

    scene.add(new THREE.AmbientLight("#c5d5ff", 0.8));
    const key = new THREE.DirectionalLight("#ffffff", 1.15);
    key.position.set(4, 6, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#8fb1ff", 0.55);
    fill.position.set(-5, 2, -6);
    scene.add(fill);

    let loadedObject = null;
    const isGltf = /\.gltf$/i.test(fileName ?? "") || /\.glb$/i.test(fileName ?? "");

    if (isGltf) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          loadedObject = gltf.scene;
          const box = new THREE.Box3().setFromObject(loadedObject);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          loadedObject.position.sub(center);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = 2.2 / maxDim;
          loadedObject.scale.setScalar(scale);
          scene.add(loadedObject);
        },
        undefined,
        () => setError("Preview supports GLB/GLTF best.")
      );
    } else {
      setError("Preview supports GLB/GLTF best.");
    }

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let frameId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      if (loadedObject) scene.remove(loadedObject);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [modelUrl, fileName]);

  return (
    <div className="rounded-xl border border-cyan-500/40 bg-slate-950/70 p-2">
      <p className="mb-2 truncate text-xs font-semibold text-cyan-100">{fileName || "Model Preview"}</p>
      <div ref={mountRef} className="h-52 w-full overflow-hidden rounded-md border border-cyan-900/50" />
      {error ? <p className="mt-2 text-[11px] text-amber-300">{error}</p> : null}
    </div>
  );
}
