// Standalone page preferences. No analytics or external runtime services.
const themeButton=document.getElementById('theme-toggle');
let themeChoice='dark';try{themeChoice=localStorage.getItem('orbit24-theme')||'dark'}catch(_){}
function applyTheme(value){const dark=value!=='light';document.documentElement.dataset.theme=dark?'dark':'light';themeButton.textContent=dark?'浅色模式':'深色模式';themeButton.setAttribute('aria-pressed',String(!dark));document.querySelector('meta[name="theme-color"]').content=dark?'#181b1d':'#f4f3ee';try{localStorage.setItem('orbit24-theme',dark?'dark':'light')}catch(_){}}
applyTheme(themeChoice);themeButton.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
const soundCheckbox=document.querySelector('[data-control="sound"]');try{soundCheckbox.checked=localStorage.getItem('orbit24-sound')!=='off'}catch(_){}
soundCheckbox.addEventListener('change',()=>{try{localStorage.setItem('orbit24-sound',soundCheckbox.checked?'on':'off')}catch(_){}});
document.getElementById('retry-load').addEventListener('click',()=>location.reload());

(async function(){
  const root=document.getElementById('orbit-click-play');
  const stage=root.querySelector('.orbit-stage'),canvas=root.querySelector('canvas');
  const status=root.querySelector('[data-status]'),loading=root.querySelector('.orbit-loading');
  const overlay=loading.closest('.load-state');
  try{
    if('IntersectionObserver' in window)await new Promise(resolve=>{const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();resolve()}},{rootMargin:'100px'});observer.observe(stage)});
    const library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./assets/three-0.160.1.min.js';script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=()=>{clearTimeout(timer);reject(new Error('加载遇到了问题，请重试。'))};const timer=setTimeout(()=>reject(new Error('加载有点慢，请检查网络后重试。')),25000);document.head.append(script)});
    const data=fetch('./assets/model-data.json',{signal:AbortSignal.timeout(25000)}).then(r=>{if(!r.ok)throw new Error('模型暂时没有加载成功，请重试。');return r.json()});
    const [,model]=await Promise.all([library,data]);
    if(!window.THREE)throw new Error('三维组件未加载，请重试。');
    if(!model.parts?.length)throw new Error('模型还没准备好，请重新加载。');
    const T=window.THREE;
    const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.5:2));
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    const scene=new T.Scene(), camera=new T.OrthographicCamera(-50,50,45,-45,.1,1000);
    camera.up.set(0,0,1);
    const assembly=new T.Group();scene.add(assembly);
    const groups={};
    ['fixed','carrier','ring','sun','lid','planet0','planet1','planet2','pawl','selector'].forEach(key=>{groups[key]=new T.Group();assembly.add(groups[key])});
    function unpack(s,C){const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new C(a.buffer)}
    const geometry={};
    Object.entries(model.meshes).forEach(([key,m])=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(unpack(m.v,Float32Array),3));g.setIndex(new T.BufferAttribute(unpack(m.i,Uint16Array),1));g.computeVertexNormals();geometry[key]=g});
    const material={};
    ['graphite','silver','orange','brass','dark','glass','white'].forEach(key=>material[key]=new T.MeshStandardMaterial({roughness:key==='dark'?.58:.30,metalness:key==='dark'?.10:.68,flatShading:true}));
    Object.values(material).forEach(m=>m.envMapIntensity=.38);
    material.glass.transparent=true;material.glass.opacity=.065;material.glass.depthWrite=false;material.glass.metalness=.05;material.glass.side=T.DoubleSide;
    const meshes=[];
    model.parts.forEach(p=>{const mesh=new T.Mesh(geometry[p.mesh],material[p.mat]);mesh.name=p.name;mesh.position.fromArray(p.p);mesh.rotation.fromArray(p.r);mesh.userData.group=p.group;mesh.castShadow=p.mat!=='glass';mesh.receiveShadow=true;groups[p.group].add(mesh);meshes.push(mesh)});
    // A procedural studio environment supplies soft metal reflections, without images.
    const environment=new T.Scene();environment.background=new T.Color(.52,.55,.6);
    const panels=[];
    for(const [p,s,intensity] of [[[0,100,70],[160,1,90],3],[[-100,-30,65],[1,120,110],5],[[75,15,85],[1,100,90],2]]){
      const q=new T.Mesh(new T.BoxGeometry(...s),new T.MeshBasicMaterial({color:new T.Color(intensity,intensity,intensity)}));q.position.fromArray(p);environment.add(q);panels.push(q)
    }
    const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(environment,.04);scene.environment=env.texture;pmrem.dispose();
    scene.add(new T.HemisphereLight(0xffffff,0x888888,.8));
    const key=new T.DirectionalLight(0xffffff,1.6);key.position.set(-45,-65,130);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-60;key.shadow.camera.right=60;key.shadow.camera.top=90;key.shadow.camera.bottom=-60;key.shadow.camera.near=.1;key.shadow.camera.far=400;key.shadow.bias=-.0002;scene.add(key);
    const fill=new T.DirectionalLight(0xffffff,.8);fill.position.set(50,45,65);scene.add(fill);
    const floor=new T.Mesh(new T.PlaneGeometry(300,300),new T.ShadowMaterial({opacity:.13}));floor.position.z=-.2;floor.receiveShadow=true;scene.add(floor);
    const probe=document.createElement('span');probe.hidden=true;root.append(probe);
    function token(name){probe.style.color='var('+name+')';return getComputedStyle(probe).color}
    function theme(){
      const fg=new T.Color(token('--foreground')),bg=new T.Color(token('--background')),orange=new T.Color(token('--orange'));
      const isLight=fg.r+fg.g+fg.b<bg.r+bg.g+bg.b,dark=isLight?fg:bg,light=isLight?bg:fg;
      material.graphite.color.copy(dark).lerp(light,.045);
      material.dark.color.copy(dark).multiplyScalar(.30);
      material.silver.color.copy(dark).lerp(light,.42);
      material.orange.color.copy(orange);material.brass.color.copy(orange).lerp(new T.Color(token('--yellow')),.6);
      material.glass.color.copy(new T.Color(token('--blue'))).lerp(light,.55);material.white.color.copy(light);
      floor.material.color.copy(fg);wake();
    }
    const STEP=Math.PI/12,TAU=Math.PI*2;
    let theta=0,velocity=0,target=null,free=false,explode=0,explodeTarget=0,top=false,dirty=true,raf=0;
    let yaw=-Math.PI/2+.28,pitch=.96,down=null,lastTick=0,lastTime=performance.now(),soundTime=-Infinity;
    let ctx=null,clickBuffer=null;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function unlockAudio(){if(!root.querySelector('[data-control="sound"]').checked)return;try{ctx??=new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume()}catch(_){}}
    function getClickBuffer(){
      if(clickBuffer)return clickBuffer;
      const duration=.026,rate=ctx.sampleRate;
      clickBuffer=ctx.createBuffer(1,Math.ceil(rate*duration),rate);
      const samples=clickBuffer.getChannelData(0);
      const cutoff=1-Math.exp(-2*Math.PI*6000/rate);
      let seed=24,previous=0,noiseA=0,noiseB=0;
      for(let i=0;i<samples.length;i++){
        const t=i/rate;
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        const noise=seed/2147483648-1,high=(noise-.8*previous)*.55;previous=noise;
        noiseA+=cutoff*(high-noiseA);noiseB+=cutoff*(noiseA-noiseB);
        // A sharp contact transient and brief metal resonances, without a pitch sweep.
        const attack=1-Math.exp(-t/.00008),tail=Math.min(1,(duration-t)/.002);
        const contact=.62*noiseB*Math.exp(-t/.0013);
        const metal=.26*Math.sin(2*Math.PI*4100*t)*Math.exp(-t/.0042)
          +.14*Math.sin(2*Math.PI*6700*t)*Math.exp(-t/.006)
          +.12*Math.sin(2*Math.PI*2250*t)*Math.exp(-t/.0023);
        samples[i]=.30*attack*tail*(contact+metal);
      }
      return clickBuffer;
    }
    function clickSound(){
      if(!ctx||free||!root.querySelector('[data-control="sound"]').checked)return;
      const t=ctx.currentTime;if(t-soundTime<.032)return;soundTime=t;
      const source=ctx.createBufferSource();source.buffer=getClickBuffer();source.connect(ctx.destination);
      source.onended=()=>source.disconnect();source.start(t);
    }
    function stateText(){status.textContent=(free?'自由旋转 · 可双向拨动':'棘轮 · 逆时针 · 24 格 / 圈')+(explodeTarget?' · 装配展开':'');root.dataset.mode=free?'free':'ratchet';root.dataset.exploded=String(explodeTarget)}
    function toggleMode(){free=!free;velocity=0;target=null;const b=root.querySelector('[data-action="mode"]');b.setAttribute('aria-pressed',String(free));b.textContent=free?'切回棘轮':'解锁旋转';stateText();dirty=true}
    root.querySelector('[data-action="step"]').addEventListener('click',()=>{unlockAudio();velocity=0;target=(Math.floor(Math.max(theta,target??theta)/STEP+1e-5)+1)*STEP;if(reduced){theta=target;target=null;clickSound()}dirty=true});
    root.querySelector('[data-action="flick"]').addEventListener('click',()=>{unlockAudio();target=null;velocity=free?11:8;dirty=true});
    root.querySelector('[data-action="mode"]').addEventListener('click',()=>{unlockAudio();toggleMode()});
    root.querySelector('[data-action="explode"]').addEventListener('click',e=>{explodeTarget=1-explodeTarget;e.currentTarget.setAttribute('aria-pressed',String(!!explodeTarget));e.currentTarget.textContent=explodeTarget?'合上零件':'展开零件';if(reduced)explode=explodeTarget;stateText();dirty=true});
    root.querySelector('[data-action="view"]').addEventListener('click',e=>{top=!top;e.currentTarget.setAttribute('aria-pressed',String(top));e.currentTarget.textContent=top?'斜视':'俯视';dirty=true});
    root.querySelector('[data-control="sound"]').addEventListener('change',unlockAudio);
    const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,0,1),-9),hit=new T.Vector3();
    function pointer(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);ray.ray.intersectPlane(plane,hit);return Math.atan2(hit.y,hit.x)}
    stage.addEventListener('pointerdown',e=>{
      if(down||e.button>0)return;
      unlockAudio();const a=pointer(e),hits=ray.intersectObjects(meshes,false),group=hits[0]?.object.userData.group;
      if(group==='selector'){toggleMode();return}
      const spin=!!group&&!['fixed','sun','pawl'].includes(group);
      down={id:e.pointerId,spin,a,x:e.clientX,y:e.clientY,time:performance.now(),moved:false};velocity=0;target=null;stage.setPointerCapture(e.pointerId);dirty=true
    });
    stage.addEventListener('pointermove',e=>{
      if(!down||e.pointerId!==down.id)return;const t=performance.now(),dt=Math.max(.012,(t-down.time)/1000);
      if(down.spin){const a=pointer(e);let d=Math.atan2(Math.sin(a-down.a),Math.cos(a-down.a));if(!free)d=Math.max(0,d);theta+=d;velocity=Math.max(-14,Math.min(14,d/dt));down.a=a}
      else{yaw-=(e.clientX-down.x)*.008;pitch=Math.max(.38,Math.min(1.5,pitch+(e.clientY-down.y)*.006));top=false;const view=root.querySelector('[data-action="view"]');view.textContent='俯视';view.setAttribute('aria-pressed','false')}
      if(Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y)>1)down.moved=true;
      down.x=e.clientX;down.y=e.clientY;down.time=t;dirty=true
    });
    function release(){if(!down)return;if(down.spin&&!down.moved){target=(Math.floor(theta/STEP+1e-5)+1)*STEP;velocity=0}else if(!free){velocity=0;target=Math.ceil(theta/STEP-1e-5)*STEP}else if(performance.now()-down.time>100)velocity=0;down=null;dirty=true}
    stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
    let w=736,h=440;
    function resize(){w=stage.clientWidth;h=stage.clientHeight;renderer.setSize(w,h,false);wake()}
    const resizer=new ResizeObserver(resize);resizer.observe(stage);resize();
    function pose(){
      groups.ring.rotation.z=theta;groups.lid.rotation.z=theta;groups.carrier.rotation.z=theta*2/3;
      groups.carrier.position.z=10*explode;groups.ring.position.z=19*explode;groups.sun.position.z=26*explode;groups.lid.position.z=39*explode;
      for(let i=0;i<3;i++){const phi=theta*2/3+i*TAU/3,g=groups['planet'+i];g.position.set(14.4*Math.cos(phi),14.4*Math.sin(phi),26*explode);g.rotation.z=theta*2+Math.PI/12}
      groups.pawl.position.set(29.5,-7.5,0);groups.pawl.rotation.z=free?-.20:-.035*(.5+.5*Math.sin(theta*24));groups.selector.position.x=free?1.8:0;
      const p=top?Math.PI/2-.001:pitch,z=6+explode*20,dist=180;
      camera.position.set(Math.cos(yaw)*Math.cos(p)*dist,Math.sin(yaw)*Math.cos(p)*dist,z+Math.sin(p)*dist);camera.lookAt(0,0,z);
      const size=Math.max(40,36*h/w)+explode*14;camera.left=-size*w/h;camera.right=size*w/h;camera.top=size;camera.bottom=-size;camera.updateProjectionMatrix();
      root.dataset.angle=theta.toFixed(6);root.dataset.carrier=(theta*2/3).toFixed(6);root.dataset.planet=(theta*2).toFixed(6)
    }
    function animate(now){
      const dt=Math.min(.04,(now-lastTime)/1000);lastTime=now;
      if(!down&&Math.abs(velocity)>.01){theta+=velocity*dt;velocity*=Math.exp(-(free?1.65:4.2)*dt);dirty=true;if(!free&&velocity<.03){velocity=0;target=Math.ceil(theta/STEP)*STEP}}
      if(target!==null){const d=target-theta;if(Math.abs(d)<.0003){theta=target;target=null}else theta+=d*Math.min(1,dt*22);dirty=true}
      if(Math.abs(explode-explodeTarget)>.001){explode+=(explodeTarget-explode)*Math.min(1,dt*10);dirty=true}else if(explode!==explodeTarget){explode=explodeTarget;dirty=true}
      const tick=Math.floor(theta/STEP+.5);if(tick!==lastTick){clickSound();lastTick=tick}
      if(dirty){pose();renderer.render(scene,camera);dirty=false}
      if(Math.abs(velocity)>.01||target!==null||Math.abs(explode-explodeTarget)>.001||dirty)raf=requestAnimationFrame(animate);else raf=0;
    }
    function wake(){dirty=true;if(!raf&&!document.hidden){lastTime=performance.now();raf=requestAnimationFrame(animate)}}
    for(const event of ['click','change','pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,wake);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){velocity=0;target=null;down=null;if(raf)cancelAnimationFrame(raf);raf=0;if(ctx?.state==='running')ctx.suspend()}else wake()});
    window.addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;ctx?.suspend()});
    window.addEventListener('pageshow',wake);
    root.querySelector('[data-action="reset"]').addEventListener('click',()=>{
      theta=0;velocity=0;target=null;free=false;explode=0;explodeTarget=0;top=false;down=null;lastTick=0;yaw=-Math.PI/2+.28;pitch=.96;
      const mode=root.querySelector('[data-action="mode"]');mode.textContent='解锁旋转';mode.setAttribute('aria-pressed','false');
      const exp=root.querySelector('[data-action="explode"]');exp.textContent='展开零件';exp.setAttribute('aria-pressed','false');
      const view=root.querySelector('[data-action="view"]');view.textContent='俯视';view.setAttribute('aria-pressed','false');stateText();wake();
    });
    document.addEventListener('keydown',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest('button,input,textarea,select,summary,a,[contenteditable]'))return;
      const action={' ':'step',ArrowRight:'step',f:'mode',e:'explode',v:'view',r:'reset'}[event.key.length===1?event.key.toLowerCase():event.key];
      if(action){event.preventDefault();root.querySelector('[data-action="'+action+'"]').click()}
      if(event.key.toLowerCase()==='m'){event.preventDefault();root.querySelector('[data-control="sound"]').click()}
      if(event.key==='ArrowLeft'&&free){event.preventDefault();unlockAudio();velocity=0;target=(Math.ceil(theta/STEP-1e-5)-1)*STEP;wake()}
    });
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(raf)cancelAnimationFrame(raf);raf=0;loading.textContent='画面暂时中断了，重新加载就能继续玩。';stage.append(overlay);overlay.querySelector('.loading-ring').hidden=true;document.getElementById('retry-load').hidden=false;root.dataset.ready='false'});
    theme();new MutationObserver(theme).observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});matchMedia('(prefers-color-scheme: dark)').addEventListener('change',theme);
    stateText();overlay.remove();root.querySelectorAll('[data-action],[data-control]').forEach(el=>el.disabled=false);root.dataset.ready='true';wake();
  }catch(error){loading.textContent=error.name==='TimeoutError'?'加载有点慢，请检查网络后重试。':error.message.includes('WebGL')?'当前浏览器无法显示三维画面，请换 Chrome、Edge 或 Safari 试试。':error.message;loading.setAttribute('role','alert');overlay.querySelector('.loading-ring').hidden=true;document.getElementById('retry-load').hidden=false;root.dataset.error=error.message;console.error(error)}
})();
