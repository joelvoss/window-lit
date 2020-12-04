import * as React from 'react';

import { useRect, useLayoutEffect, calculateRange } from './utils';

const defaultEstimateSize = () => 50;

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
		scrollToFn,
	},
) {
	const sizeKey = horizontal ? 'width' : 'height';
	const scrollKey = horizontal ? 'scrollLeft' : 'scrollTop';

	const useMeasureParent = useMeasure || useRect;
	const { [sizeKey]: outerSize } = useMeasureParent(parentRef) || {
		[sizeKey]: 0,
	};

	const defaultScrollToFn = React.useCallback(
		offset => {
			if (parentRef.current) {
				parentRef.current[scrollKey] = offset;
			}
		},
		[parentRef, scrollKey],
	);

	const resolvedScrollToFn = scrollToFn || defaultScrollToFn;
	scrollToFn = React.useCallback(
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
	const [itemSizeCache, setItemSizeCache] = React.useState({});

	// NOTE(joel): Reset the itemSizeCache whenever the `size` or `estimateSize`
	// parameter change
	const mountedRef = React.useRef();
	useLayoutEffect(() => {
		if (mountedRef.current) {
			if (estimateSize || size) setItemSizeCache({});
		}
		mountedRef.current = true;
	}, [estimateSize, size]);

	const itemSizes = React.useMemo(() => {
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

	const internalState = React.useRef({});
	internalState.current = {
		...internalState.current,
		overscan,
		itemSizes,
		outerSize,
		totalSize,
	};

	const [range, setRange] = React.useState({ start: 0, end: 0 });

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

	// Determine visible items
	const virtualItems = React.useMemo(() => {
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

	// scrollToOffset scrolls the list to a given offset (in px). In addition
	// an align option can be specified
	const scrollToOffset = React.useCallback(
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

	// _scrollToIndex implements the actual logic to scroll the list to a given
	// index.
	const _scrollToIndex = React.useCallback(
		(index, { align = 'auto', ...rest } = {}) => {
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

			scrollToOffset(toOffset, { align, ...rest });
		},
		[scrollToOffset, size],
	);

	// scrollToIndex is a thin wrapper around _scrollToIndex which fixes an issue
	// with dynamic sizes.
	const scrollToIndex = React.useCallback(
		(...args) => {
			// NOTE(joel): We call tryScollToIndex two times here because of dynamic
			// sizes which can cause offset shifts after render. The first time we
			// scroll to the given index, allow a single animation frame and scroll
			// again.
			_scrollToIndex(...args);
			requestAnimationFrame(() => {
				_scrollToIndex(...args);
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
