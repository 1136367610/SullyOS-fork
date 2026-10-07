import * as T from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

// ReShade-like finish on the already colour-managed framebuffer. One GPU copy
// and one 9-tap pass, no second geometry render or multi-resolution bloom chain.
export function createRoomFinishPass(renderer){
 let texture=null,width=0,height=0;const size=new T.Vector2();
 const material=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
  uniforms:{source:{value:null},pixel:{value:new T.Vector2()},glow:{value:.12},warmth:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 pixel;uniform float glow;uniform float warmth;
   vec3 bright(vec2 p){vec3 c=sRGBTransferEOTF(texture2D(source,p)).rgb;return c*smoothstep(.58,.94,max(c.r,max(c.g,c.b)));}
   void main(){vec3 c=sRGBTransferEOTF(texture2D(source,vUv)).rgb;vec3 halo=vec3(0.);
    for(int i=0;i<8;i++){float a=float(i)*.78539816;halo+=bright(vUv+vec2(cos(a),sin(a))*pixel*4.);}
    halo=halo/8.;float l=dot(c,vec3(.2126,.7152,.0722));
    c=mix(vec3(l),c,1.04);c=(c-.18)*1.025+.18;
    c+=halo*glow*(1.-clamp(c,0.,1.)) + vec3(.012,.005,0.)*warmth*smoothstep(.35,.85,l);
    gl_FragColor=vec4(max(c,0.),1.);
    #include <colorspace_fragment>
   }`});
 const quad=new FullScreenQuad(material);
 return {render(phase){
  renderer.getDrawingBufferSize(size);
  if(width!==size.x||height!==size.y){texture?.dispose();width=size.x;height=size.y;texture=new T.FramebufferTexture(width,height);texture.colorSpace=T.NoColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;material.uniforms.source.value=texture;}
  material.uniforms.pixel.value.set(1/width,1/height);material.uniforms.glow.value=phase==='sunset'?.22:phase==='morning'?.14:phase==='night'?.12:.07;material.uniforms.warmth.value=phase==='sunset'?1:phase==='night'?.45:0;
  renderer.copyFramebufferToTexture(texture);const clear=renderer.autoClear;renderer.autoClear=false;try{quad.render(renderer);}finally{renderer.autoClear=clear;}
 },dispose(){texture?.dispose();quad.dispose();material.dispose();}};
}
