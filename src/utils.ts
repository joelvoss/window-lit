import {
	type RefObject,
	useState,
	useRef,
	useLayoutEffect as _useLayoutEffect,
	useEffect,
} from 'react';
import type { InternalState, NodeState, ObserverCallback } from './types';

////////////////////////////////////////////////////////////////////////////////

let props: (keyof DOMRect)[] = [
	'bottom',
	'height',
	'left',
	'right',
	'top',
	'width',
];

/**
 * rectChanged checks if two DOMRects are different
 */
function rectChanged(a = {} as DOMRect, b = {} as DOMRect) {
	return props.some(prop => a[prop] !== b[prop]);
}

let observedNodes = new Map<Element, NodeState>();
let rafId: number;

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

////////////////////////////////////////////////////////////////////////////////

/**
 * observeRect observes an Element's rect and calls a callback when it changes
 */
function observeRect<E extends Element>(node: E, cb: ObserverCallback) {
	return {
		observe() {
			let wasEmpty = observedNodes.size === 0;
			if (observedNodes.has(node)) {
				observedNodes.get(node)!.callbacks.push(cb);
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
	};
}

////////////////////////////////////////////////////////////////////////////////

/**
 * useRect observes an Element's rect and returns it
 */
export function useRect<E extends Element>(
	nodeRef: RefObject<E>,
	observe = true,
	onChange?: ObserverCallback,
) {
	let initialRectSet = useRef(false);
	let [rect, setRect] = useState<DOMRect>();
	let observerRef = useRef<ReturnType<typeof observeRect>>();
	useLayoutEffect(() => {
		const cleanup = () => {
			observerRef.current && observerRef.current.unobserve();
		};

		if (!nodeRef.current) {
			return cleanup;
		}

		if (!observerRef.current) {
			observerRef.current = observeRect(nodeRef.current, rect => {
				typeof onChange == 'function' && onChange(rect);
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
	window.document.createElement != null
		? _useLayoutEffect
		: useEffect;

////////////////////////////////////////////////////////////////////////////////

/**
 * calculateRange calculates the range to render
 */
export function calculateRange(
	input: InternalState,
	prevRange?: { start: number; end: number },
) {
	const { overscan, itemSizes, outerSize, scrollOffset } = input;
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
