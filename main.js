import * as THREE from 'three';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

const host = document.querySelector('#space');
const regenerateButton = document.querySelector('#regenerate');
const title = document.querySelector('#title');
const status = document.querySelector('#collection-status');
const formationButton = document.querySelector('#formation');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches, formed = false, renderer, frame, time = 0;
const bits = [];
let collected = 0, previousPointer = null;
let gathering = null;
function syncControls() {
  title.classList.toggle('star-title', formed);
  formationButton.setAttribute('aria-pressed', String(formed));
  formationButton.textContent = formed ? '✧ Release the stars' : '✧ Form the word';
}
syncControls();
try {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.position.z = 24;
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const key = new THREE.DirectionalLight(0xe6f2ff, 4); key.position.set(-4, 7, 10); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa38bff, 3); rim.position.set(6, -2, 0); scene.add(rim);
  const starsGeometry = new THREE.BufferGeometry();
  const positions = [], colors = [];
  let seed = 184;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 650; i++) {
    positions.push((random() - .5) * 65, (random() - .5) * 42, -random() * 25);
    const value = .25 + random() * .65; colors.push(value * .8, value * .9, value);
  }
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({size:.026,vertexColors:true,transparent:true,opacity:.8})));
  let width, height;
  function resize() { width = host.clientWidth; height = host.clientHeight; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); updateTargets(); if (formed && !gathering) placeFormation(); render(); }
  const palette = [0xa8e96e, 0xa985ef, 0x65bce9, 0xf5b566, 0xf2d771, 0xe58bba];
  // Sample a word silhouette for the optional formation, keeping HTML text readable.
  const wordCanvas = document.createElement('canvas'); wordCanvas.width = 720; wordCanvas.height = 160;
  const ctx = wordCanvas.getContext('2d'); ctx.font = 'bold 145px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('NEBULA', 360, 135);
  const pixels = ctx.getImageData(0, 0, 720, 160).data, targets = [];
  for (let y = 18; y < 150; y += 13) for (let x = 30; x < 700; x += 13) if (pixels[(y * 720 + x) * 4 + 3] > 128) targets.push({x,y,position:new THREE.Vector3()});
  const bounds = {left:Math.min(...targets.map(p=>p.x)),right:Math.max(...targets.map(p=>p.x)),top:Math.min(...targets.map(p=>p.y)),bottom:Math.max(...targets.map(p=>p.y))};
  let formationScale = .2;
  function updateTargets() {
    const rect = title.getBoundingClientRect(), spaceRect = host.getBoundingClientRect();
    const worldHeight = 2 * Math.tan(THREE.MathUtils.degToRad(20)) * 24;
    // Map the silhouette into the existing heading, at the camera's z=0 plane.
    const wordHeight = rect.height * .76, top = rect.top - spaceRect.top + rect.height * .12;
    for(const target of targets) {
      const x = rect.left - spaceRect.left + (target.x-bounds.left)/(bounds.right-bounds.left)*rect.width;
      const y = top + (target.y-bounds.top)/(bounds.bottom-bounds.top)*wordHeight;
      target.position.set((x/width-.5)*worldHeight*camera.aspect,(.5-y/height)*worldHeight,0);
    }
    formationScale = rect.width / (bounds.right-bounds.left) * 10 * worldHeight / height;
  }
  function placeFormation() { for(const b of bits) { b.mesh.position.copy(b.target.position); b.mesh.scale.setScalar(formationScale); } }
  function gather() {
    if (paused) { gathering=null; placeFormation(); return; }
    gathering={start:performance.now(),duration:1500};
    for(const [i,b] of bits.entries()) {
      b.departure=b.mesh.position.clone();
      b.departureScale=b.mesh.scale.x;
      b.delay=(i%11)*18;
    }
    status.textContent='Star bits are gathering into Nebula.';
  }
  new ColladaLoader().load('/models/StarPiece.dae', result => {
    let geometry;
    result.scene.updateMatrixWorld(true);
    result.scene.traverse(child => { if (child.isMesh && !geometry) { geometry = child.geometry.clone(); geometry.applyMatrix4(child.matrixWorld); } });
    if (!geometry) return;
    geometry.center(); geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3()); geometry.scale(1 / Math.max(size.x,size.y,size.z), 1 / Math.max(size.x,size.y,size.z), 1 / Math.max(size.x,size.y,size.z)); geometry.computeVertexNormals();
    for (let i = 0; i < targets.length; i++) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color:palette[i % palette.length],metalness:.28,roughness:.26,flatShading:true,emissive:palette[i % palette.length],emissiveIntensity:.13}));
      const prominent = i < 20;
      const x = (random() - .5) * 33, y = (random() - .5) * 19;
      const home = new THREE.Vector3(x, Math.abs(x) < 7 && Math.abs(y) < 5 ? (y < 0 ? -1 : 1) * (6 + random() * 3) : y, -2 + random() * 5);
      mesh.position.copy(home); mesh.rotation.set(random()*2,random()*3,random()*3);
      const scale = prominent ? .35 + random()*.55 : .08 + random()*.12;
      mesh.scale.setScalar(scale); scene.add(mesh);
      bits.push({mesh,home,target:targets[i],scale,phase:random()*Math.PI*2,speed:.12+random()*.18,prominent,collected:false});
    }
    render();
  }, undefined, () => { document.querySelector('#hint').textContent = 'A quiet corner of the galaxy'; formationButton.disabled = true; });
  function render() { renderer.render(scene,camera); }
  function tick() {
    frame = requestAnimationFrame(tick);
    if (document.hidden || paused) return;
    time += .008;
    const elapsed=gathering ? performance.now()-gathering.start : 0;
    for (const b of bits) {
      const dest = b.home.clone();
      if (b.collected) { b.mesh.scale.multiplyScalar(.72); if(b.mesh.scale.x < .01) b.mesh.visible=false; continue; }
      if (gathering) {
        const progress=THREE.MathUtils.clamp((elapsed-b.delay)/1200,0,1);
        const eased=progress*progress*(3-2*progress);
        b.mesh.position.lerpVectors(b.departure,b.target.position,eased);
        b.mesh.position.y+=Math.sin(Math.PI*progress)*Math.sin(b.phase)*1.2;
        b.mesh.scale.setScalar(THREE.MathUtils.lerp(b.departureScale,formationScale,eased));
        b.mesh.rotation.y+=.012*(1-progress);
        continue;
      }
      if (formed) { dest.copy(b.target.position); }
      else { dest.x += Math.sin(time * b.speed + b.phase)*1.4; dest.y += Math.sin(time * .6 + b.phase)*.6; }
      b.mesh.position.lerp(dest,.035); b.mesh.rotation.y += .004; b.mesh.rotation.z += .0015;
      b.mesh.scale.lerp(new THREE.Vector3().setScalar(formed?formationScale:b.scale),.04);
    }
    if(gathering && elapsed>=gathering.duration) {
      gathering=null; placeFormation(); previousPointer=null;
      status.textContent='Nebula formed. Sweep over the letters to collect their star bits.';
    }
    render();
  }
  window.addEventListener('resize',resize);
  function collect(event) {
    if (gathering || event.target.closest('a,button,summary')) { previousPointer=null; return; }
    const rect=host.getBoundingClientRect(), point=new THREE.Vector2(event.clientX-rect.left,event.clientY-rect.top);
    if(point.y<0 || point.y>height) { previousPointer=null; return; }
    const start=previousPointer || point, segment=point.clone().sub(start), length=segment.lengthSq();
    let changed=false;
    for(const b of bits) {
      if(b.collected) continue;
      const screen=b.mesh.position.clone().project(camera), center=new THREE.Vector2((screen.x*.5+.5)*width,(-screen.y*.5+.5)*height);
      const along=length ? THREE.MathUtils.clamp(center.clone().sub(start).dot(segment)/length,0,1) : 0;
      const nearest=start.clone().addScaledVector(segment,along);
      const radius=Math.max(12,b.mesh.scale.x*height/(2*Math.tan(THREE.MathUtils.degToRad(20))*(24-b.mesh.position.z))*.6);
      if(center.distanceTo(nearest)<radius) { b.collected=true; collected++; changed=true; if(paused) b.mesh.visible=false; }
    }
    previousPointer=point;
    if(changed) { status.textContent=`${collected} star bits collected. Regenerate to bring them back.`; render(); }
  }
  window.addEventListener('pointermove',collect,{passive:true});
  window.addEventListener('pointerdown',collect,{passive:true});
  window.addEventListener('pointerout',event => { if(!event.relatedTarget) previousPointer=null; });
  window.addEventListener('scroll',()=>{previousPointer=null;},{passive:true});
  function restore(preserveScale=false) { collected=0; previousPointer=null; for(const b of bits) { if(b.collected) b.mesh.scale.setScalar(b.scale); b.collected=false;b.mesh.visible=true;if(!preserveScale)b.mesh.scale.setScalar(formed?formationScale:b.scale); } }
  regenerateButton.addEventListener('click', () => { gathering=null; restore(); if(formed) { for(const b of bits)b.mesh.position.copy(b.home); gather(); } else for(const b of bits) b.mesh.position.copy(b.home); if(!gathering)status.textContent='All star bits regenerated.'; render(); });
  formationButton.addEventListener('click', () => { if(!bits.length) return; gathering=null; formed = !formed; restore(true); updateTargets(); if(formed) gather(); else { if(paused) for(const b of bits) {b.mesh.position.copy(b.home);b.mesh.scale.setScalar(b.scale);} status.textContent='Star bits released.'; } syncControls(); render(); });
  document.fonts.ready.then(resize);
  reduced.addEventListener('change',event => { paused=event.matches;if(paused && gathering){gathering=null;placeFormation();}syncControls();render(); });
  resize(); tick();
} catch(error) {
  host.style.backgroundImage = 'radial-gradient(circle at 15% 25%, #7d61a733, transparent 30%), radial-gradient(circle at 80% 70%, #6a925622, transparent 30%)';
  regenerateButton.hidden = true; formationButton.hidden = true;
  document.querySelector('#hint').hidden = true;
  console.info('Static space background enabled.',error);
}
