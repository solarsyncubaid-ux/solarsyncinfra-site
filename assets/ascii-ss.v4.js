var pe=" =+xX0S8#@";var ve={horizon:0,pinch:1,rise:2,eclipse:3},xe={none:0,wave:1,burst:2},Ee=`#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,le=`
float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
`,Te=`#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uTime;
uniform int uShape;
uniform vec3 uRamp[8];
uniform int uCount;
uniform float uScale;
uniform float uSoftness;
uniform float uFlow;
uniform vec2 uSeed;
uniform vec4 uTrail[24];
uniform float uRadius;
uniform vec4 uClicks[4];
uniform int uClickEffect;
uniform float uIntro;
uniform float uFrame;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outAux;
${le}
vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec3 labToRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 horizon(vec2 p, float time, out float order) {
  float span = 0.5 * max(uAspect, 1.0);
  float x = p.x / span;
  float arch = -0.17 - 0.2 * x * x + 0.02 * sin(time * 0.6);
  float soft = mix(0.05, 0.22, uSoftness);
  float edge = p.y - arch;
  float rim = 0.38 * smoothstep(-soft, 0.42, edge);
  vec2 sun = vec2(0.08 * sin(time * 0.31) * span, 0.58);
  float spread = length((p - sun) / vec2(0.95 * span, 0.75));
  float sky = mix(0.55, 1.0, smoothstep(0.2, 0.95, spread));
  order = clamp(edge * 1.3, 0.0, 1.0);
  return vec3(rim, sky, smoothstep(0.18, 0.62, edge));
}

