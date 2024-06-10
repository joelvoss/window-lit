import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { useWindow } from '../../src/index';

function Example() {
	return (
		<div>
			<h3>Fixed rows (vertical)</h3>
			<FixedList />
			<h3>Fixed columns (horizontal)</h3>
			<FixedColumn />
			<h3>Fixed grid (vertical + horizontal)</h3>
			<FixedGrid />
		</div>
	);
}

function FixedList() {
	const parentRef = React.useRef<HTMLDivElement>(null);

	const { totalSize, virtualItems } = useWindow(parentRef, {
		size: 10000,
		estimateSize: React.useCallback(() => 35, []),
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
							height: `${row.size}px`,
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

function FixedColumn() {
	const parentRef = React.useRef<HTMLDivElement>(null);

	const { totalSize, virtualItems } = useWindow(parentRef, {
		horizontal: true,
		size: 10000,
		estimateSize: React.useCallback(() => 100, []),
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
							width: `${column.size}px`,
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

function FixedGrid() {
	const parentRef = React.useRef<HTMLDivElement>(null);

	const virtualizedRow = useWindow(parentRef, {
		size: 10000,
		estimateSize: React.useCallback(() => 35, []),
		overscan: 5,
	});

	const virtualizedColumn = useWindow(parentRef, {
		horizontal: true,
		size: 10000,
		estimateSize: React.useCallback(() => 100, []),
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
									width: `${column.size}px`,
									height: `${row.size}px`,
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

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<Example />);
