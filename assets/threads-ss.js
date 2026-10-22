const MAX_THREADS=24,MAX_COLORS=6,MAX_SURGES=3,SURGE_SECONDS=1.6,SURGE_STAGGER=.05,STROKE_SECONDS=1.25,TAU=Math.PI*2;
const VERTEX=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;
const FRAGMENT=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uPhase;
uniform float uClock;
uniform int uCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uPinch;
uniform float uNodes;
uniform vec2 uAngle;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uDepth;
uniform float uPulses;
uniform float uFade;
uniform float uGrain;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform vec3 uCore;
uniform vec3 uBackground;
uniform float uOpaque;
uniform float uLight;
uniform vec4 uIntro;
uniform float uFocus[${MAX_THREADS}];
uniform vec2 uFocusState;
uniform vec4 uSurges[${MAX_SURGES}];
out vec4 outColor;

const float PI = 3.14159265;
const float TAU = 6.28318530;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float easeInOut(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
}

vec3 palette(float t) {
  if (uColorCount <= 1) return uColors[0];
  float scaled = clamp(t, 0.0, 1.0) * float(uColorCount - 1);
  int index = int(min(floor(scaled), float(uColorCount - 2)));
  return mix(uColors[index], uColors[index + 1], scaled - float(index));
}

vec2 envelope(float x) {
  float dx = x - uPinch;
  if (uNodes <= 1.0) return vec2(uSpread * abs(dx), uSpread * sign(dx));
  float k = PI * uNodes;
  float c = cos(k * (dx + 0.5));
  return vec2(uSpread * 0.5 * abs(c), -uSpread * 0.5 * k * sin(k * (dx + 0.5)) * sign(c));
}

vec2 space(vec2 p, float aspect) {
  vec2 q = (p - 0.5) * vec2(aspect, 1.0);
  q = vec2(q.x * uAngle.x + q.y * uAngle.y, -q.x * uAngle.y + q.y * uAngle.x);
  return vec2(q.x / aspect + 0.5, q.y + 0.5);
}

float hubAt(float x) {
  if (uNodes <= 1.0) return uPinch;
  float spacing = 1.0 / uNodes;
  return uPinch - 0.5 + (floor((x - uPinch + 0.5) / spacing) + 0.5) * spacing;
}

vec3 thread(float x, float i, float n) {
  float lane = uNodes <= 1.0 ? x - uPinch : (x - uPinch + 0.5) * uNodes - 0.5;
  float side = uMirror > 0.5 ? (mod(floor(lane), 2.0) < 0.5 ? -1.0 : 1.0) : 1.0;
  vec2 env = envelope(x);
  float amp = 1.0 + i * uTaper;
  float shimmer = uShimmer > 0.5 ? sin(uClock * 1.7 + i * 1.3) * 0.35 : 0.0;
  float angle = x * uFrequency + (uPhase + i * TAU / max(n, 1.0)) * side + shimmer;
  float wave = sin(angle);
  float y = uPosition - env.x * amp * wave;
  float slope = -(env.y * amp * wave + env.x * amp * cos(angle) * uFrequency);
  return vec3(y, slope, angle);
}

