import * as React from 'react';
import ReactDOM from 'react-dom';

import { useWindow } from '../../dist/window-lit';

const rows = new Array(10000)
	.fill(true)
	.map(() => 25 + Math.round(Math.random() * 100));

function Example() {
	const parentRef = React.useRef();

	const { totalSize, virtualItems } = useWindow(parentRef, {
		size: rows.length,
		estimateSize: React.useCallback(() => 65, []),
		overscan: 5,
	});

	return (
		<div
			ref={parentRef}
			style={{
				width: `100%`,
				maxHeight: '100vh',
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
						key={row.index}
						ref={row.measureRef}
						style={{
							position: 'absolute',
							width: '100%',
							height: `${rows[row.index]}px`,
							transform: `translateY(${row.start}px)`,
						}}
					>
						Row {row.index}
					</div>
				))}
			</div>
		</div>
	);
}

ReactDOM.render(<Example />, document.getElementById('root'));
