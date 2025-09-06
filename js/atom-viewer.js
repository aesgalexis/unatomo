<!--
Archivo 2/2: /js/atom-viewer.js
Guárdalo como /js/atom-viewer.js (crea la carpeta js si no existe)
-->
"use strict";
(function(){
// ==== Util: lee ABs del index guardados por el botón Visualize ====
function readABData(){ try{ return JSON.parse(sessionStorage.getItem('atomABData')||'null'); }catch(_){ return null; } }
const abData = readABData();
const abList = Array.isArray(abData?.ab) ? abData.ab : [];
const COLOR = { main: 0xff6b6b, side: 0x9aa4b2, landing: 0xffffff };
const infos = abList.slice(0,118).map((ab,i)=>({ color: COLOR[ab.where] ?? COLOR.main, text: (ab.text||`AB #${i+1}`) }));
if(infos.length===0){ infos.push({ color: COLOR.main, text: 'Sin datos de AB — usa el botón Visualize en index.' }); }


// ==== UI mínima (tip + HUD) ====
const uiRoot = document.getElementById('ui-root');
uiRoot.insertAdjacentHTML('beforeend', `
<div class="tip" style="position:fixed;left:12px;top:12px;font-size:12px;opacity:.9;background:rgba(17,24,39,.55);border:1px solid #263247;padding:8px 10px;border-radius:10px;z-index:10">
Lee ABs desde <b>sessionStorage</b>. Colores: <b>main</b> rojo, <b>side</b> gris, <b>landing</b> blanco. Clic en protón → panel con el texto del AB.
</div>
<div class="hud" style="position:fixed;right:12px;top:12px;display:flex;gap:8px;align-items:center;background:rgba(17,24,39,.55);border:1px solid #263247;padding:8px 10px;border-radius:10px;z-index:10">
<button id="backBtn" style="background:#18223a;color:#e5e7eb;border:1px solid #334155;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:600">← Volver</button>
<span class="counts" id="counts" style="font-size:12px;opacity:.85">—</span>
</div>
`);


// ==== Escena THREE ====
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1020);
const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000); camera.position.set(0,7,20);
const renderer = new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); renderer.setSize(innerWidth,innerHeight); document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.35)); const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(5,7,3); scene.add(dir);


const atom = new THREE.Group(); scene.add(atom);
const nucleus = new THREE.Group(); atom.add(nucleus);
const glow = new THREE.PointLight(0x7dd3fc, 0.7, 50); nucleus.add(glow);


const ringMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe:true, transparent:true, opacity:0.35 });
const electronMat = new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x0ea5e9, emissiveIntensity: 0.85 });


// ==== Núcleo con colores + payload de texto ====
let protons = [];
function setNucleusFromInfos(arr){
while(nucleus.children.length>1){ const obj=nucleus.children[1]; nucleus.remove(obj); obj.geometry?.dispose?.(); obj.material?.dispose?.(); }
protons = [];
const Z = Math.max(1, Math.min(118, arr.length));
const R = 0.7 + Math.cbrt(Z)*0.27;
for(let i=0;i<Z;i++){
const inf = arr[i];
const mat = new THREE.MeshPhongMaterial({ color: inf.color, emissive: (inf.color===0xffffff?0x222222: (inf.color===0x9aa4b2?0x1a1f2b:0x4d1a1a)), emissiveIntensity: 0.35 });
const p = new THREE.Mesh(new THREE.SphereGeometry(0.18,16,16), mat);
p.userData.isProton = true; p.userData.payload = { text: inf.text };
if(Z===1){ p.position.set(0,0,0); }
else{
const phi = Math.acos(1 - 2*(i+0.5)/Z);
const theta = Math.PI * (1 + Math.sqrt(5)) * (i+0.5);
const r = R * (0.85 + Math.random()*0.1);
p.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
}
nucleus.add(p); protons.push(p);
}
document.getElementById('counts').textContent = `Z=${Z} · ABs capturados`;
}
setNucleusFromInfos(infos);


// ==== 3 órbitas + 3 electrones (5/6/7 s por vuelta) ====
const orbits=[];
function createOrbit(radius, periodSec){
})();
