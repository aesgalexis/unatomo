"use strict";
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


// ==== 5) 3 órbitas + 3 electrones (5/6/7 s por vuelta) ====
const orbits=[];
function createOrbit(radius, periodSec){
const pivot = new THREE.Object3D();
pivot.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, Math.max(0.012*radius,0.035), 12, 180), ringMat.clone());
pivot.add(ring);
const rotator = new THREE.Object3D();
pivot.add(rotator);
const holder = new THREE.Object3D();
holder.position.x = radius;
rotator.add(holder);
const electron = new THREE.Mesh(new THREE.SphereGeometry(0.14,24,24), electronMat.clone());
holder.add(electron);
atom.add(pivot);
const omega = (Math.PI*2)/periodSec; // rad/s
rotator.rotation.z = Math.random()*Math.PI*2; // fase inicial
return { pivot, ring, rotator, holder, electron, omega, precessSpeed:(Math.random()*0.6-0.3)*0.10, wobblePhase:Math.random()*Math.PI*2 };
}
const BASE=6.4, GAP=1.6; // la pequeña = antigua grande
orbits.push(createOrbit(BASE+0*GAP,5.0));
orbits.push(createOrbit(BASE+1*GAP,6.0));
orbits.push(createOrbit(BASE+2*GAP,7.0));


// ==== 6) Interacción protones: cursor + panel anclado 400x400 (opacidad 35%) ====
const raycaster = new THREE.Raycaster(); const mouse=new THREE.Vector2(); let hoverProton=null; let panelEl=null, panelTarget=null, nucleusPaused=false;
function ndc(e){ const r=renderer.domElement.getBoundingClientRect(); mouse.x=((e.clientX-r.left)/r.width)*2-1; mouse.y=-((e.clientY-r.top)/r.height)*2+1; }
function hitProtons(){ raycaster.setFromCamera(mouse,camera); return raycaster.intersectObjects(protons,false); }
renderer.domElement.addEventListener('mousemove', (e)=>{ ndc(e); const hits=hitProtons(); hoverProton=(hits&&hits[0])?hits[0].object:null; renderer.domElement.style.cursor = hoverProton? 'pointer':'default'; }, {passive:true});


function projectToScreen(obj){ const v=new THREE.Vector3(); obj.getWorldPosition(v); v.project(camera); return { x:(v.x*0.5+0.5)*innerWidth, y:(-v.y*0.5+0.5)*innerHeight }; }
function clampPos(x,y){ const w=400,h=400; return {x:Math.max(0,Math.min(x,innerWidth-w)), y:Math.max(0,Math.min(y,innerHeight-h))}; }
function showPanelFor(proton){
const pos=projectToScreen(proton), c=clampPos(pos.x,pos.y);
if(panelEl){ panelEl.remove(); panelEl=null; }
panelEl=document.createElement('div'); panelEl.className='panel'; panelEl.style.cssText='position:fixed;width:400px;height:400px;background:rgba(0,0,0,.35);border:1px solid #263247;border-radius:12px;backdrop-filter:blur(2px);z-index:20;box-shadow:0 10px 30px rgba(0,0,0,.35);overflow:auto;left:'+c.x+'px;top:'+c.y+'px;';
panelEl.innerHTML='<header style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:8px 10px;background:rgba(15,23,42,.4)">AB seleccionado <span class="close" style="cursor:pointer;padding:2px 8px;border:1px solid #334155;border-radius:8px">×</span></header><div class="content" id="panelContent" style="padding:10px;font-size:12px;color:#cbd5e1;white-space:pre-wrap"></div>';
document.body.appendChild(panelEl);
const payload = proton.userData?.payload; const cont = document.getElementById('panelContent'); cont.textContent = (payload?.text || '').trim() || '(Sin contenido)';
panelEl.querySelector('.close').addEventListener('click', ()=>{ panelEl.remove(); panelEl=null; panelTarget=null; nucleusPaused=false; });
panelTarget = proton; nucleusPaused = true;
}


renderer.domElement.addEventListener('mousedown', (e)=>{ if(e.button!==0) return; ndc(e); const hits=hitProtons(); if(hits.length){ showPanelFor(hits[0].object); return; } draggingAtom=true; lastX=e.clientX; lastY=e.clientY; atomVelX=0; atomVelY=0; });


// ==== 7) Rotación global con inercia / zoom / reset ====
let draggingAtom=false, lastX=0,lastY=0; let atomVelX=0, atomVelY=0; const FRICTION=0.965;
window.addEventListener('mouseup', ()=>{ draggingAtom=false; });
window.addEventListener('mousemove', (e)=>{ if(!draggingAtom) return; const dx=e.clientX-lastX,dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY; const k=0.005; atom.rotation.y+=dx*k; atom.rotation.x+=dy*k; atomVelY=dx*k*60; atomVelX=dy*k*60; }, {passive:true});
let camDist=camera.position.length();
renderer.domElement.addEventListener('wheel', e=>{ e.preventDefault(); camDist*=(1+Math.sign(e.deltaY)*0.08); camDist=Math.max(5,Math.min(70,camDist)); const dirV=camera.position.clone().normalize(); camera.position.copy(dirV.multiplyScalar(camDist)); camera.lookAt(0,0,0); }, {passive:false});
window.addEventListener('keydown', e=>{ if(e.key.toLowerCase()==='r'){ camera.position.set(0,7,20); camera.lookAt(0,0,0); camDist=20; atom.rotation.set(0,0,0); atomVelX=0; atomVelY=0; orbits.forEach(o=>{ o.pivot.rotation.set(0,0,0); o.rotator.rotation.set(0,0,0); }); nucleusPaused=false; if(panelEl){ panelEl.remove(); panelEl=null; panelTarget=null; } } });


// ==== 8) Main loop ====
const clock=new THREE.Clock();
function animate(){
const dt=clock.getDelta(); const t=performance.now()*0.001;
if(!nucleusPaused){ nucleus.rotation.y += dt*0.2; nucleus.rotation.x += dt*0.1; }
glow.intensity = 0.5 + 0.15*Math.sin(t*1.1);
if(!draggingAtom){ atom.rotation.x += atomVelX*dt; atom.rotation.y += atomVelY*dt; atomVelX*=FRICTION; atomVelY*=FRICTION; if(Math.abs(atomVelX)<1e-4) atomVelX=0; if(Math.abs(atomVelY)<1e-4) atomVelY=0; }
for(const o of orbits){ o.pivot.rotation.y += o.precessSpeed*dt; const wob=0.05*Math.sin(t*0.6 + o.wobblePhase); o.pivot.rotation.x += (wob - o.pivot.rotation.x)*0.02; o.pivot.rotation.z += (wob*0.6 - o.pivot.rotation.z)*0.02; o.rotator.rotation.z += o.omega*dt; }
if(panelEl&&panelTarget){ const p=projectToScreen(panelTarget), c=clampPos(p.x,p.y); panelEl.style.left=c.x+'px'; panelEl.style.top=c.y+'px'; }
renderer.render(scene,camera); requestAnimationFrame(animate);
}
animate();


// ==== 9) Botón volver + Resize ====
document.getElementById('backBtn')?.addEventListener('click', ()=>{ history.back(); });
addEventListener('resize', ()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
})();
