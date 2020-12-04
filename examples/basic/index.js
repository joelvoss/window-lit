import * as React from 'react';
import ReactDOM from 'react-dom';

import { useWindow } from '../../dist/window-lit';

const rows = new Array(10000)
	.fill(true)
	.map(() => 25 + Math.round(Math.random() * 100));

function Example() {
	const parentRef = React.useRef();

	const virtualList = useWindow(parentRef, {
		size: rows.length,
		estimateSize: React.useCallback(() => 65, []),
		overscan: 5,
	});

	return (
		<div
			ref={parentRef}
			className="List"
			style={{
				width: `100%`,
				maxHeight: '100vh',
				overflow: 'auto',
			}}
		>
			<div
				style={{
					height: `${virtualList.totalSize}px`,
					width: '100%',
					position: 'relative',
				}}
			>
				{virtualList.virtualItems.map(virtualRow => (
					<div
						key={virtualRow.index}
						ref={virtualRow.measureRef}
						style={{
							position: 'absolute',
							width: '100%',
							height: `${rows[virtualRow.index]}px`,
							transform: `translateY(${virtualRow.start}px)`,
						}}
					>
						Row {virtualRow.index}
					</div>
				))}
			</div>
		</div>
	);
}

ReactDOM.render(<Example />, document.getElementById('root'));
