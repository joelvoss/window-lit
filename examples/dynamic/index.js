import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { useWindow } from '../../src/index';

function Example() {
	const rows = React.useMemo(
		() =>
			new Array(10000)
				.fill(true)
				.map(() => 25 + Math.round(Math.random() * 100)),
		[],
	);

	const columns = React.useMemo(
		() =>
			new Array(10000)
				.fill(true)
				.map(() => 75 + Math.round(Math.random() * 100)),
		[],
	);

	return (
		<div>
			<h3>Dynamic rows (vertical)</h3>
			<DynamicList rows={rows} />
			<h3>Dynamic columns (horizontal)</h3>
			<DynamicColumn columns={columns} />
			<h3>Dynamic grid (vertical + horizontal)</h3>
			<DynamicGrid rows={rows} columns={columns} />
		</div>
	);
}

function DynamicList({ rows }) {
	const parentRef = React.useRef();

	const { totalSize, virtualItems } = useWindow(parentRef, {
		size: rows.length,
		overscan: 5,
	});

	return (
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
							height: `${rows[row.index]}px`,
							transform: `translateY(${row.start}px)`,
						}}
					>
						Cell {row.index}
					</div>
				))}
			</div>
		</div>
	);
}

function DynamicColumn({ columns }) {
	const parentRef = React.useRef();

	const { totalSize, virtualItems } = useWindow(parentRef, {
		horizontal: true,
		size: columns.length,
		overscan: 5,
	});

	return (
		<div
			className="box"
			ref={parentRef}
			style={{
				height: `100px`,
				width: `400px`,
				overflow: 'auto',
			}}
		>
			<div
				style={{
					width: `${totalSize}px`,
					height: '100%',
					position: 'relative',
				}}
			>
				{virtualItems.map(column => (
					<div
						className={column.index % 2 ? 'odd' : 'even'}
						key={column.index}
						ref={column.measureRef}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							height: '100%',
							width: `${columns[column.index]}px`,
							transform: `translateX(${column.start}px)`,
						}}
					>
						Cell {column.index}
					</div>
				))}
			</div>
		</div>
	);
}

function DynamicGrid({ rows, columns }) {
	const parentRef = React.useRef();

	const virtualizedRow = useWindow(parentRef, {
		size: 10000,
		estimateSize: React.useCallback(i => rows[i], [rows]),
		overscan: 5,
	});

	const virtualizedColumn = useWindow(parentRef, {
		horizontal: true,
		size: 10000,
		estimateSize: React.useCallback(i => columns[i], [columns]),
		overscan: 5,
	});

	return (
		<div
			className="box"
			ref={parentRef}
			style={{
				height: `500px`,
				width: `400px`,
				overflow: 'auto',
			}}
		>
			<div
				style={{
					height: `${virtualizedRow.totalSize}px`,
					width: `${virtualizedColumn.totalSize}px`,
					position: 'relative',
				}}
			>
				{virtualizedRow.virtualItems.map(row => (
					<React.Fragment key={row.index}>
						{virtualizedColumn.virtualItems.map(column => (
							<div
								key={column.index}
								className={
									column.index % 2
										? row.index % 2 === 0
											? 'odd'
											: 'even'
										: row.index % 2
										? 'odd'
										: 'even'
								}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: `${columns[column.index]}px`,
									height: `${rows[row.index]}px`,
									transform: `translateX(${column.start}px) translateY(${row.start}px)`,
								}}
							>
								Cell {row.index}, {column.index}
							</div>
						))}
					</React.Fragment>
				))}
			</div>
		</div>
	);
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Example />);