void main() {
  vec2 p = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 s = space(p, aspect);
  float x = s.x;
  float y = s.y;
  float n = float(uCount);
  float pixel = 1.0 / uResolution.y;
  float hub = hubAt(x);
  float presence = uFocusState.x;
  float settle = uFocusState.y;

  vec3 color = vec3(0.0);
  float energy = 0.0;
  float ink = 0.0;
  vec3 inkColor = vec3(0.0);

  for (int idx = 0; idx < ${MAX_THREADS}; idx++) {
    if (idx >= uCount) break;
    float i = float(idx);
    float ci = n > 1.0 ? i / (n - 1.0) : 0.0;

    float head = 2.0;
    float bead = 0.0;
    float born = 1.0;
    if (uIntro.w > 0.5) {
      float progress = clamp((uIntro.x - i * uIntro.y) / uIntro.z, 0.0, 1.0);
      head = mix(-0.06, 1.06, easeInOut(progress));
      bead = sin(PI * progress);
      born = progress > 0.0 ? smoothstep(-0.05, 0.03, head) : 0.0;
    }
    if (born <= 0.0) continue;

    bool tip = x > head;
    vec3 lead = bead > 0.0 || tip ? thread(head, i, n) : vec3(0.0);
    vec3 t = tip ? lead : thread(x, i, n);

    float focus = uFocus[idx];
    float spot = tip ? head : x;
    float twist = uDepth * smoothstep(0.0, 0.07, abs(spot - hubAt(spot)));
    float depth = 0.5 + 0.5 * cos(t.z);
    float front = mix(1.0, 0.3 + 0.7 * depth, twist);
    float width = uThickness * mix(1.0, 0.55 + 0.7 * depth, twist) * (1.0 + 0.3 * focus * presence);

    float d;
    if (tip) {
      float back = head - 0.02;
      vec2 a = vec2(back * aspect, thread(back, i, n).x);
      vec2 b = vec2(head * aspect, lead.x);
      vec2 pa = vec2(x * aspect, y) - a;
      vec2 ba = b - a;
      d = length(pa - ba * clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0));
    } else {
      float bend = t.y * smoothstep(0.0, 0.04, abs(x - hub));
      d = abs(y - t.x) / sqrt(1.0 + bend * bend / (aspect * aspect));
    }
    float g = uGlow / pow(max(d / width, pixel * 0.35), uFalloff) * front * born;
    float onLine = exp(-d / (width * 0.012));

    if (bead > 0.0) {
      vec2 near = vec2((x - head) * aspect, y - lead.x);
      g *= 1.0 + bead * 1.6 * exp(-dot(near, near) / 0.0025);
    }

    float light = 0.0;
    for (int k = 0; k < ${MAX_SURGES}; k++) {
      vec4 surge = uSurges[k];
      if (surge.w <= 0.0) continue;
      float progress = clamp((surge.y - i * ${SURGE_STAGGER.toFixed(3)}) / ${SURGE_SECONDS.toFixed(2)}, 0.0, 1.0);
      if (progress <= 0.0 || progress >= 1.0) continue;
      float lead = mix(surge.x, surge.z > 0.0 ? 1.12 : -0.12, easeInOut(progress));
      float along = (x - lead) * surge.z * aspect;
      float trail = along < 0.0 ? exp(along / 0.24) : exp(-along * along / 0.0009);
      light += trail * sin(PI * progress);
    }
    g *= 1.0 + light * (0.12 + 2.8 * onLine);

    if (uPulses > 0.0) {
      float travel = abs(x - hub);
      float pulse = pow(0.5 + 0.5 * sin(travel * 16.0 + uClock * 2.2 + i * 1.9), 24.0);
      g *= 1.0 + uPulses * 5.0 * pulse * onLine;
    }

    float sheen = pow(0.5 + 0.5 * sin(abs(x - hub) * 11.0 + uClock * 1.4), 10.0);
    float lift = focus * presence;
    g *= (1.0 - settle * (1.0 - focus)) * (1.0 + lift * (0.9 + 1.4 * sheen * onLine));

    vec3 tint = mix(palette(ci), uCore, 0.3 * lift);
    color += g * tint;
    energy += g;
    float stroke = smoothstep(0.45, 1.3, g);
    inkColor += tint * stroke;
    ink += stroke;
  }

  float fade = 1.0;
  if (uFade > 0.0) {
    float edge = min(x, 1.0 - x);
    float f = clamp(edge / max(uFade * 0.5, 0.001), 0.0, 1.0);
    fade = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  }
  float core = smoothstep(0.5, 2.2, energy);
  color = mix(color, uCore * energy, core * 0.5);
  color *= uBrightness * fade;
  float alpha = clamp(energy * fade, 0.0, 1.0) * uOpacity;
  float grain = (hash(gl_FragCoord.xy + fract(uClock) * 97.0) - 0.5) * uGrain;

  if (uLight < 0.5) {
    vec3 rgb = max(color * alpha * (1.0 + grain * 2.0), 0.0);
    if (uOpaque > 0.5) {
      outColor = vec4(min(uBackground * (1.0 - alpha) + rgb, 1.0), 1.0);
    } else {
      outColor = vec4(rgb, alpha);
    }
  } else {
    ink *= fade;
    vec3 hue = ink > 0.0001 ? inkColor / ink : palette(0.5);
    float body = clamp(ink, 0.0, 1.0);
    float haze = clamp(1.0 - exp(-energy * fade * 0.3), 0.0, 1.0) * 0.12;
    float focal = smoothstep(2.0, 9.0, energy * fade) * 0.25;
    float cover = clamp((body * 0.9 + (haze + focal) * (1.0 - body)) * (1.0 + grain * 2.0), 0.0, 0.95) * uOpacity;
    vec3 stroke = hue;
    if (uOpaque > 0.5) {
      outColor = vec4(mix(uBackground, stroke, cover), 1.0);
    } else {
      outColor = vec4(stroke * cover, cover);
    }
  }
}`;
const hex=h=>{const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
// Settings (from the WebThreads "With your settings" preset)
const S={palette:[hex("#7c3aed"),hex("#ec4899")],core:hex("#eab308"),paper:null,lightMode:false,count:8,speed:.22,frequency:1,spread:.11,taper:1,position:.6,pinch:.5,nodes:1,angle:3*Math.PI/180,glow:.02,falloff:.6,thickness:.9,brightness:.6,opacity:1,depth:0,pulses:.09,mirror:true,shimmer:false,fade:0,grain:.025,intro:true,mouseInteraction:true,mouseStrength:.5,pulseOnClick:true,paused:false,dpr:2};
const mod=(v,b)=>(v%b+b)%b;
const staggerFor=c=>Math.min(.12,.9/Math.max(c-1,1));
const toThreadSpace=(pt,aspect,angle)=>{const qx=(pt[0]-.5)*aspect,qy=.5-pt[1],c=Math.cos(angle),s=Math.sin(angle);return[(qx*c+qy*s)/aspect+.5,-qx*s+qy*c+.5]};
const threadY=(s,x,index,phase,clock)=>{const lane=s.nodes<=1?x-s.pinch:(x-s.pinch+.5)*s.nodes-.5;const side=s.mirror?mod(Math.floor(lane),2)<.5?-1:1:1;const dx=x-s.pinch;const env=s.nodes<=1?s.spread*Math.abs(dx):s.spread*.5*Math.abs(Math.cos(Math.PI*s.nodes*(dx+.5)));const shimmer=s.shimmer?Math.sin(clock*1.7+index*1.3)*.35:0;const angle=x*s.frequency+(phase+index*TAU/Math.max(s.count,1))*side+shimmer;return s.position-env*(1+index*s.taper)*Math.sin(angle)};
const compile=(gl,type,src)=>{const sh=gl.createShader(type);if(!sh)return null;gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){gl.deleteShader(sh);return null}return sh};
const prefersReduced=()=>typeof window!=="undefined"&&(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??false);
export function mountThreads(container){
const canvas=document.createElement("canvas");canvas.className="ss-threads-canvas";container.appendChild(canvas);
const gl=canvas.getContext("webgl2",{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:"high-performance"});
if(!gl){canvas.remove();return()=>{}}
const vs=compile(gl,gl.VERTEX_SHADER,VERTEX),fs=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();
if(!vs||!fs||!program){canvas.remove();return()=>{}}
gl.attachShader(program,vs);gl.attachShader(program,fs);gl.bindAttribLocation(program,0,"aPosition");gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);canvas.remove();return()=>{}}
const names=["uResolution","uPhase","uClock","uCount","uFrequency","uSpread","uTaper","uPosition","uPinch","uNodes","uAngle","uGlow","uFalloff","uThickness","uBrightness","uOpacity","uMirror","uShimmer","uDepth","uPulses","uFade","uGrain","uColors","uColorCount","uCore","uBackground","uOpaque","uLight","uIntro","uFocus","uFocusState","uSurges"];
const u={};names.forEach(n=>{u[n]=gl.getUniformLocation(program,n)});
const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.useProgram(program);
const colorData=new Float32Array(MAX_COLORS*3),surgeData=new Float32Array(MAX_SURGES*4),focus=new Float32Array(MAX_THREADS);
const state={width:1,height:1,phase:0,clock:0,last:0,raf:0,visible:false,introAt:-1,pointer:[.5,.5],inside:false,presence:0,settle:0,target:-1,surges:[],quiet:0,seen:null};
const resize=()=>{const ratio=Math.min(window.devicePixelRatio||1,S.dpr);const w=Math.max(1,Math.round(container.clientWidth*ratio)),h=Math.max(1,Math.round(container.clientHeight*ratio));if(w===state.width&&h===state.height)return;state.quiet=0;state.width=w;state.height=h;canvas.width=w;canvas.height=h};
const introLength=s=>(s.count-1)*staggerFor(s.count)+STROKE_SECONDS;
const updateFocus=(s,dt,reduced)=>{const wanted=s.mouseInteraction&&state.inside;if(wanted){const aspect=state.width/Math.max(state.height,1);const[cx,cy]=toThreadSpace(state.pointer,aspect,s.angle);let best=-1,bd=Infinity;for(let i=0;i<s.count;i++){const d=Math.abs(threadY(s,cx,i,state.phase,reduced?0:state.clock)-cy);const reach=i===state.target?.11:.085;if(d<reach&&d<bd){best=i;bd=d}}state.target=best}else state.target=-1;
const ease=1-Math.exp(-dt/.22);let strongest=0;for(let i=0;i<MAX_THREADS;i++){const goal=i===state.target?1:0;focus[i]+=(goal-focus[i])*ease;strongest=Math.max(strongest,focus[i])}
state.presence+=((wanted?1:0)-state.presence)*(1-Math.exp(-dt/.3));const sg=s.mouseStrength*.65*strongest*state.presence;state.settle+=(sg-state.settle)*(1-Math.exp(-dt/.3));return strongest>.002||state.presence>.002||state.settle>.002};
const render=reduced=>{const s=S;const introClock=state.introAt<0?0:state.clock-state.introAt;const introRunning=s.intro&&!reduced&&introClock<introLength(s);
gl.viewport(0,0,state.width,state.height);gl.uniform2f(u.uResolution,state.width,state.height);gl.uniform1f(u.uPhase,state.phase);gl.uniform1f(u.uClock,reduced?0:state.clock);gl.uniform1i(u.uCount,s.count);gl.uniform1f(u.uFrequency,s.frequency);gl.uniform1f(u.uSpread,s.spread);gl.uniform1f(u.uTaper,s.taper);gl.uniform1f(u.uPosition,s.position);gl.uniform1f(u.uPinch,s.pinch);gl.uniform1f(u.uNodes,s.nodes);gl.uniform2f(u.uAngle,Math.cos(s.angle),Math.sin(s.angle));gl.uniform1f(u.uGlow,s.glow*Math.sqrt(6/Math.max(s.count,6)));gl.uniform1f(u.uFalloff,s.falloff);gl.uniform1f(u.uThickness,s.thickness);gl.uniform1f(u.uBrightness,s.brightness);gl.uniform1f(u.uOpacity,s.opacity);gl.uniform1f(u.uMirror,s.mirror?1:0);gl.uniform1f(u.uShimmer,s.shimmer&&!reduced?1:0);gl.uniform1f(u.uDepth,s.depth);gl.uniform1f(u.uPulses,s.pulses);gl.uniform1f(u.uFade,s.fade);gl.uniform1f(u.uGrain,s.grain);
colorData.fill(0);s.palette.slice(0,MAX_COLORS).forEach((rgb,i)=>colorData.set(rgb,i*3));gl.uniform3fv(u.uColors,colorData);gl.uniform1i(u.uColorCount,Math.min(s.palette.length,MAX_COLORS));gl.uniform3f(u.uCore,s.core[0],s.core[1],s.core[2]);gl.uniform3f(u.uBackground,0,0,0);gl.uniform1f(u.uOpaque,0);gl.uniform1f(u.uLight,s.lightMode?1:0);
gl.uniform4f(u.uIntro,introClock,staggerFor(s.count),STROKE_SECONDS,introRunning?1:0);gl.uniform1fv(u.uFocus,focus);gl.uniform2f(u.uFocusState,state.presence*(.4+.6*s.mouseStrength),state.settle);
surgeData.fill(0);state.surges.slice(-MAX_SURGES).forEach((sg,i)=>{surgeData.set([sg.x,state.clock-sg.at,sg.direction,1],i*4)});gl.uniform4fv(u.uSurges,surgeData);
gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3)};
const tick=now=>{state.raf=requestAnimationFrame(tick);if(!state.visible||document.hidden){state.last=now;return}
const s=S;const dt=state.last?Math.min((now-state.last)/1e3,.1):1/60;state.last=now;const reduced=prefersReduced();state.clock+=dt;if(state.introAt<0)state.introAt=state.clock;if(!s.paused&&!reduced)state.phase+=dt*s.speed;
const focusing=updateFocus(s,dt,reduced);state.surges=state.surges.filter(sg=>state.clock-sg.at<SURGE_SECONDS+(s.count-1)*SURGE_STAGGER);
const still=s.paused||reduced;const transient=state.surges.length>0||s.intro&&!reduced&&state.clock-state.introAt<introLength(s)||focusing;
if(state.seen!==s||transient||!still)state.quiet=0;else state.quiet+=1;state.seen=s;if(state.quiet>3)return;resize();render(reduced)};
const local=e=>{const r=container.getBoundingClientRect();return{x:(e.clientX-r.left)/Math.max(r.width,1),y:(e.clientY-r.top)/Math.max(r.height,1),inside:e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom}};
const onMove=e=>{const p=local(e);state.inside=p.inside;if(p.inside)state.pointer=[p.x,p.y]};
const onLeave=()=>{state.inside=false};
const onDown=e=>{if(!S.pulseOnClick||e.button!==0||prefersReduced())return;if(e.target instanceof Element&&e.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;const p=local(e);if(!p.inside)return;const aspect=state.width/Math.max(state.height,1);const[x]=toThreadSpace([p.x,p.y],aspect,S.angle);state.surges.push({x,direction:x<=S.pinch?1:-1,at:state.clock});if(state.surges.length>MAX_SURGES)state.surges.shift()};
const vis=new IntersectionObserver(en=>{state.visible=en.some(x=>x.isIntersecting)});vis.observe(container);
const sizes=new ResizeObserver(resize);sizes.observe(container);resize();
window.addEventListener("pointermove",onMove,{passive:true});window.addEventListener("pointerdown",onDown);document.documentElement.addEventListener("pointerleave",onLeave);
state.raf=requestAnimationFrame(tick);
return()=>{cancelAnimationFrame(state.raf);vis.disconnect();sizes.disconnect();window.removeEventListener("pointermove",onMove);window.removeEventListener("pointerdown",onDown);document.documentElement.removeEventListener("pointerleave",onLeave);gl.deleteProgram(program);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.getExtension("WEBGL_lose_context")?.loseContext();canvas.remove()}}
