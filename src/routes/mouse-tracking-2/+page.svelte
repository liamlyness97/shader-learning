<script lang="ts">
	import { Color, Mesh, Program, Renderer, Triangle, Vec2, RenderTarget, Texture } from 'ogl';
	import { onMount } from 'svelte';
	import bgTexture from '$lib/assets/cityscape.jpg';

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

	let prevMousePos: Position = $state({
		x: 0.5,
		y: 0.5,
		time: 0
	});

	let mouseVelocity: { x: number; y: number } = $state({
		x: 0,
		y: 0
	});

	let screen: {
		w: number;
		h: number;
	} = $state({
		w: 0,
		h: 0
	});

	function updatePosition(e: MouseEvent) {
		prevMousePos.x = mousePos.x;
		prevMousePos.y = mousePos.y;
		prevMousePos.time = mousePos.time;
		mousePos.x = e.clientX / screen.w;
		mousePos.y = 1 - e.clientY / screen.h;
		mousePos.time = e.timeStamp;

		mouseVelocity = calculateVelocity(prevMousePos, mousePos);
	}

	function calculateVelocity(prevPos: Position, currentPos: Position) {
		const distanceX = currentPos.x - prevPos.x;
		const distanceY = currentPos.y - prevPos.y;
		const timeTaken = currentPos.time - prevPos.time;

		return {
			x: distanceX / timeTaken,
			y: distanceY / timeTaken
		};
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
        uniform vec3 uColour;
        uniform vec2 uMouse;
		uniform vec2 uMouseVelocity;
        uniform float uAspect;
		uniform sampler2D uPrevious;

        varying vec2 vUv;

        void main () {
			float velocityX = (clamp((uMouseVelocity.x * 60.0), -1.0, 1.0) + 1.0) / 2.0;
			float velocityY = (clamp((uMouseVelocity.y * 60.0), -1.0, 1.0) + 1.0) / 2.0;
			vec3 tempColour = vec3(velocityX, velocityY, 0.5);
            float dist = length(vec2((vUv.x - uMouse.x) * uAspect, vUv.y - uMouse.y));
            float blob = smoothstep(0.14, 0.0, dist);
			vec3 trail = texture2D(uPrevious,vUv).rgb * 0.95;
			vec3 fade = mix(texture2D(uPrevious,vUv).rgb, vec3(0.5), 0.03);
            // gl_FragColor.rgb = max(vec3(1.0, 0.4, 0.1) * blob, trail);
			gl_FragColor.rgb = mix(fade, tempColour, blob);
            gl_FragColor.a = 1.0;
        }
    `;

	const targetFragment = /* glsl */ `
		precision highp float;

		uniform sampler2D uTrail;
		uniform float uAspect;
		uniform float uImageAspect;
		uniform sampler2D tMap;

		varying vec2 vUv;

		void main() {
			vec2 velocity = texture2D(uTrail, vUv).rg * 2.0 - 1.0;
			vec2 distortion = velocity * 0.12;
			vec2 newUv = vUv - distortion;
			float stripeX = (clamp(sin((newUv.x * uAspect) * 40.0), -1.0, 1.0) + 1.0) / 2.0;
			float stripeY = (clamp(sin(newUv.y * 40.0), -1.0, 1.0) + 1.0) / 2.0;
			float grid = stripeX + stripeY;
			vec2 scale;
			if (uAspect > uImageAspect) {
				scale = vec2(1.0, uImageAspect / uAspect);
			} else {
				scale = vec2(uAspect / uImageAspect, 1.0);
			}
			vec2 coverUv = vec2(((newUv - 0.5) * scale) + 0.5);
			// gl_FragColor.rgb = texture2D(uTrail, vUv).rgb;
			// gl_FragColor.rgb = vec3(grid);
			gl_FragColor.rgb = texture2D(tMap, coverUv).rgb;
			gl_FragColor.a = 1.0;
		}
	`;

	onMount(() => {
		const renderer = new Renderer();
		const gl = renderer.gl;

		wrapper.appendChild(gl.canvas);

		gl.clearColor(1, 1, 1, 1);

		const geometry = new Triangle(gl);
		const texture = new Texture(gl);
		const img = new Image();
		img.src = bgTexture;
		img.onload = () => {
			texture.image = img;
			targetProgram.uniforms.uImageAspect.value = img.width / img.height;
		};

		let supportLinearFiltering =
			gl.renderer.extensions[`OES_texture_${gl.renderer.isWebgl2 ? `` : `half_`}float_linear`];

		const bufferA = new RenderTarget(gl, {
			width: screen.w,
			height: screen.h,
			type: gl.renderer.isWebgl2
				? gl.HALF_FLOAT
				: gl.renderer.extensions['OES_texture_half_float'].HALF_FLOAT_OES,
			internalFormat: gl.renderer.isWebgl2 ? gl.RGBA16F : gl.RGBA
		});
		const bufferB = new RenderTarget(gl, {
			width: screen.w,
			height: screen.h,
			type: gl.renderer.isWebgl2
				? gl.HALF_FLOAT
				: gl.renderer.extensions['OES_texture_half_float'].HALF_FLOAT_OES,
			internalFormat: gl.renderer.isWebgl2 ? gl.RGBA16F : gl.RGBA
		});

		let reading = bufferB;
		let writing = bufferA;

		const program = new Program(gl, {
			vertex,
			fragment,
			uniforms: {
				uTime: { value: 0 },
				uColour: { value: new Color(0.3, 0.2, 0.5) },
				uMouse: { value: new Vec2(mousePos.x, mousePos.y) },
				uMouseVelocity: { value: new Vec2(mouseVelocity.x, mouseVelocity.y) },
				uAspect: { value: screen.w / screen.h },
				uPrevious: { value: bufferB }
			}
		});

		const targetProgram = new Program(gl, {
			vertex,
			fragment: targetFragment,
			uniforms: {
				uTrail: { value: writing.texture },
				uAspect: { value: screen.w / screen.h },
				tMap: { value: texture },
				uImageAspect: { value: 1.0 }
			}
		});

		function resize() {
			renderer.setSize(screen.w, screen.h);
			program.uniforms.uAspect.value = screen.w / screen.h;
			targetProgram.uniforms.uAspect.value = screen.w / screen.h;
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
			program.uniforms.uMouseVelocity.value.set(mouseVelocity.x, mouseVelocity.y);

			mouseVelocity.x *= 0.9;
			mouseVelocity.y *= 0.9;

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
