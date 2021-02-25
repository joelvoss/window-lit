import * as React from 'react';
import ReactDOM from 'react-dom';

import { useWindow } from '../../dist/window-lit';

function easeInOutQuint(t) {
	return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;
}

function Example() {
	return (
		<div>
			<h3>Smooth scrolling</h3>
			<FixedList />
		</div>
	);
}

function FixedList() {
	const parentRef = React.useRef();

	// Custom smooth scrolling function.
	const scrollingRef = React.useRef();
	const scrollToFn = React.useCallback((offset, defaultScrollTo) => {
		const duration = 1000;
		const start = parentRef.current.scrollTop;
		const startTime = (scrollingRef.current = Date.now());

		const run = () => {
			if (scrollingRef.current !== startTime) return;
			const now = Date.now();
			const elapsed = now - startTime;
			const progress = easeInOutQuint(Math.min(elapsed / duration, 1));
			const interpolated = start + (offset - start) * progress;

			if (elapsed < duration) {
				defaultScrollTo(interpolated);
				requestAnimationFrame(run);
			} else {
				defaultScrollTo(interpolated);
			}
		};
		requestAnimationFrame(run);
	}, []);

	const { totalSize, virtualItems, scrollToIndex, scrollToOffset } = useWindow(
		parentRef,
		{
			size: 10000,
			estimateSize: React.useCallback(() => 35, []),
			overscan: 5,
			scrollToFn,
		},
	);

	return (
		<>
			<div>
				<button
					className="btn"
					onClick={() => scrollToIndex(Math.floor(Math.random() * 10000))}
				>
					Scroll To Random Index
				</button>
				<button
					className="btn"
					onClick={() => scrollToOffset(Math.floor(Math.random() * 350000))}
				>
					Scroll To Random Offset
				</button>
			</div>

			<div
				className="box"
				ref={parentRef}
				style={{
					height: `200px`,
					width: `400px`,
					overflow: 'auto',
				}}
			>
				<div
					style={{
						height: `${totalSize}px`,
						width: '100%',
						position: 'relative',
					}}
				>
					{virtualItems.map(row => (
						<div
							className={row.index % 2 ? 'odd' : 'even'}
							key={row.index}
							ref={row.measureRef}
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: `${row.size}px`,
								transform: `translateY(${row.start}px)`,
							}}
						>
							Cell {row.index}
						</div>
					))}
				</div>
			</div>
		</>
	);
}

ReactDOM.render(<Example />, document.getElementById('root'));
