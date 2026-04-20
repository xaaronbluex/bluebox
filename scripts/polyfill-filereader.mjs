// Three.js GLTFExporter uses browser FileReader when assembling GLB.
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer()).then((ab) => {
        this.result = ab;
        this.onloadend?.();
      });
    }
  };
}
