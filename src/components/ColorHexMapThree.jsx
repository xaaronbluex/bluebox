import { useEffect, useRef } from "react";
import * as THREE from "three";
import { manualColorMap } from "../data/colors";

function makeHexGeometry(radius = 5.5, depth = 1.6) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });
}

export default function ColorHexMapThree({ colors, onHoverHex, onLeaveHex }) {
  const mountRef = useRef(null);
  const hoverCbRef = useRef(onHoverHex);
  const leaveCbRef = useRef(onLeaveHex);

  useEffect(() => {
    hoverCbRef.current = onHoverHex;
  }, [onHoverHex]);

  useEffect(() => {
    leaveCbRef.current = onLeaveHex;
  }, [onLeaveHex]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1f1c");

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 2000);
    camera.position.set(0, 120, 220);
    camera.lookAt(0, -10, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight("#ffffff", 0.78));
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.7);
    keyLight.position.set(50, 120, 160);
    scene.add(keyLight);

    const geom = makeHexGeometry(5.5, 1.6);
    const entries = [];

    const rowSpacing = 11;
    const colSpacing = 9.4;
    const maxLen = Math.max(...manualColorMap.map((r) => r.length));

    manualColorMap.forEach((col, q) => {
      const padTop = ((maxLen - col.length) * rowSpacing) / 2;
      col.forEach((hex, r) => {
        const data = colors.find((c) => c.hex === hex);
        const unlocked = data ? data.unlocked : true;
        const baseHex = hex === "RAINBW" ? "#ffffff" : hex;

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(baseHex),
          roughness: 0.9,
          metalness: 0.02,
        });
        if (!unlocked) {
          mat.color.multiplyScalar(0.24);
        }
        const mesh = new THREE.Mesh(geom, mat);
        const x = q * colSpacing - (manualColorMap.length * colSpacing) / 2 + 26;
        const y = -(padTop + r * rowSpacing) + (maxLen * rowSpacing) / 2 - 42;
        mesh.position.set(x, y, 0);
        mesh.rotation.x = -0.48;
        mesh.userData = { hex, data, unlocked, baseScale: 1 };
        scene.add(mesh);
        entries.push(mesh);
      });
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-10, -10);
    let hovered = null;
    let pointer = { x: 0, y: 0 };

    const onMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer = { x: event.clientX, y: event.clientY };
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onLeave = () => {
      mouse.set(-10, -10);
      hovered = null;
      leaveCbRef.current?.();
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let frameId = 0;
    const animate = () => {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(entries, false);
      const nextHovered = hits[0]?.object ?? null;
      hovered = nextHovered;

      entries.forEach((mesh) => {
        const target = mesh === hovered ? 1.35 : 1;
        mesh.scale.lerp(new THREE.Vector3(target, target, target), 0.18);
        const zTarget = mesh === hovered ? 9 : 0;
        mesh.position.z += (zTarget - mesh.position.z) * 0.18;
      });

      if (hovered) {
        const { hex, data, unlocked } = hovered.userData;
        const display = hex === "RAINBW" ? "♻" : hex.replace("#", "").toUpperCase();
        const rarity = data?.rarity ?? "EXR";
        hoverCbRef.current?.({
          x: pointer.x,
          y: pointer.y,
          title: `HEX ${display}`,
          detail: `Rarity: ${rarity} | ${unlocked ? "Unlocked" : "Locked"}`,
          color:
            rarity === "EXR" ? "#ff5ad1" : rarity === "UR" ? "#ffd166" : rarity === "SR" ? "#8ecbff" : rarity === "R" ? "#9dff9d" : "#d5f5ee",
        });
      } else {
        leaveCbRef.current?.();
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      entries.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [colors]);

  return <div ref={mountRef} className="h-full w-full rounded-lg border border-emerald-700/40" />;
}

