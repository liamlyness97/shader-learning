<script lang="ts">
	import { Mesh, Program, Renderer, RenderTarget, Triangle, Vec2 } from 'ogl';
	import { onMount } from 'svelte';

	let wrapper: HTMLDivElement;

	let frame = $state(0);

	let screen: {
		w: number;
		h: number;
	} = $state({
		w: 0,
		h: 0
	});

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
        uniform vec2 uResolution;
        uniform sampler2D uPrevious;
        uniform float uFirstFrame;

        varying vec2 vUv;

        void main() {
            vec2 texel = 1.0 / uResolution;
            float neighbours = 0.0;
            float right = texture2D(uPrevious, vUv + vec2(texel.x, 0.0)).r;
            float left = texture2D(uPrevious, vUv - vec2(texel.x, 0.0)).r;
            float top = texture2D(uPrevious, vUv + vec2(0.0, texel.y)).r;
            float bottom = texture2D(uPrevious, vUv - vec2(0.0, texel.y)).r;
            float topRight = texture2D(uPrevious, vUv + vec2(texel.x, texel.y)).r;
            float bottomRight = texture2D(uPrevious, vUv + vec2(texel.x, -texel.y)).r;
            float topLeft = texture2D(uPrevious, vUv - vec2(texel.x, -texel.y)).r;
            float bottomLeft = texture2D(uPrevious, vUv - vec2(texel.x, texel.y)).r;
            neighbours += right;
            neighbours += left;
            neighbours += top;
            neighbours += bottom;
            neighbours += topRight;
            neighbours += bottomRight;
            neighbours += topLeft;
            neighbours += bottomLeft;

            float self = texture2D(uPrevious, vUv).r;
            float next;

            if (uFirstFrame == 1.0) {
                next = step(0.7, fract(sin(dot(vUv * uResolution, vec2(12.9898, 78.233))) * 43758.5453));
            } else {
                if (self == 1.0 && neighbours == 2.0 || self == 1.0 && neighbours == 3.0 || self == 0.0 && neighbours == 3.0) {
                    next = 1.0;
                } else {
                    next = 0.0; 
                } 
            }

            

            gl_FragColor = vec4(next, 0.0, 0.0, 1.0);
        }
    `;

	const targetFragment = /* glsl */ `
        precision highp float;

        uniform float uTime;
        uniform vec2 uResolution;
        uniform sampler2D uState;

        varying vec2 vUv;

        void main() {
            gl_FragColor = vec4(texture2D(uState, vUv).rgb, 1.0);
        }
    `;

	onMount(() => {
		const renderer = new Renderer();
		const gl = renderer.gl;

		wrapper?.appendChild(gl.canvas);

		gl.clearColor(1, 1, 1, 1);

		const cellSize = 8;
		const gridW = Math.floor(screen.w / cellSize);
		const gridH = Math.floor(screen.h / cellSize);

		const geometry = new Triangle(gl);

		const bufferA = new RenderTarget(gl, {
			width: gridW,
			height: gridH,
			minFilter: gl.NEAREST,
			magFilter: gl.NEAREST,
			wrapS: gl.REPEAT,
			wrapT: gl.REPEAT
		});

		const bufferB = new RenderTarget(gl, {
			width: gridW,
			height: gridH,
			minFilter: gl.NEAREST,
			magFilter: gl.NEAREST,
			wrapS: gl.REPEAT,
			wrapT: gl.REPEAT
		});

		let reading = bufferB;
		let writing = bufferA;

		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uResolution: { value: new Vec2(gridW, gridH) },
				uPrevious: { value: reading.texture },
				uFirstFrame: { value: 1.0 }
			}
		});

		const targetProgram = new Program(gl, {
			vertex,
			fragment: targetFragment,
			uniforms: {
				uState: { value: writing.texture }
			}
		});

		function resize() {
			renderer.setSize(screen.w, screen.h);
		}
		window.addEventListener('resize', resize, false);
		resize();

		const mesh = new Mesh(gl, { geometry, program });
		const targetMesh = new Mesh(gl, { geometry, program: targetProgram });

		requestAnimationFrame(update);
		function update(t) {
			requestAnimationFrame(update);

			program.uniforms.uTime.value = t * 0.001;

			program.uniforms.uPrevious.value = reading.texture;

			renderer.render({ scene: mesh, target: writing });

			program.uniforms.uFirstFrame.value = 0.0;

			[reading, writing] = [writing, reading];

			targetProgram.uniforms.uState.value = reading.texture;
			renderer.render({ scene: targetMesh });

			frame++;
		}
	});
</script>

<svelte:window bind:innerWidth={screen.w} bind:innerHeight={screen.h} />

<div bind:this={wrapper} class="h-screen w-full"></div>
