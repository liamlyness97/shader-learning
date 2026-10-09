<script lang="ts">
	import { createScene } from '$lib/gl/rb-scene';

	function attachScene(node: HTMLElement) {
		const scene = createScene(node);
		return () => scene.destroy();
	}
</script>

<div {@attach attachScene} class="h-screen w-full"></div>
