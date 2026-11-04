// Offline conversion: preserve geometry, vertex colors and textures; avoid XML parsing at runtime.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DOMParser } from 'linkedom';
import { Texture, TextureLoader, MeshBasicMaterial, DoubleSide } from 'three';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

globalThis.DOMParser = DOMParser;
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};
TextureLoader.prototype.load = function (url) {
  const texture = new Texture({ src: url });
  return texture;
};
const root = resolve(import.meta.dirname, '../public');
for (const path of [
  'environment/honeyhive/ForestHomePlanet',
  'environment/garden/DiskGardenPlanet',
  'models/StarPiece',
]) {
  const input = await readFile(resolve(root, '../assets/model-sources', path + '.dae'), 'utf8');
  const { scene } = new ColladaLoader().parse(input, '');
  scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    // glTF uses the opposite texture origin; flip UVs instead of duplicating PNG files.
    const uv = mesh.geometry.attributes.uv;
    if (uv && !mesh.geometry.userData.uvFlipped) {
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
      mesh.geometry.userData.uvFlipped = true;
    }
    mesh.geometry = mergeVertices(mesh.geometry, 1e-6);
    const convert = (old) => {
      if (old.map) old.map.flipY = false;
      return new MeshBasicMaterial({
        map: path === 'models/StarPiece' ? null : old.map,
        color: 0xffffff,
        vertexColors: !!mesh.geometry.attributes.color,
        side: DoubleSide,
        alphaTest: 0.4,
      });
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(convert)
      : convert(mesh.material);
  });
  const exporter = new GLTFExporter();
  exporter.register((writer) => {
    const images = new Map();
    writer.processImage = (image) => {
      if (!images.has(image.src)) {
        writer.json.images ||= [];
        images.set(image.src, writer.json.images.length);
        writer.json.images.push({ uri: image.src });
      }
      return images.get(image.src);
    };
    return { name: 'EXTERNAL_TEXTURES' };
  });
  const output = await exporter.parseAsync(scene, { binary: true });
  await writeFile(resolve(root, path + '.glb'), Buffer.from(output));
  console.log(`${path}: ${input.length} → ${output.byteLength} bytes`);
}
