<script lang="ts">
	import { Mesh, Program, Renderer, Triangle, Vec2 } from 'ogl';
	import { onMount } from 'svelte';
	import { Slider, Pane, type PanePosition } from 'svelte-tweakpane-ui';

	let wrapper: HTMLDivElement | null;

	let screen: {
		w: number;
		h: number;
	} = $state({
		w: 0,
		h: 0
	});

	let SliceSize = $state(0.05);
	let Strength = $state(0.05);

	const options: PanePosition[] = ['inline', 'fixed', 'draggable'];
	let position: PanePosition = options[2];

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
        uniform float uSliceSize;
        uniform float uStrength;
        uniform vec2 uResolution;

        vec3 sdfCircle(vec2 uv, float r) {
            float d = length(uv) - r;
            return vec3(smoothstep(0.01, 0.015, d)) * - 1.0;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
            vec2 fv = uv;
            fv.x = fract(uv.x / uSliceSize);
            uv.x += tan(uTime * 0.5 + fv.x * uStrength) / 5.0;

            vec3 col = vec3(0.0);
            float brightness = 0.85;

            col += sdfCircle(uv, 0.3) * brightness;
            col -= sdfCircle(uv, 0.18) * brightness;

            vec3 glass = vec3(abs(fv.x));
            col += glass * 0.1;

            gl_FragColor = vec4(col, 1.0);
           
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
				uSliceSize: { value: SliceSize },
				uStrength: { value: Strength },
				uResolution: { value: new Vec2(screen.w, screen.h) }
			}
		});

		function resize() {
			renderer.setSize(window.innerWidth, window.innerHeight);
			program.uniforms.uResolution.value = new Vec2(screen.w, screen.h);
		}
		window.addEventListener('resize', resize, false);
		resize();

		const mesh = new Mesh(gl, { geometry, program });

		requestAnimationFrame(update);
		function update(t) {
			requestAnimationFrame(update);

			program.uniforms.uTime.value = t * 0.001;

			renderer.render({ scene: mesh });
		}

		$effect(() => {
			program.uniforms.uSliceSize.value = SliceSize;
			program.uniforms.uStrength.value = Strength;
		});
	});
</script>

<svelte:window bind:innerWidth={screen.w} bind:innerHeight={screen.h} />

<Pane
	{position}
	y={position === 'inline' ? undefined : 50}
	x={position === 'inline' ? undefined : 50}
	title="Tweaks"
>
	<Slider
		label="Slice Size"
		max={0.5}
		min={0.01}
		format={(v) => v.toFixed(2)}
		bind:value={SliceSize}
		wide={true}
	/>
	<Slider
		label="Strength"
		max={0.5}
		min={0.01}
		format={(v) => v.toFixed(2)}
		bind:value={Strength}
		wide={true}
		step={0.01}
	/>
</Pane>

<div bind:this={wrapper}></div>
