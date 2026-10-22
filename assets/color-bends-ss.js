const MAX_COLORS=8;
const FRAG=`
precision highp float;
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

  for (int j = 0; j < 5; j++) {
    if (j >= uIterations - 1) break;
    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q += (rr - q) * 0.15;
  }

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  col *= uIntensity;

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}`;
const VERT=`
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }`;

const DEFAULTS={colors:["#ff5c7a","#8a5cff","#00ffd1"],rotation:90,speed:.2,scale:1,frequency:1,warpStrength:1,mouseInfluence:1,noise:.15,parallax:.5,iterations:1,intensity:1.5,bandWidth:6,transparent:true,autoRotate:0};
const toVec3=hex=>{const h=hex.replace('#','').trim();const v=h.length===3?[h[0]+h[0],h[1]+h[1],h[2]+h[2]].map(x=>parseInt(x,16)):[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];return v.map(x=>x/255)};

export function mountColorBends(container,opts={}){
const o={...DEFAULTS,...opts};
const canvas=document.createElement('canvas');
canvas.className='color-bends-canvas';canvas.setAttribute('aria-hidden','true');
container.appendChild(canvas);
const gl=canvas.getContext('webgl',{antialias:false,alpha:true,premultipliedAlpha:true,powerPreference:'high-performance'});
if(!gl){canvas.remove();return()=>{}}
const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null}return s};
const vs=sh(gl.VERTEX_SHADER,VERT),fs=sh(gl.FRAGMENT_SHADER,FRAG);
const prog=gl.createProgram();
if(!vs||!fs){canvas.remove();return()=>{}}
gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){console.warn(gl.getProgramInfoLog(prog));canvas.remove();return()=>{}}
gl.useProgram(prog);
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
const loc=gl.getAttribLocation(prog,'aPos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
const U=n=>gl.getUniformLocation(prog,n);
const u={canvas:U('uCanvas'),time:U('uTime'),speed:U('uSpeed'),rot:U('uRot'),count:U('uColorCount'),colors:U('uColors[0]'),transparent:U('uTransparent'),scale:U('uScale'),freq:U('uFrequency'),warp:U('uWarpStrength'),pointer:U('uPointer'),mouse:U('uMouseInfluence'),parallax:U('uParallax'),noise:U('uNoise'),iter:U('uIterations'),intensity:U('uIntensity'),band:U('uBandWidth')};
const cols=(o.colors||[]).filter(Boolean).slice(0,MAX_COLORS).map(toVec3);
const flat=new Float32Array(MAX_COLORS*3);cols.forEach((c,i)=>flat.set(c,i*3));
gl.uniform3fv(u.colors,flat);gl.uniform1i(u.count,cols.length);
gl.uniform1f(u.speed,o.speed);gl.uniform1i(u.transparent,o.transparent?1:0);gl.uniform1f(u.scale,o.scale);gl.uniform1f(u.freq,o.frequency);gl.uniform1f(u.warp,o.warpStrength);gl.uniform1f(u.mouse,o.mouseInfluence);gl.uniform1f(u.parallax,o.parallax);gl.uniform1f(u.noise,o.noise);gl.uniform1i(u.iter,o.iterations);gl.uniform1f(u.intensity,o.intensity);gl.uniform1f(u.band,o.bandWidth);
gl.clearColor(0,0,0,o.transparent?0:1);
const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
const tgt={x:0,y:0},cur={x:0,y:0};
let raf=0,visible=true,disposed=false,last=performance.now(),elapsed=0;
const resize=()=>{const r=Math.min(window.devicePixelRatio||1,2);const w=container.clientWidth||1,h=container.clientHeight||1;canvas.width=Math.max(1,Math.round(w*r));canvas.height=Math.max(1,Math.round(h*r));gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(u.canvas,w,h)};
const render=now=>{
 raf=0;if(disposed)return;
 const dt=Math.min((now-last)/1000,.1);last=now;
 if(visible&&!document.hidden){
  if(!reduce)elapsed+=dt;
  gl.uniform1f(u.time,elapsed);
  const rad=(((o.rotation%360)+o.autoRotate*elapsed)*Math.PI)/180;
  gl.uniform2f(u.rot,Math.cos(rad),Math.sin(rad));
  const amt=Math.min(1,dt*8);cur.x+=(tgt.x-cur.x)*amt;cur.y+=(tgt.y-cur.y)*amt;
  gl.uniform2f(u.pointer,cur.x,cur.y);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 raf=requestAnimationFrame(render);
};
const onMove=e=>{const r=container.getBoundingClientRect();tgt.x=((e.clientX-r.left)/(r.width||1))*2-1;tgt.y=-(((e.clientY-r.top)/(r.height||1))*2-1)};
const ro=new ResizeObserver(resize);ro.observe(container);
const io=new IntersectionObserver(en=>{visible=en.some(x=>x.isIntersecting)});io.observe(container);
window.addEventListener('pointermove',onMove,{passive:true});
resize();
raf=requestAnimationFrame(render);
return()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();window.removeEventListener('pointermove',onMove);gl.deleteProgram(prog);gl.deleteBuffer(buf);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.remove()}
}
