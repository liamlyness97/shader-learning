<script lang="ts">
	import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
	import { onMount } from 'svelte';

	let wrapper: HTMLDivElement;

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

        varying vec2 vUv;

        void main () {
            gl_FragColor.rgb = 0.5 + 0.3 * cos(vUv.xyx + uTime) + uColour;
            gl_FragColor.a = 1.0;
        }
    `;

	onMount(() => {
		const renderer = new Renderer();
		const gl = renderer.gl;

		wrapper.appendChild(gl.canvas);

		gl.clearColor(1, 1, 1, 1);

		function resize() {
			renderer.setSize(window.innerWidth, window.innerHeight);
		}

		window.addEventListener('resize', resize, false);
		resize();

		const geometry = new Triangle(gl);

		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uColour: { value: new Color(0.3, 0.2, 0.5) }
			}
		});

		const mesh = new Mesh(gl, { geometry, program });

		requestAnimationFrame(update);
		function update(t) {
			requestAnimationFrame(update);

			program.uniforms.uTime.value = t * 0.001;

			renderer.render({ scene: mesh });
		}
	});
</script>

<div bind:this={wrapper} class="h-screen w-full"></div>
