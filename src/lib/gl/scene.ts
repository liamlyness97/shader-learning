import { Camera, Mesh, Plane, Program, Renderer, Transform } from "ogl";

const vertex = /* glsl */`
    attribute vec3 position;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform float uTime;

    varying float vHeight;
    varying vec3 vNormal;

    void main() {
        float wave = sin(position.x * 2.0 + uTime);
        float slopeX = 0.2 * 2.0 * cos(position.x * 2.0 + uTime);

        vec3 pos = position;
        pos.z += wave * 0.2;

        vHeight = wave * 0.5 + 0.5;
        vNormal = normalize(vec3(-slopeX, 0.0, 1.0));

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragment = /* glsl */`
    precision highp float;

    varying float vHeight;
    varying vec3 vNormal;

    void main() {
        vec3 dark = vec3(0.05, 0.2, 0.5);
        vec3 light = vec3(0.5, 0.85, 1.0);

        vec3 lightDir = normalize(vec3(0.5, 0.5, 0.5));
        float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);

        gl_FragColor = vec4(mix(dark, light, vHeight) * diffuse, 1.0);
    }
`;

export function createScene(node: HTMLElement) {
    const renderer = new Renderer({dpr: Math.min(window.devicePixelRatio, 2)});
    const gl = renderer.gl;
    node.appendChild(gl.canvas);
    gl.canvas.style.display = 'block';

    const camera = new Camera(gl, {fov: 45});
    camera.position.z = 5;
    camera.lookAt([0, 0, 0]);

    const scene = new Transform();

    const geometry = new Plane(gl, {widthSegments: 64, heightSegments: 64, width: 8, height: 8});

    const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
            uTime: { value: 0 }
        }
    })

    const mesh = new Mesh(gl, {geometry, program});
    mesh.rotation.x = -1;
    mesh.setParent(scene);

    function resize() {
        const w = node.clientWidth;
        const h = node.clientHeight;
        renderer.setSize(w, h);
        camera.perspective({ aspect: w / h });
    }

    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();

    let frameId = 0;

    function update(t: number) {
        frameId = requestAnimationFrame(update);

        program.uniforms.uTime.value = t * 0.001;


        renderer.render({ scene, camera });
    }
    frameId = requestAnimationFrame(update);

    function destroy() {
        cancelAnimationFrame(frameId);
        observer.disconnect();
        gl.canvas.remove();
        gl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    return { destroy }
}