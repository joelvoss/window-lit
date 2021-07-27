import * as React from 'react';

let props = ['bottom', 'height', 'left', 'right', 'top', 'width'];

let rectChanged = (a = {}, b = {}) => props.some(prop => a[prop] !== b[prop]);

let observedNodes = new Map();
let rafId;

let measureObservedNodes = () => {
	observedNodes.forEach(state => {
		if (state.hasRectChanged) {
			state.callbacks.forEach(cb => cb(state.rect));
			state.hasRectChanged = false;
		}
	});

	window.setTimeout(() => {
		observedNodes.forEach((state, node) => {
			let newRect = node.getBoundingClientRect();
			if (rectChanged(newRect, state.rect)) {
				state.hasRectChanged = true;
				state.rect = newRect;
			}
		});
	}, 0);

	rafId = window.requestAnimationFrame(measureObservedNodes);
};

const observeRect = (node, cb) => ({
	observe() {
		let wasEmpty = observedNodes.size === 0;
		if (observedNodes.has(node)) {
			observedNodes.get(node).callbacks.push(cb);
		} else {
			observedNodes.set(node, {
				rect: undefined,
				hasRectChanged: false,
				callbacks: [cb],
			});
		}
		if (wasEmpty) measureObservedNodes();
	},

	unobserve() {
		let state = observedNodes.get(node);
		if (state) {
			// Remove the callback
			const index = state.callbacks.indexOf(cb);
			if (index >= 0) state.callbacks.splice(index, 1);

			// Remove the node reference
			if (!state.callbacks.length) observedNodes.delete(node);

			// Stop the loop
			if (!observedNodes.size) cancelAnimationFrame(rafId);
		}
	},
});

////////////////////////////////////////////////////////////////////////////////

export function useRect(nodeRef, observe = true, onChange) {
	let initialRectSet = React.useRef(false);
	let [rect, setRect] = React.useState(null);
	let observerRef = React.useRef(null);
	useLayoutEffect(() => {
		const cleanup = () => {
			observerRef.current && observerRef.current.unobserve();
		};

		if (!nodeRef.current) {
			return cleanup;
		}

		if (!observerRef.current) {
			observerRef.current = observeRect(nodeRef.current, rect => {
				onChange && onChange(rect);
				setRect(rect);
			});
		}

		if (!initialRectSet.current) {
			initialRectSet.current = true;
			setRect(nodeRef.current.getBoundingClientRect());
		}

		observe && observerRef.current.observe();
		return cleanup;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodeRef.current, observe, onChange]);

	return rect;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useLayoutEffect represents either `React.useLayoutEffect` or
 * `React.useEffect` depending on the render target (SSR or CSR)
 */
export const useLayoutEffect =
	typeof window !== 'undefined' &&
	window.document &&
	window.document.createElement
		? React.useLayoutEffect
		: React.useEffect;

////////////////////////////////////////////////////////////////////////////////

/**
 * calculateRange calculates the range to render
 * @param {{
 *   overscan: number,
 *   itemSizes: { index: number, start: number, size: number, end: number }[],
 *   outerSize: number,
 *   scrollOffset: number
 * }} options
 * @param {{ start: number, end: number }} prevRange
 */
export function calculateRange(
	{ overscan, itemSizes, outerSize, scrollOffset },
	prevRange,
) {
	if (itemSizes == null) throw new Error(`itemSizes missing`);

	const total = itemSizes.length;

	let start = total - 1;
	while (start > 0 && itemSizes[start].end >= scrollOffset) {
		start -= 1;
	}

	let end = 0;
	while (end < total - 1 && itemSizes[end].start <= scrollOffset + outerSize) {
		end += 1;
	}

	// NOTE(joel): Overscan by one item in each direction so that tab/focus works.
	// If there isn't at least one extra item, tab loops back around.
	start = Math.max(start - overscan, 0);
	end = Math.min(end + overscan, total - 1);

	// NOTE(joel): We check if the range has changed. If not, return the previous
	// range because we are calling `calculateRange` from within a
	// `React.setState` callback and need a stable object reference, if possible.
	if (!prevRange || prevRange.start !== start || prevRange.end !== end) {
		return { start, end };
	}

	return prevRange;
}
