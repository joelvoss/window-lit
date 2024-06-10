import {
	type RefObject,
	type RefCallback,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useRect, useLayoutEffect, calculateRange } from './utils';
import type { InternalState, ItemSize, ScrollToOptions } from './types';

interface VirtualItem<E extends Element> extends ItemSize {
	measureRef: RefCallback<E>;
}

/**
 * defaultEstimateSize
 */
const defaultEstimateSize = () => 50;

////////////////////////////////////////////////////////////////////////////////

interface Options {
	size?: number;
	estimateSize?: (size: number) => number;
	paddingStart?: number;
	paddingEnd?: number;
	overscan?: number;
	horizontal?: boolean;
	useMeasure?: (ref: unknown) => { height: number; width: number };
	scrollToFn?: (
		offset: number,
		defaultScrollToFn: (offset: number) => void,
	) => void;
}

/**
 * useWindow
 */
export function useWindow<E extends Element>(
	parentRef: RefObject<E>,
	options?: Options,
) {
	const {
		size = 0,
		estimateSize = defaultEstimateSize,
		paddingStart = 0,
		paddingEnd = 0,
		overscan = 0,
		horizontal = false,
		useMeasure,
		scrollToFn: userScrollToFn,
	} = options || {};

	const sizeKey = horizontal ? 'width' : 'height';
	const scrollKey = horizontal ? 'scrollLeft' : 'scrollTop';

	const useMeasureParent = useMeasure || useRect;
	const { [sizeKey]: outerSize } = useMeasureParent(parentRef) || {
		[sizeKey]: 0,
	};

	const defaultScrollToFn = useCallback(
		(offset: number) => {
			if (parentRef.current) {
				parentRef.current[scrollKey] = offset;
			}
		},
		[parentRef, scrollKey],
	);

	const resolvedScrollToFn = userScrollToFn || defaultScrollToFn;

	const scrollToFn = useCallback(
		(offset: number) => {
			// NOTE(joel): We pass both offset and the default scrollTo function
			// so a user can implement smooth scrolling based on the current offset
			// and apply it via the `defaultScrollToFn`.
			resolvedScrollToFn(offset, defaultScrollToFn);
		},
		[defaultScrollToFn, resolvedScrollToFn],
	);

	// Determine the initial item sizes to calculate the total size of the
	// virtualized list.
	const [itemSizeCache, setItemSizeCache] = useState<Record<number, number>>(
		{},
	);

	// NOTE(joel): Reset the itemSizeCache whenever the `size` or `estimateSize`
	// parameter change
	const mountedRef = useRef<boolean>();
	useLayoutEffect(() => {
		if (mountedRef.current && (estimateSize != null || size)) {
			setItemSizeCache({});
		}
		mountedRef.current = true;
	}, [estimateSize, size]);

	const itemSizes = useMemo(() => {
		const _itemSizes: ItemSize[] = [];
		for (let i = 0; i < size; i++) {
			const itemSize = itemSizeCache[i];
			const start = _itemSizes[i - 1] ? _itemSizes[i - 1].end : paddingStart;
			const size = typeof itemSize === 'number' ? itemSize : estimateSize(i);
			const end = start + size;
			_itemSizes[i] = { index: i, start, size, end };
		}
		return _itemSizes;
	}, [estimateSize, itemSizeCache, paddingStart, size]);

	const totalSize = (itemSizes[size - 1]?.end || 0) + paddingEnd;

	const internalState = useRef<InternalState>({
		overscan: 0,
		itemSizes: [],
		outerSize: 0,
		totalSize: 0,
		scrollOffset: 0,
	});

	// NOTE(joel): We update the internal state whenever the compoenent rerenders
	// to ensure that the latest values are used in the scroll event handler.
	internalState.current.overscan = overscan;
	internalState.current.itemSizes = itemSizes;
	internalState.current.outerSize = outerSize;
	internalState.current.totalSize = totalSize;

	// internalState.current = {
	// 	...internalState.current,
	// 	overscan,
	// 	itemSizes,
	// 	outerSize,
	// 	totalSize,
	// };

	const [range, setRange] = useState({ start: 0, end: 0 });

	useLayoutEffect(() => {
		const element = parentRef.current;
		if (element == null) return;

		const onScroll = () => {
			const scrollOffset = element[scrollKey];
			internalState.current.scrollOffset = scrollOffset;
			setRange(prevRange => calculateRange(internalState.current, prevRange));
		};

		// NOTE(joel): Manually call the onScoll function to determine the
		// initially visible range.
		onScroll();

		element.addEventListener('scroll', onScroll, {
			capture: false,
			passive: true,
		});

		return () => {
			element.removeEventListener('scroll', onScroll);
		};
	}, [scrollKey, size, outerSize, parentRef]);

	/**
	 * Determine visible items
	 */
	const virtualItems = useMemo(() => {
		const _virtualItems = [];
		const end = Math.min(range.end, itemSizes.length - 1);

		for (let i = range.start; i <= end; i++) {
			const itemSize = itemSizes[i];

			const item: VirtualItem<E> = {
				...itemSize,
				measureRef: el => {
					const { scrollOffset } = internalState.current;

					if (el) {
						// NOTE(joel): The immediate destructuring is the same as
						// getting width or height from the object returned by
						// `getBoundingClientRect()`.
						const { [sizeKey]: measuredSize } = el.getBoundingClientRect();

						if (measuredSize !== item.size) {
							if (item.start < scrollOffset) {
								defaultScrollToFn(scrollOffset + (measuredSize - item.size));
							}

							setItemSizeCache(old => ({
								...old,
								[i]: measuredSize,
							}));
						}
					}
				},
			};

			_virtualItems.push(item);
		}

		return _virtualItems;
	}, [range.start, range.end, itemSizes, sizeKey, defaultScrollToFn]);

	const scrollToOffset = useCallback(
		/**
		 * scrollToOffset scrolls the list to a given offset (in px). In addition
		 * an align option can be specified
		 */
		(toOffset: number, options?: ScrollToOptions) => {
			let { align = 'start' } = options || {};
			const { scrollOffset, outerSize } = internalState.current;

			if (align === 'auto') {
				if (toOffset <= scrollOffset) {
					align = 'start';
				} else if (scrollOffset >= scrollOffset + outerSize) {
					align = 'end';
				} else {
					align = 'start';
				}
			}

			if (align === 'start') {
				scrollToFn(toOffset);
			} else if (align === 'end') {
				scrollToFn(toOffset - outerSize);
			} else if (align === 'center') {
				scrollToFn(toOffset - outerSize / 2);
			}
		},
		[scrollToFn],
	);

	const _scrollToIndex = useCallback(
		/**
		 * _scrollToIndex implements the actual logic to scroll the list to a given
		 * index.
		 */
		(index: number, options?: ScrollToOptions) => {
			let { align = 'auto' } = options || {};
			const { itemSizes, scrollOffset, outerSize } = internalState.current;

			const itemSize = itemSizes[Math.max(0, Math.min(index, size - 1))];

			if (!itemSize) {
				return;
			}

			if (align === 'auto') {
				if (itemSize.end >= scrollOffset + outerSize) {
					align = 'end';
				} else if (itemSize.start <= scrollOffset) {
					align = 'start';
				} else {
					return;
				}
			}

			const toOffset =
				align === 'center'
					? itemSize.start + itemSize.size / 2
					: align === 'end'
						? itemSize.end
						: itemSize.start;

			scrollToOffset(toOffset, { align });
		},
		[scrollToOffset, size],
	);

	const scrollToIndex = useCallback(
		/**
		 * scrollToIndex is a thin wrapper around _scrollToIndex which fixes an issue with dynamic sizes.
		 */
		(index: number, options?: ScrollToOptions) => {
			// NOTE(joel): We call tryScollToIndex two times here because of dynamic
			// sizes which can cause offset shifts after render. The first time we
			// scroll to the given index, allow a single animation frame and scroll
			// again.
			_scrollToIndex(index, options);
			requestAnimationFrame(() => {
				_scrollToIndex(index, options);
			});
		},
		[_scrollToIndex],
	);

	return {
		virtualItems,
		totalSize,
		scrollToOffset,
		scrollToIndex,
	};
}
