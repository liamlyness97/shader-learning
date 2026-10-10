import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform, Vec2, Vec3,} from "ogl";

const vertex = /*glsl*/ `
    attribute vec3 position;
    attribute vec2 uv;

    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    uniform vec2 uCenter;
    uniform vec2 uPeriod;
    uniform vec2 uOffset;

    varying vec2 vUv;

    void main() {
        vUv = uv;

        vec2 center = uCenter + uOffset;
        vec2 wrapped = mod(center + uPeriod * 0.5, uPeriod) - uPeriod * 0.5;

        vec3 pos = vec3(wrapped + position.xy, position.z);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }

`

const fragment = /*glsl*/ `
    precision highp float;

    uniform sampler2D tMap;
    uniform float uImageAspect;
    uniform float uTileAspect;
    uniform vec3 uColour;

    varying vec2 vUv;

    void main() {
        vec2 scale;
        if (uTileAspect > uImageAspect) {
            scale = vec2(1.0, uImageAspect / uTileAspect);
        } else {
            scale = vec2(uTileAspect / uImageAspect, 1.0);
        }
        vec2 coverUv = vec2(((vUv - 0.5) * scale) + 0.5);
        gl_FragColor.rgb = vec3(uColour);
        gl_FragColor.rgb = texture2D(tMap, coverUv).rgb;
        gl_FragColor.a = 1.0;
    }
`

const files = import.meta.glob('$lib/assets/gallery/*.jpg', {
	eager: true,
	query: '?url',
	import: 'default'
});
const urls = Object.values(files) as string[];

export function createScene(node: HTMLElement) {
    const renderer = new Renderer({dpr: Math.min(window.devicePixelRatio, 2)});
    const gl = renderer.gl;
    node.appendChild(gl.canvas);
    gl.canvas.style.display = 'block';
    gl.canvas.style.touchAction = 'none';
    gl.canvas.style.cursor = 'grab';

    const camera = new Camera(gl, {fov: 45});
    camera.position.z = 5;
    camera.lookAt([0, 0, 0]);

    const scene = new Transform();

    // Where the geometry lives

    const pitchX = 424;
    const pitchY = 324;
    const tileW = 400;
    const tileH = 300;
    const cols = 7;
    const rows = 5;

    const offsetX = (cols - 1) / 2;
    const offsetY = (rows - 1) / 2;
    const periodX = cols * pitchX;
    const periodY = rows * pitchY;

    const geometry = new Plane(gl, {width: tileW, height: tileH});

    const tiles = [];

    const offset = { value: new Vec2(0, 0) }

    // Looping Rows
    for (let row = 0; row < rows; row++ ) {
        // Looping Cols
        for (let col = 0; col < cols; col++) {
            const x = (col - offsetX) * pitchX;
            const y = (offsetY - row) * pitchY;
            const t = (row * cols + col) / (rows * cols - 1);

            const imageIndex = (col + row * 3) % 14;

            const texture = new Texture(gl);
            const img = new Image();
            img.src = urls[imageIndex];
            img.onload = () => {
                texture.image = img;
                program.uniforms.uImageAspect.value = img.width / img.height;
            }
            
            const program = new Program(gl, {
                vertex,
                fragment,
                uniforms: {
                    uColour: { value: new Vec3(t, 0.4, 1.0 - t) },
                    uCenter: { value: new Vec2(x, y) },
                    uPeriod: { value: new Vec2(periodX, periodY) },
                    uTileAspect: { value: tileW / tileH},
                    uImageAspect: { value: 1.0 },
                    tMap: { value: texture },
                    uOffset: offset
                }
            });

            const mesh = new Mesh(gl, {geometry, program, frustumCulled: false})
            mesh.setParent(scene);

            tiles.push({ mesh, program, x, y });
        }
    }

    function resize() {
        const w = node.clientWidth;
        const h = node.clientHeight;
        renderer.setSize(w, h);
        
        camera.orthographic({
            left: -w / 2,
            right: w / 2,
            bottom: -h / 2,
            top: h / 2
        })
    }

    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();

    let frameId = 0;

    const canvas = gl.canvas as HTMLCanvasElement;

    let dragging = false;
    let activeId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let velocity = { x: 0, y: 0 };

    function onDown(e: PointerEvent) {
        dragging = true;
        activeId = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        gl.canvas.style.cursor = 'grabbing';

    }

   

    function onMove(e: PointerEvent) {
        if (activeId !== e.pointerId) return

        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        velocity.x = velocity.x * 0.5 + dx * 0.5;
        velocity.y = velocity.y * 0.5 - dy * 0.5;

        offset.value.x = offset.value.x + dx;
        offset.value.y = offset.value.y - dy;

        lastX = e.clientX;
        lastY = e.clientY;
    }

    function onUp() {
        activeId = null;
        dragging = false;
        gl.canvas.style.cursor = 'grab';
        lastX = 0;
        lastY = 0;

    }

     canvas.addEventListener('pointerdown', onDown);
     canvas.addEventListener('pointermove', onMove);
     canvas.addEventListener('pointerup', onUp);
    
    

    function update(t: number) {
        frameId = requestAnimationFrame(update);

        if (!dragging) {
            offset.value.x += velocity.x;
            offset.value.y += velocity.y;
        }

        velocity.x *= 0.95;
        velocity.y *= 0.95;

        renderer.render({ scene, camera })
    }
    frameId = requestAnimationFrame(update);

    function destroy() {
        cancelAnimationFrame(frameId);
        observer.disconnect();
        canvas.removeEventListener('pointerdown', onDown)
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerup', onUp)
        gl.canvas.remove();
        gl.getExtension('WEBGL_lose_context')?.loseContext();
    }


    
    return { destroy }

}