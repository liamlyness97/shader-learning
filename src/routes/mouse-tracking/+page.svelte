<script lang="ts">
	import { Color, Mesh, Program, Renderer, Triangle, Vec2 } from 'ogl';
	import { onMount } from 'svelte';

	let wrapper: HTMLDivElement;

	let mousePos = $state({
		x: 0.5,
		y: 0.5
	});

	let screen = $state({
		w: 0,
		h: 0
	});

	function updatePosition(e: MouseEvent) {
		mousePos.x = e.clientX / screen.w;
		mousePos.y = 1 - e.clientY / screen.h;
	}

	$inspect(mousePos);

	const vertex = /* glsl */ `
        attribute vec2 uv;
        attribute vec2 position;

        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = vec4(position, 0, 1);
        }
    `;

	const fragment = /* glsl */ `
        precision highp float;

        uniform float uTime;
        uniform vec3 uColour;
        uniform vec2 uMouse;
        uniform float uAspect;

        varying vec2 vUv;

        void main () {
            float dist = length(vec2((vUv.x - uMouse.x) * uAspect, vUv.y - uMouse.y));
            float blob = smoothstep(0.1, 0.0, dist);
            gl_FragColor.rgb = vec3(1.0, 0.4, 0.1) * blob;
            gl_FragColor.a = 1.0;
        }
    `;

	onMount(() => {
		const renderer = new Renderer();
		const gl = renderer.gl;

		wrapper.appendChild(gl.canvas);

		gl.clearColor(1, 1, 1, 1);

		const geometry = new Triangle(gl);

		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uColour: { value: new Color(0.3, 0.2, 0.5) },
				uMouse: { value: new Vec2(mousePos.x, mousePos.y) },
				uAspect: { value: screen.w / screen.h }
			}
		});

		function resize() {
			renderer.setSize(screen.w, screen.h);
			program.uniforms.uAspect.value = screen.w / screen.h;
		}

		window.addEventListener('resize', resize, false);
		resize();

		const mesh = new Mesh(gl, { geometry, program });

		requestAnimationFrame(update);
		function update(t) {
			requestAnimationFrame(update);

			program.uniforms.uTime.value = t * 0.001;

			program.uniforms.uMouse.value.set(mousePos.x, mousePos.y);

			renderer.render({ scene: mesh });
		}
	});
</script>

<svelte:window
	onmousemove={updatePosition}
	bind:innerWidth={screen.w}
	bind:innerHeight={screen.h}
/>

<div bind:this={wrapper} class="h-screen w-full"></div>
