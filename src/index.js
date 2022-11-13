import { useCallback, useMemo, useRef, useState } from 'react';
import { useRect, useLayoutEffect, calculateRange } from './utils';

/**
 * defaultEstimateSize
 * @type {() => number}
 */
const defaultEstimateSize = () => 50;

////////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {(offset: number) => void} DefaultScrollToFn
 */

/**
 * @typedef {Object} ScrollToOptions
 * @prop {'auto' | 'start' | 'end'} align
 */

/**
 * @typedef {Object} ItemSize
 * @prop {number} index
 * @prop {number} start
 * @prop {number} size
 * @prop {number} end
 */

/**
 * @typedef {Object} VirtualItem
 * @prop {number} index
 * @prop {number} start
 * @prop {number} size
 * @prop {number} end
 * @prop {(el: any) => void} measureRef
 */

/**
 * @typedef {Object} Options
 * @prop {number} [size]
 * @prop {() => number} [estimateSize]
 * @prop {number} paddingStart
 * @prop {number} paddingEnd
 * @prop {number} overscan
 * @prop {boolean} horizontal
 * @prop {(ref: any) => ({height: number, width: number})} useMeasure
 * @prop {(offset: number, defaultScrollToFn: DefaultScrollToFn) => void} scrollToFn
 */

/**
 * useWindow
 * @param {any} parentRef
 * @param {Options} options
 */
export function useWindow(
	parentRef,
	{
		size = 0,
		estimateSize = defaultEstimateSize,
		paddingStart = 0,
		paddingEnd = 0,
		overscan = 0,
		horizontal = false,
		useMeasure,
		scrollToFn: userScrollToFn,
	},
) {
	const sizeKey = horizontal ? 'width' : 'height';
	const scrollKey = horizontal ? 'scrollLeft' : 'scrollTop';

	const useMeasureParent = useMeasure || useRect;
	const { [sizeKey]: outerSize } = useMeasureParent(parentRef) || {
		[sizeKey]: 0,
	};

	/** @type {DefaultScrollToFn} */
	const defaultScrollToFn = useCallback(
		offset => {
			if (parentRef.current) {
				parentRef.current[scrollKey] = offset;
			}
		},
		[parentRef, scrollKey],
	);

	const resolvedScrollToFn = userScrollToFn || defaultScrollToFn;

	/** @type {DefaultScrollToFn} */
	const scrollToFn = useCallback(
		offset => {
			// NOTE(joel): We pass both offset and the default scrollTo function
			// so a user can implement smooth scrolling based on the current offset
			// and apply it via the `defaultScrollToFn`.
			resolvedScrollToFn(offset, defaultScrollToFn);
		},
		[defaultScrollToFn, resolvedScrollToFn],
	);

	// Determine the initial item sizes to calculate the total size of the
	// virtualized list.
	const [itemSizeCache, setItemSizeCache] = useState({});

	// NOTE(joel): Reset the itemSizeCache whenever the `size` or `estimateSize`
	// parameter change
	const mountedRef = useRef();
	useLayoutEffect(() => {
		if (mountedRef.current && (estimateSize || size)) {
			setItemSizeCache({});
		}
		mountedRef.current = true;
	}, [estimateSize, size]);

	/** @type {ItemSize[]} */
	const itemSizes = useMemo(() => {
		const _itemSizes = [];
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

	const internalState = useRef({});
	internalState.current = {
		...internalState.current,
		overscan,
		itemSizes,
		outerSize,
		totalSize,
	};

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
	 * @type {VirtualItem[]}
	 */
	const virtualItems = useMemo(() => {
		const _virtualItems = [];
		const end = Math.min(range.end, itemSizes.length - 1);

		for (let i = range.start; i <= end; i++) {
			const itemSize = itemSizes[i];

			const item = {
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
		 * @param {number} toOffset
		 * @param {ScrollToOptions} options
		 */
		(toOffset, { align = 'start' } = {}) => {
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
		 * @param {number} index
		 * @param {ScrollToOptions} options
		 */
		(index, { align = 'auto' } = {}) => {
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
		 * scrollToIndex is a thin wrapper around _scrollToIndex which fixes an issue
		 * with dynamic sizes.
		 * @param {number} index
		 * @param {ScrollToOptions} options
		 */
		(index, options) => {
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
