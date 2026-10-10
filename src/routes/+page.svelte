<script>
	import { resolve } from '$app/paths';
</script>

<div class="flex h-screen w-full items-center justify-center">
	<div class="flex w-1/3 flex-col gap-8">
		<h1 class="font text-4xl font-medium">Shader Experiments</h1>
		<div
			class="flex w-full flex-col gap-4 rounded-sm bg-neutral-100 p-4 font-medium text-indigo-800"
		>
			<div>
				<a href={resolve('/hello-world')}>Shader Hello world (Draw a coloured background)</a>
			</div>
			<div>
				<a href={resolve('/mouse-tracking')}>Mouse Tracking Blob</a>
			</div>
			<div>
				<a href={resolve('/mouse-tracking-2')}>Mouse Tracking Blob Pt2</a>
			</div>
			<div>
				<a href={resolve('/metaball')}>Metaball</a>
			</div>
			<div>
				<a href={resolve('/ribbed-glass')}>Ribbed Glass</a>
			</div>
			<div>
				<a href={resolve('/game-of-life')}>Conway's Game of Life</a>
			</div>
			<div>
				<a href={resolve('/first-vertex')}>First Vertex Shader</a>
			</div>
			<div>
				<a href={resolve('/rb-split')}>RB Slit (Chromatic Abrasion)</a>
			</div>
		</div>
	</div>
</div>
