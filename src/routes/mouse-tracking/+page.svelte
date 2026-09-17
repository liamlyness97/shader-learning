<script lang="ts">
	import { Color, Mesh, Program, Renderer, Triangle, Vec2, RenderTarget } from 'ogl';
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
		uniform sampler2D uPrevious;

        varying vec2 vUv;

        void main () {
            float dist = length(vec2((vUv.x - uMouse.x) * uAspect, vUv.y - uMouse.y));
            float blob = smoothstep(0.1, 0.0, dist);
			vec3 trail = texture2D(uPrevious,vUv).rgb * 0.95;
            gl_FragColor.rgb = vec3(1.0, 0.4, 0.1) * blob + trail;
            gl_FragColor.a = 1.0;
        }
    `;

	const targetFragment = /* glsl */ `
		precision highp float;

		uniform sampler2D uTrail;

		varying vec2 vUv;

		void main() {
			gl_FragColor.rgb = texture2D(uTrail, vUv).rgb;
			gl_FragColor.a = 1.0;
		}
	`;

	onMount(() => {
		const renderer = new Renderer();
		const gl = renderer.gl;

		wrapper.appendChild(gl.canvas);

		gl.clearColor(1, 1, 1, 1);

		const geometry = new Triangle(gl);

		const bufferA = new RenderTarget(gl, { width: screen.w, height: screen.h });
		const bufferB = new RenderTarget(gl, { width: screen.w, height: screen.h });

		let reading = bufferB;
		let writing = bufferA;

		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uColour: { value: new Color(0.3, 0.2, 0.5) },
				uMouse: { value: new Vec2(mousePos.x, mousePos.y) },
				uAspect: { value: screen.w / screen.h },
				uPrevious: { value: bufferB }
			}
		});

		const targetProgram = new Program(gl, {
			vertex,
			fragment: targetFragment,
			uniforms: {
				uTrail: { value: writing.texture }
			}
		});

		function resize() {
			renderer.setSize(screen.w, screen.h);
			program.uniforms.uAspect.value = screen.w / screen.h;
		}

		window.addEventListener('resize', resize, false);
		resize();

		const mesh = new Mesh(gl, { geometry, program });
		const targetMesh = new Mesh(gl, { geometry, program: targetProgram });

		requestAnimationFrame(update);
		function update(t) {
			requestAnimationFrame(update);

			program.uniforms.uTime.value = t * 0.001;

			program.uniforms.uMouse.value.set(mousePos.x, mousePos.y);

			program.uniforms.uPrevious.value = reading.texture;

			targetProgram.uniforms.uTrail.value = writing.texture;

			renderer.render({ scene: mesh, target: writing });

			[reading, writing] = [writing, reading];

			renderer.render({ scene: targetMesh });
		}
	});
</script>

<svelte:window
	onmousemove={updatePosition}
	bind:innerWidth={screen.w}
	bind:innerHeight={screen.h}
/>

<div bind:this={wrapper} class="h-screen w-full"></div>