vec3 pinch(vec2 p, float time, out float order) {
  float span = 0.5 * max(uAspect, 0.75);
  float x = p.x / span;
  float sway = 0.02 * sin(x * 1.7 + time * 0.55);
  float breathe = 1.0 + 0.06 * sin(time * 0.8);
  float width = (0.13 + 0.22 * x * x) * breathe * mix(0.85, 1.2, uSoftness);
  float y = abs(p.y - sway) / width;
  float t = exp(-pow(y, 2.2)) * (0.42 + 0.58 * exp(-x * x * 1.8));
  order = clamp(abs(p.y - sway) * 2.4 + abs(x) * 0.3, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec3 rise(vec2 p, float time, out float order) {
  float wide = max(uAspect, 0.9);
  vec2 center = vec2(0.05 * sin(time * 0.45) * wide, -0.7);
  vec2 radius = vec2(0.82 * wide, 0.64 * (1.0 + 0.04 * sin(time * 0.8)));
  float d = length((p - center) / radius);
  float soft = mix(0.6, 1.15, uSoftness);
  float t = clamp(pow(clamp(1.0 - d, 0.0, 1.0), soft) * 1.35, 0.0, 1.0);
  order = clamp((d - 0.2) * 1.3, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec3 eclipse(vec2 p, float time, out float order) {
  float fit = min(1.0, uAspect * 1.25);
  float r = 0.23 * fit * (1.0 + 0.015 * sin(time * 0.9));
  float angle = atan(p.y, p.x);
  float rays = noise(vec2(cos(angle), sin(angle)) * 2.2 + time * 0.08) * 0.8 + 0.6;
  float d = length(p) - r;
  float reach = mix(0.07, 0.15, uSoftness) * rays * fit;
  float t = smoothstep(-0.006, 0.006 + 0.02 * uSoftness, d) * exp(-max(d, 0.0) / reach);
  order = clamp(d * 2.0, 0.0, 1.0);
  return vec3(t, t, 0.0);
}

vec4 tone(float t) {
  float x = smoothstep(0.3, 1.0, t) * float(uCount - 1);
  int index = int(floor(x));
  return vec4(mix(uRamp[index], uRamp[min(index + 1, uCount - 1)], fract(x)), smoothstep(0.0, 0.38, t));
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float time = uTime;
  vec2 q = p / uScale;
  vec2 warp = vec2(
    noise(q * 1.6 + uSeed + vec2(0.0, time * 0.3)),
    noise(q * 1.6 + uSeed.yx + vec2(4.3, -time * 0.24))
  ) - 0.5;
  q += warp * uFlow * (uShape == 3 ? 0.04 : 0.18);
  float order = 0.0;
  vec3 shape;
  if (uShape == 0) shape = horizon(q, time, order);
  else if (uShape == 1) shape = pinch(q, time, order);
  else if (uShape == 2) shape = rise(q, time, order);
  else shape = eclipse(q, time, order);

  float reveal = clamp((uIntro * 1.45 - order) / 0.45, 0.0, 1.0);
  reveal = reveal * reveal * (3.0 - 2.0 * reveal);

  float scramble = 0.0;
  for (int i = 0; i < 24; i++) {
    vec4 point = uTrail[i];
    if (point.z <= 0.0) continue;
    vec2 d = p - point.xy;
    scramble = max(scramble, point.z * exp(-dot(d, d) / (uRadius * uRadius)));
  }
  for (int i = 0; i < 4; i++) {
    vec4 c = uClicks[i];
    if (c.w <= 0.0) continue;
    float d = length(p - c.xy);
    if (uClickEffect == 1) {
      scramble = max(scramble, exp(-pow((d - c.z * 0.75) / 0.06, 2.0)) * c.w);
    } else if (uClickEffect == 2) {
      float size = 0.08 + 0.22 * (1.0 - exp(-c.z * 5.0));
      scramble = max(scramble, (1.0 - smoothstep(size * 0.6, size, d)) * c.w);
    }
  }
  vec2 t = clamp(shape.xy * mix(0.7, 1.0, reveal), 0.0, 1.0);
  vec4 mixed = mix(tone(t.x), tone(t.y), shape.z);
  vec3 color = encode(labToRgb(mixed.rgb));
  float alpha = mixed.a * reveal;
  float dither = (hash12(gl_FragCoord.xy + uFrame * 13.7) - 0.5) / 255.0;
  outColor = clamp(vec4(color * alpha + dither, alpha + dither), 0.0, 1.0);
  outAux = vec4(reveal, scramble, 0.0, 1.0);
}`,ue=`
uniform sampler2D uField;
uniform sampler2D uAux;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform vec2 uOffset;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform float uDensity;
uniform float uOpacity;
uniform float uFlicker;
uniform float uDepth;
uniform float uGlyphTime;
uniform float uSeedValue;
uniform float uLight;
${le}
float sampleGlyph(float index, vec2 local, vec2 coord, float soft) {
  float column = mod(index, uAtlasGrid.x);
  float row = floor(index / uAtlasGrid.x);
  vec2 atlasUv = vec2((column + local.x) / uAtlasGrid.x, (row + 1.0 - local.y) / uAtlasGrid.y);
  vec2 continuous = coord / uAtlasGrid;
  float scale = exp2(soft);
  return textureGrad(uAtlas, atlasUv, dFdx(continuous) * scale, dFdy(continuous) * scale).a;
}

vec4 glyphAt(vec2 px) {
  vec2 coord = (px - uOffset) / uCell;
  vec2 cell = floor(coord);
  vec2 local = coord - cell;
  vec2 uv = clamp(((cell + 0.5) * uCell + uOffset) / uResolution, vec2(0.0), vec2(1.0));
  vec4 field = texture(uField, uv);
  vec4 aux = texture(uAux, uv);
  vec3 visible = uLight > 0.5 ? field.rgb + (1.0 - field.a) : field.rgb;
  float luma = dot(visible, vec3(0.2126, 0.7152, 0.0722));
  float value = uLight > 0.5 ? clamp((1.0 - luma) * 1.5, 0.0, 1.0) : luma;
  float pick = hash12(cell + uSeedValue * 7.31);
  float level = hash12(cell * 1.73 + 4.1 + uSeedValue);
  float tick = floor(uGlyphTime * 9.0 + level * 9.0);
  float wobble = (hash12(cell * 2.31 + tick * 17.7) - 0.5) * uFlicker * 0.4 + (level - 0.5) * 0.1;
  float tone = clamp(pow(value, 0.75) + wobble, 0.0, 1.0);
  float index = floor(tone * (uCount - 1.0) + 0.5);
  float decode = max(aux.g, 1.0 - aux.r);
  if (decode > 0.02) {
    float frame = floor(uGlyphTime * 20.0);
    if (hash12(cell * 3.7 + frame * 5.3) < decode * 1.25) index = 1.0 + floor(hash12(cell + frame * 1.37) * (uCount - 1.0));
  }
  float present = step(pick, uDensity * mix(1.0, 0.3 + tone * 1.1, 0.55));
  float cutoff = smoothstep(0.03, 0.1, value);
  float focus = step(hash12(cell * 0.71 + 9.2 + uSeedValue), uDepth);
  float coverage = sampleGlyph(index, local, coord, focus * 1.2);
  float alpha = uOpacity * present * cutoff * coverage * mix(1.0, 0.35 + 0.65 * level, 0.55) * (1.0 - focus * 0.5);
  if (uLight < 0.5) {
    vec3 light = field.rgb * 0.55 + vec3(0.03) * field.a;
    return vec4(light * alpha, 0.6 * field.a * alpha);
  }
  vec3 ink = visible * 0.8;
  return vec4(ink * alpha, alpha);
}
`,Ae=`#version 300 es
precision highp float;
uniform float uDownscale;
in vec2 vUv;
out vec4 outColor;
${ue}
void main() {
  outColor = glyphAt(gl_FragCoord.xy * uDownscale);
}`,ye=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.2270270270;
  sum += texture(uSource, vUv + uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv - uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv + uStep * 3.2307692308) * 0.0702702703;
  sum += texture(uSource, vUv - uStep * 3.2307692308) * 0.0702702703;
  outColor = sum;
}`,Re=`#version 300 es
precision highp float;
uniform sampler2D uHalo;
uniform float uGlow;
uniform float uGradient;
uniform float uGrain;
uniform float uFrame;
in vec2 vUv;
out vec4 outColor;
${ue}
void main() {
  vec4 base = texture(uField, vUv) * uGradient;
  vec4 glyph = glyphAt(gl_FragCoord.xy);
  vec4 halo = texture(uHalo, vUv) * uGlow;
  vec4 color;
  if (uLight < 0.5) {
    color = base + glyph + halo;
  } else {
    color = glyph + base * (1.0 - glyph.a);
    color += halo * 0.6 * (1.0 - color.a);
  }
  float grain = (hash12(gl_FragCoord.xy + uFrame * vec2(17.0, 59.0)) + hash12(gl_FragCoord.xy * 1.31 + uFrame * 7.0) - 1.0) * uGrain;
  float body = clamp(color.a, 0.0, 1.0);
  color.rgb += grain * (0.25 + body) * 0.5;
  color.a = clamp(color.a, 0.0, 1.0);
  color.rgb = clamp(color.rgb, 0.0, color.a);
  outColor = color;
}`,_e=(t,f,i)=>Math.min(i,Math.max(f,t)),H=t=>t<=.04045?t/12.92:((t+.055)/1.055)**2.4,Le=([t,f,i])=>{let n=H(t),m=H(f),u=H(i),l=Math.cbrt(.4122214708*n+.5363325363*m+.0514459929*u),e=Math.cbrt(.2119034982*n+.6806995451*m+.1073969566*u),d=Math.cbrt(.0883024619*n+.2817188376*m+.6299787005*u);return[.2104542553*l+.793617785*e-.0040720468*d,1.9779984951*l-2.428592205*e+.4505937099*d,.0259040371*l+.7827717662*e-.808675766*d]},ce=(t,f,i)=>{let n=t.createShader(f);return n?(t.shaderSource(n,i),t.compileShader(n),t.getShaderParameter(n,t.COMPILE_STATUS)?n:(t.deleteShader(n),null)):null},G=(t,f)=>{let i=ce(t,t.VERTEX_SHADER,Ee),n=ce(t,t.FRAGMENT_SHADER,f),m=t.createProgram();if(!i||!n||!m)return null;if(t.attachShader(m,i),t.attachShader(m,n),t.linkProgram(m),t.deleteShader(i),t.deleteShader(n),!t.getProgramParameter(m,t.LINK_STATUS))return t.deleteProgram(m),null;let u={},l=t.getProgramParameter(m,t.ACTIVE_UNIFORMS);for(let e=0;e<l;e++){let d=t.getActiveUniform(m,e);if(!d)continue;let E=d.name.replace(/\[0\]$/,"");u[E]=t.getUniformLocation(m,E)}return{program:m,uniforms:u}},V=(t,f)=>({textures:Array.from({length:f},()=>{let n=t.createTexture();return t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),n}),framebuffer:t.createFramebuffer(),width:0,height:0}),W=(t,f,i,n)=>{f.width===i&&f.height===n||(f.width=i,f.height=n,t.bindFramebuffer(t.FRAMEBUFFER,f.framebuffer),f.textures.forEach((m,u)=>{t.bindTexture(t.TEXTURE_2D,m),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,i,n,0,t.RGBA,t.UNSIGNED_BYTE,null),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0+u,t.TEXTURE_2D,m,0)}),t.bindFramebuffer(t.FRAMEBUFFER,null))},se=(t,f,i)=>{let n=[...new Set([...f].filter(T=>T!==`
`&&T!=="\r"))];n.length||n.push(" ");let m=`300 ${Math.round(100*.78)}px ${i}`,u=Math.min(16,n.length),l=Math.ceil(n.length/u),e=document.createElement("canvas");e.width=60*u,e.height=100*l;let d=e.getContext("2d");d&&(d.font=m,d.textAlign="center",d.textBaseline="middle",d.fillStyle="#fff",n.forEach((T,S)=>{let I=S%u,L=Math.floor(S/u);d.fillText(T,I*60+60/2,L*100+100/2+3)}));let E=t.createTexture();return t.bindTexture(t.TEXTURE_2D,E),t.pixelStorei(t.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA8,t.RGBA,t.UNSIGNED_BYTE,e),t.generateMipmap(t.TEXTURE_2D),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR_MIPMAP_LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),{texture:E,count:n.length,grid:[u,l]}},x=(t,f,i)=>Math.min(i,Math.max(f,t));function Se(t,f={}){let i={colors:["#1e3fd8","#f6f8ff","#a5d8ff","#38bdf8"],shape:"horizon",characters:" =+xX0S8#@",cellSize:18,density:.32,glyphOpacity:.85,glow:.2,depthOfField:0,flicker:.2,softness:.5,scale:1,flow:.5,speed:1,gradientOpacity:.9,grain:.08,variation:0,mouseInteraction:!0,scrambleRadius:.1,clickEffect:"wave",intro:!0,lightMode:!1,dpr:1,fontFamily:'"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',...f},n=i.colors.slice(0,8),u={current:{colors:n.length>1?n:[n[0],n[0]],shape:ve[i.shape]??0,characters:i.characters||pe,cellSize:x(i.cellSize,6,64),density:x(i.density,0,1),glyphOpacity:x(i.glyphOpacity,0,1),glow:x(i.glow,0,2),depthOfField:x(i.depthOfField,0,1),flicker:x(i.flicker,0,1),softness:x(i.softness,0,1),scale:x(i.scale,.4,2.5),flow:x(i.flow,0,2),speed:Math.max(0,i.speed),gradientOpacity:x(i.gradientOpacity,0,1),grain:x(i.grain,0,.4),variation:Math.max(0,i.variation),mouseInteraction:i.mouseInteraction,scrambleRadius:x(i.scrambleRadius,.02,.4),clickEffect:xe[i.clickEffect]??1,intro:i.intro,lightMode:i.lightMode,fontFamily:i.fontFamily,dpr:i.dpr}},l=document.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.cssText="position:absolute;inset:0;display:block;width:100%;height:100%",t.appendChild(l);let e=l.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!t||!l||!e)return;let d=G(e,Te),E=G(e,Ae),T=G(e,ye),S=G(e,Re);if(!d||!E||!T||!S)return;let I=e.createVertexArray(),L=V(e,2),A=V(e,1),D=V(e,1),w=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),K=new Map,fe=a=>{let r=String(a),o=K.get(r);if(o)return o;let c=[0,0,0];if(w){w.clearRect(0,0,1,1),w.fillStyle="#000000",w.fillStyle=r,w.fillRect(0,0,1,1);let[s,_,b]=w.getImageData(0,0,1,1).data;c=[s/255,_/255,b/255]}return K.set(r,c),c},C=!1,y={width:1,height:1,ratio:1},$=new Float32Array(24),k=new Float32Array(16),R=[],N=new Float32Array(96),v=[],p={x:0,y:0,inside:!1},h=null,z="",Y="",j=0,J=0,F=u.current.intro&&!C?0:1,O=0,q=0,M=0,g=0,X=!0,P=!1,me=()=>{let a=u.current,r=`${a.fontFamily}|${a.characters}`;r===z&&h||(z=r,h&&e.deleteTexture(h.texture),h=se(e,a.characters,a.fontFamily),document.fonts?.load?.(`300 64px ${a.fontFamily}`,a.characters).then(()=>{P||z!==r||(h&&e.deleteTexture(h.texture),h=se(e,a.characters,a.fontFamily),B())},()=>{}))},de=()=>{let a=u.current,r=a.colors.join(",");r!==Y&&(Y=r,a.colors.forEach((o,c)=>$.set(Le(fe(o)),c*3)))},Q=(a,r,o)=>{if(!h)return;let c=u.current,s=a.uniforms,_=c.cellSize*y.ratio,b=_*(60/100);e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,L.textures[0]),e.uniform1i(s.uField,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,L.textures[1]),e.uniform1i(s.uAux,1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,h.texture),e.uniform1i(s.uAtlas,2),e.uniform2f(s.uResolution,r,o),e.uniform2f(s.uCell,b,_),e.uniform2f(s.uOffset,(r-Math.ceil(r/b)*b)/2,(o-Math.ceil(o/_)*_)/2),e.uniform2f(s.uAtlasGrid,h.grid[0],h.grid[1]),e.uniform1f(s.uCount,h.count),e.uniform1f(s.uDensity,c.density),e.uniform1f(s.uOpacity,c.glyphOpacity),e.uniform1f(s.uFlicker,C?0:c.flicker),e.uniform1f(s.uDepth,c.depthOfField),e.uniform1f(s.uGlyphTime,J),e.uniform1f(s.uSeedValue,c.variation),e.uniform1f(s.uLight,c.lightMode?1:0)},B=()=>{let a=u.current,r=y.width/y.height;me(),de(),e.bindVertexArray(I),e.disable(e.BLEND),e.bindFramebuffer(e.FRAMEBUFFER,L.framebuffer),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]),e.viewport(0,0,L.width,L.height),e.useProgram(d.program);let o=d.uniforms;e.uniform1f(o.uAspect,r),e.uniform1f(o.uTime,j),e.uniform1i(o.uShape,a.shape),e.uniform3fv(o.uRamp,$),e.uniform1i(o.uCount,a.colors.length),e.uniform1f(o.uScale,a.scale),e.uniform1f(o.uSoftness,a.softness),e.uniform1f(o.uFlow,a.flow),e.uniform2f(o.uSeed,a.variation*3.17,a.variation*1.91),e.uniform4fv(o.uTrail,N),e.uniform1f(o.uRadius,a.scrambleRadius),e.uniform4fv(o.uClicks,k),e.uniform1i(o.uClickEffect,a.clickEffect),e.uniform1f(o.uIntro,F),e.uniform1f(o.uFrame,O),e.drawArrays(e.TRIANGLES,0,3);let c=a.glow>.001;c&&(e.bindFramebuffer(e.FRAMEBUFFER,A.framebuffer),e.drawBuffers([e.COLOR_ATTACHMENT0]),e.viewport(0,0,A.width,A.height),e.useProgram(E.program),Q(E,l.width,l.height),e.uniform1f(E.uniforms.uDownscale,l.width/A.width),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(T.program),e.activeTexture(e.TEXTURE0),e.uniform1i(T.uniforms.uSource,0),e.bindFramebuffer(e.FRAMEBUFFER,D.framebuffer),e.bindTexture(e.TEXTURE_2D,A.textures[0]),e.uniform2f(T.uniforms.uStep,1/A.width,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,A.framebuffer),e.bindTexture(e.TEXTURE_2D,D.textures[0]),e.uniform2f(T.uniforms.uStep,0,1/A.height),e.drawArrays(e.TRIANGLES,0,3)),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,l.width,l.height),e.useProgram(S.program),Q(S,l.width,l.height);let s=S.uniforms;e.activeTexture(e.TEXTURE3),e.bindTexture(e.TEXTURE_2D,A.textures[0]),e.uniform1i(s.uHalo,3),e.uniform1f(s.uGlow,c?a.glow:0),e.uniform1f(s.uGradient,a.gradientOpacity),e.uniform1f(s.uGrain,a.grain),e.uniform1f(s.uFrame,O),e.drawArrays(e.TRIANGLES,0,3)},Z=()=>{let a=u.current;y.width=Math.max(1,t.clientWidth),y.height=Math.max(1,t.clientHeight),y.ratio=Math.min(a.dpr||window.devicePixelRatio||1,2),l.width=Math.max(1,Math.round(y.width*y.ratio)),l.height=Math.max(1,Math.round(y.height*y.ratio)),W(e,L,Math.max(1,Math.round(l.width/2)),Math.max(1,Math.round(l.height/2)));let r=Math.max(1,Math.round(l.width/4)),o=Math.max(1,Math.round(l.height/4));W(e,A,r,o),W(e,D,r,o),B(),U()},he=a=>{for(v.forEach(r=>{r.age+=a});v.length&&v[v.length-1].age>.7;)v.pop();for(let r=0;r<24;r++){let o=v[r];if(!o){N[r*4+2]=0;continue}let c=1-o.age/.7;N.set([o.x,o.y,c*c,0],r*4)}for(R.forEach(r=>{r.age+=a});R.length&&R[R.length-1].age>1.2;)R.pop();for(let r=0;r<4;r++){let o=R[r];if(!o){k[r*4+3]=0;continue}let c=o.age/1.2,s=Math.min(1,o.age/.08)*(1-c)*(1-c);k.set([o.x,o.y,o.age,s],r*4)}},ee=a=>{if(M=0,P||!X||document.hidden)return;if(g&&a-g<30){M=requestAnimationFrame(ee);return}let r=u.current,o=g?_e((a-g)/1e3,.001,.05):1/60;g=a,C||(j+=o*r.speed*.5,J+=o*Math.max(r.speed,.15)),F<1&&(F=Math.min(1,F+o/4.2)),q+=o,!C&&q>1/24&&(q=0,O=(O+1)%97),he(o),B(),!C||F<1||R.length>0||v.length>0?M=requestAnimationFrame(ee):g=0};function U(){!M&&!P&&X&&!document.hidden&&(M=requestAnimationFrame(ee))}let te=a=>{let r=t.getBoundingClientRect(),o=(a.clientX-r.left)/Math.max(1,r.width),c=1-(a.clientY-r.top)/Math.max(1,r.height),s=r.width/Math.max(1,r.height);p.inside=o>=0&&o<=1&&c>=0&&c<=1,p.x=(o-.5)*s,p.y=c-.5},oe=a=>{te(a);let r=u.current;if(!p.inside||!r.mouseInteraction||C)return;let o=v[0],c=o?Math.hypot(p.x-o.x,p.y-o.y):1/0;if(!(c<.015)){if(o&&o.age<.1){let s=Math.min(6,Math.floor(c/.03));for(let _=1;_<=s;_++){let b=_/(s+1);v.unshift({x:o.x+(p.x-o.x)*b,y:o.y+(p.y-o.y)*b,age:0})}}v.unshift({x:p.x,y:p.y,age:0}),v.length=Math.min(v.length,24),U()}},re=a=>{te(a);let r=u.current;!p.inside||!r.clickEffect||C||(R.unshift({x:p.x,y:p.y,age:0}),R.length>4&&R.pop(),U())},ae=()=>{g=0,U()},ie=new ResizeObserver(Z);ie.observe(t);let ne=new IntersectionObserver(a=>{X=a.some(r=>r.isIntersecting),X&&(g=0,U())});return ne.observe(t),window.addEventListener("pointermove",oe,{passive:!0}),window.addEventListener("pointerdown",re,{passive:!0}),document.addEventListener("visibilitychange",ae),Z(),()=>{P=!0,cancelAnimationFrame(M),ie.disconnect(),ne.disconnect(),window.removeEventListener("pointermove",oe),window.removeEventListener("pointerdown",re),document.removeEventListener("visibilitychange",ae),[L,A,D].forEach(a=>{a.textures.forEach(r=>e.deleteTexture(r)),e.deleteFramebuffer(a.framebuffer)}),h&&e.deleteTexture(h.texture),e.deleteVertexArray(I),[d,E,T,S].forEach(a=>e.deleteProgram(a.program)),e.getExtension("WEBGL_lose_context")?.loseContext(),l.remove()}}export{Se as mountAscii};
