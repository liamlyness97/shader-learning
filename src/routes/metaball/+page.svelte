<script lang="ts">
	import { Mesh, Program, Renderer, Triangle, Vec2 } from 'ogl';
	import { onMount } from 'svelte';

	let wrapper: HTMLDivElement;

	type Position = {
		x: number;
		y: number;
		time: number;
	};

	let mousePos: Position = $state({
		x: 0.5,
		y: 0.5,
		time: 0
	});

	let screen: {
		w: number;
		h: number;
	} = $state({
		w: 0,
		h: 0
	});

	function updatePosition(e: MouseEvent) {
		mousePos.x = e.clientX;
		mousePos.y = e.clientY;
	}

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
        uniform vec2 uMouse;
        uniform vec2 uResolution;

        void main() {
            vec3 metaballs[5];

            metaballs[0] = vec3(sin(uTime) * 0.1 + 0.4, cos(uTime) * 0.1 + 0.4, 0.2);

            metaballs[1] = vec3(0.8, 0.2, 0.05);
            metaballs[2] = vec3(1, 0.6, 0.03);
            metaballs[3] = vec3(0.4, 0.8, 0.02);

            metaballs[4] = vec3(uMouse.xy / uResolution.y, 0.1);

            vec2 ssnormal = gl_FragCoord.xy / uResolution.y;

            float frag = 0.0;
            float d = 0.0;

            for(int i = 0; i < 5; i++) {
                d += metaballs[i].z / distance(metaballs[i].xy, ssnormal);
                frag += smoothstep(0.97, 1.0, length(d));
            }
            
            frag = clamp(frag, 0.0, 1.0);
            frag = frag == 1.0 ? 1.0 : 0.0;

            gl_FragColor = vec4(frag, frag, frag, 1.0);

        }
    `;

	onMount(() => {
		const renderer = new Renderer();
		const gl = renderer.gl;

		wrapper?.appendChild(gl.canvas);

		gl.clearColor(1, 1, 1, 1);

		const geometry = new Triangle(gl);
		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uMouse: { value: new Vec2(mousePos.x, mousePos.y) },
				uResolution: { value: new Vec2(screen.w, screen.h) }
			}
		});

		function resize() {
			renderer.setSize(window.innerWidth, window.innerHeight);
			program.uniforms.uResolution.value = new Vec2(screen.w, screen.h);
		}
		resize();

		const mesh = new Mesh(gl, { geometry, program });

		requestAnimationFrame(update);
		function update(t) {
			requestAnimationFrame(update);

			program.uniforms.uMouse.value.set(mousePos.x, mousePos.y);

			program.uniforms.uTime.value = t * 0.001;

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
