import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import bgTexture from '$lib/assets/cityscape.jpg';

const vertex = /*glsl*/`
    attribute vec2 uv;
    attribute vec2 position;

    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`
const fragment = /*glsl*/`
    precision highp float;

    uniform sampler2D tMap;
    uniform float uImageAspect;
    uniform float uTime;

    varying vec2 vUv;

    void main() {
        float shift = sin(uTime) * 0.02;  
        vec2 rUv = vec2(vUv.x + shift, vUv.y);
        vec2 bUv = vec2(vUv.x - shift, vUv.y);
        gl_FragColor.r = texture2D(tMap, rUv).r;
        gl_FragColor.b = texture2D(tMap, bUv).b;
        gl_FragColor.g = texture2D(tMap, vUv).g;
        gl_FragColor.a = 1.0;
    }
`

export function createScene(node: HTMLElement) {
    const renderer = new Renderer({dpr: Math.min(window.devicePixelRatio, 2)});
    const gl = renderer.gl;
    node.appendChild(gl.canvas);
    gl.canvas.style.display = 'block';

    const geometry = new Triangle(gl);

    const texture = new Texture(gl);
    const img = new Image();
    img.src = bgTexture;
    img.onload = () => {
        texture.image = img;
        program.uniforms.uImageAspect.value = img.width / img.height;
    }

    const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
            uTime: {value: 0.0},
            tMap: { value: texture },
            uImageAspect: {value:  1.0},
            uAspect: {value: node.clientWidth / node.clientHeight}
        }
    })

    let supportLinearFiltering =
			gl.renderer.extensions[`OES_texture_${gl.renderer.isWebgl2 ? `` : `half_`}float_linear`];

    const mesh = new Mesh(gl, {geometry, program});

    function resize() {
        const w = node.clientWidth;
        const h = node.clientHeight;
        renderer.setSize(w, h);
        program.uniforms.uAspect.value.set(node.clientWidth / node.clientHeight);
    }

    const observer = new ResizeObserver(resize);

    observer.observe(node);

    let frameId = 0;

    function update(t: number) {
        frameId = requestAnimationFrame(update);

        program.uniforms.uTime.value = t * 0.001;

        renderer.render({scene: mesh})
    }
    frameId = requestAnimationFrame(update);

    function destroy() {
        cancelAnimationFrame(frameId);
        observer.disconnect()
        gl.canvas.remove();
        gl.getExtension('WEBGL_lose_context')?.loseContext()
    }

    return { destroy }
}