"use strict";
(function(){
  // ===== 1) Datos desde sessionStorage (sin optional chaining) =====
  var stored = null;
  try { stored = sessionStorage.getItem('atomABData'); } catch(e) {}
  var abData = null;
  try { abData = stored ? JSON.parse(stored) : null; } catch(e) { abData = null; }
  var abList = (abData && Array.isArray(abData.ab)) ? abData.ab : [];

  var COLOR = { main: 0xff6b6b, side: 0x9aa4b2, landing: 0xffffff };
  var infos = [];
  for (var i=0; i<Math.min(abList.length,118); i++){
    var ab = abList[i] || {};
    var col = (ab.where && COLOR[ab.where]) ? COLOR[ab.where] : COLOR.main;
    var txt = ab.text || ("AB #" + (i+1));
    infos.push({ color: col, text: txt });
  }
  if (infos.length === 0) {
    infos.push({ color: COLOR.main, text: "Sin datos de AB — usa el botón Visualize en index." });
  }

  // ===== 2) UI (tip + HUD) =====
  var uiRoot = document.getElementById('ui-root') || document.body;
  uiRoot.insertAdjacentHTML('beforeend',
    '<div class="tip" style="position:fixed;left:12px;top:12px;font-size:12px;opacity:.9;background:rgba(17,24,39,.55);border:1px solid #263247;padding:8px 10px;border-radius:10px;z-index:10">Lee ABs desde <b>sessionStorage</b>. Colores: <b>main</b> rojo, <b>side</b> gris, <b>landing</b> blanco. Clic en protón → panel con el texto del AB.</div>'+
    '<div class="hud" style="position:fixed;right:12px;top:12px;display:flex;gap:8px;align-items:center;background:rgba(17,24,39,.55);border:1px solid #263247;padding:8px 10px;border-radius:10px;z-index:10"><button id="backBtn" style="background:#18223a;color:#e5e7eb;border:1px solid #334155;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:600">← Volver</button><span class="counts" id="counts" style="font-size:12px;opacity:.85">—</span></div>'
  );

  // ===== 3) THREE: escena básica =====
  var scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1020);
  var camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 2000); camera.position.set(0,7,20);
  var renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(5,7,3); scene.add(dir);

  var atom = new THREE.Group(); scene.add(atom);
  var nucleus = new THREE.Group(); atom.add(nucleus);
  var glow = new THREE.PointLight(0x7dd3fc, 0.7, 50); nucleus.add(glow);

  var ringMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe:true, transparent:true, opacity:0.35 });
  var electronMat = new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x0ea5e9, emissiveIntensity: 0.85 });

  // ===== 4) Núcleo con colores + payload de texto =====
  var protons = [];
  function setNucleusFromInfos(arr){
    while(nucleus.children.length>1){
      var obj = nucleus.children[1];
      nucleus.remove(obj);
      if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
      if (obj.material && obj.material.dispose) obj.material.dispose();
    }
    protons = [];
    var Z = Math.max(1, Math.min(118, arr.length));
    var R = 0.7 + Math.cbrt(Z)*0.27;
    for (var i=0; i<Z; i++){
      var inf = arr[i];
      var emissive = (inf.color===0xffffff?0x222222:(inf.color===0x9aa4b2?0x1a1f2b:0x4d1a1a));
      var mat = new THREE.MeshPhongMaterial({ color: inf.color, emissive: emissive, emissiveIntensity: 0.35 });
      var p = new THREE.Mesh(new THREE.SphereGeometry(0.18,16,16), mat);
      p.userData = { isProton:true, payload:{ text: inf.text } };
      if (Z===1){ p.position.set(0,0,0); }
      else {
        var phi = Math.acos(1 - 2*(i+0.5)/Z);
        var theta = Math.PI * (1 + Math.sqrt(5)) * (i+0.5);
        var r = R * (0.85 + Math.random()*0.1);
        p.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(theta));
      }
      nucleus.add(p); protons.push(p);
    }
    var countsEl = document.getElementById('counts');
    if (countsEl) countsEl.textContent = 'Z=' + Z + ' · ABs capturados';
  }
  setNucleusFromInfos(infos);

  // ===== 5) 3 órbitas + 3 electrones (5/6/7 s por vuelta) =====
  var orbits = [];
  function createOrbit(radius, periodSec){
    var pivot = new THREE.Object3D();
    pivot.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(radius, Math.max(0.012*radius,0.035), 12, 180), ringMat.clone());
    pivot.add(ring);
    var rotator = new THREE.Object3D(); pivot.add(rotator);
    var holder = new THREE.Object3D(); holder.position.x = radius; rotator.add(holder);
    var electron = new THREE.Mesh(new THREE.SphereGeometry(0.14,24,24), electronMat.clone()); holder.add(electron);
    atom.add(pivot);
    var omega = (Math.PI*2)/periodSec; rotator.rotation.z = Math.random()*Math.PI*2;
    return { pivot:pivot, ring:ring, rotator:rotator, holder:holder, electron:electron, omega:omega, precessSpeed:(Math.random()*0.6-0.3)*0.10, wobblePhase:Math.random()*Math.PI*2 };
  }
  var BASE=6.4, GAP=1.6;
  orbits.push(createOrbit(BASE+0*GAP,5.0));
  orbits.push(createOrbit(BASE+1*GAP,6.0));
  orbits.push(createOrbit(BASE+2*GAP,7.0));

  // ===== 6) Interacción: protones (cursor + panel 400x400) =====
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var hoverProton = null;
  var panelEl = null, panelTarget = null, nucleusPaused = false;

  function ndc(e){ var r=renderer.domElement.getBoundingClientRect(); mouse.x=((e.clientX-r.left)/r.width)*2-1; mouse.y=-((e.clientY-r.top)/r.height)*2+1; }
  function hitProtons(){ raycaster.setFromCamera(mouse,camera); return raycaster.intersectObjects(protons,false); }
  renderer.domElement.addEventListener('mousemove', function(e){
    ndc(e);
    var hits = hitProtons();
    hoverProton = (hits && hits[0]) ? hits[0].object : null;
    renderer.domElement.style.cursor = hoverProton ? 'pointer' : 'default';
  }, {passive:true});

  function projectToScreen(obj){ var v=new THREE.Vector3(); obj.getWorldPosition(v); v.project(camera); return { x:(v.x*0.5+0.5)*innerWidth, y:(-v.y*0.5+0.5)*innerHeight }; }
  function clampPos(x,y){ var w=400,h=400; return {x:Math.max(0,Math.min(x,innerWidth-w)), y:Math.max(0,Math.min(y,innerHeight-h))}; }
  function showPanelFor(proton){
    var pos=projectToScreen(proton), c=clampPos(pos.x,pos.y);
    if(panelEl){ panelEl.remove(); panelEl=null; }
    panelEl=document.createElement('div');
    panelEl.style.cssText='position:fixed;width:400px;height:400px;background:rgba(0,0,0,.35);border:1px solid #263247;border-radius:12px;backdrop-filter:blur(2px);z-index:20;box-shadow:0 10px 30px rgba(0,0,0,.35);overflow:auto;left:'+c.x+'px;top:'+c.y+'px;';
    panelEl.innerHTML='<header style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:8px 10px;background:rgba(15,23,42,.4)">AB seleccionado <span class="close" style="cursor:pointer;padding:2px 8px;border:1px solid #334155;border-radius:8px">×</span></header><div id="panelContent" style="padding:10px;font-size:12px;color:#cbd5e1;white-space:pre-wrap"></div>';
    document.body.appendChild(panelEl);
    var payload = proton.userData && proton.userData.payload ? proton.userData.payload : null;
    var cont = document.getElementById('panelContent');
    cont.textContent = (payload && payload.text ? payload.text : '').trim() || '(Sin contenido)';
    panelEl.querySelector('.close').addEventListener('click', function(){ panelEl.remove(); panelEl=null; panelTarget=null; nucleusPaused=false; });
    panelTarget = proton; nucleusPaused = true;
  }

  renderer.domElement.addEventListener('mousedown', function(e){
    if(e.button!==0) return;
    ndc(e);
    var hits = hitProtons();
    if(hits.length){ showPanelFor(hits[0].object); return; }
    draggingAtom=true; lastX=e.clientX; lastY=e.clientY; atomVelX=0; atomVelY=0;
  });

  // ===== 7) Rotación/zoom/reset =====
  var draggingAtom=false, lastX=0,lastY=0; var atomVelX=0, atomVelY=0; var FRICTION=0.965;
  window.addEventListener('mouseup', function(){ draggingAtom=false; });
  window.addEventListener('mousemove', function(e){ if(!draggingAtom) return; var dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY; var k=0.005; atom.rotation.y+=dx*k; atom.rotation.x+=dy*k; atomVelY=dx*k*60; atomVelX=dy*k*60; }, {passive:true});
  var camDist=camera.position.length();
  renderer.domElement.addEventListener('wheel', function(e){ e.preventDefault(); camDist*=(1+Math.sign(e.deltaY)*0.08); camDist=Math.max(5,Math.min(70,camDist)); var dirV=camera.position.clone().normalize(); camera.position.copy(dirV.multiplyScalar(camDist)); camera.lookAt(0,0,0); }, {passive:false});
  window.addEventListener('keydown', function(e){ if(e.key && e.key.toLowerCase()==='r'){ camera.position.set(0,7,20); camera.lookAt(0,0,0); camDist=20; atom.rotation.set(0,0,0); atomVelX=0; atomVelY=0; for(var i=0;i<orbits.length;i++){ orbits[i].pivot.rotation.set(0,0,0); orbits[i].rotator.rotation.set(0,0,0); } nucleusPaused=false; if(panelEl){ panelEl.remove(); panelEl=null; panelTarget=null; } } });

  // ===== 8) Loop =====
  var clock=new THREE.Clock();
  function animate(){
    var dt=clock.getDelta(); var t=performance.now()*0.001;
    if(!nucleusPaused){ nucleus.rotation.y+=dt*0.2; nucleus.rotation.x+=dt*0.1; }
    glow.intensity=0.5+0.15*Math.sin(t*1.1);
    if(!draggingAtom){ atom.rotation.x+=atomVelX*dt; atom.rotation.y+=atomVelY*dt; atomVelX*=FRICTION; atomVelY*=FRICTION; if(Math.abs(atomVelX)<1e-4) atomVelX=0; if(Math.abs(atomVelY)<1e-4) atomVelY=0; }
    for (var j=0; j<orbits.length; j++){ var o=orbits[j]; o.pivot.rotation.y+=o.precessSpeed*dt; var wob=0.05*Math.sin(t*0.6 + o.wobblePhase); o.pivot.rotation.x+=(wob - o.pivot.rotation.x)*0.02; o.pivot.rotation.z+=(wob*0.6 - o.pivot.rotation.z)*0.02; o.rotator.rotation.z+=o.omega*dt; }
    if(panelEl && panelTarget){ var p=projectToScreen(panelTarget), c=clampPos(p.x,p.y); panelEl.style.left=c.x+'px'; panelEl.style.top=c.y+'px'; }
    renderer.render(scene,camera); requestAnimationFrame(animate);
  }
  animate();

  // ===== 9) Back + resize =====
  var back = document.getElementById('backBtn'); if(back) back.addEventListener('click', function(){ history.back(); });
  window.addEventListener('resize', function(){ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
})();
