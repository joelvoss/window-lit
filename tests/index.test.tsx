import { useCallback, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';

import { useWindow } from '../src/index';

describe('useWindow', () => {
	it('should render', async () => {
		function App() {
			const parentRef = useRef<HTMLDivElement>(null);

			const { totalSize, virtualItems } = useWindow(parentRef, {
				size: 10000,
				estimateSize: useCallback(() => 35, []),
				overscan: 5,
			});

			return (
				<div
					ref={parentRef}
					style={{ height: '200px', width: '200px', overflow: 'auto' }}
				>
					<div
						style={{
							position: 'relative',
							width: '100%',
							height: `${totalSize}px`,
						}}
					>
						{virtualItems.map((row) => (
							<div
								key={row.index}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									height: `${row.size}px`,
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

		const screen = await render(<App />);
		await expect
			.element(screen.getByText('Row 1', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByText('Row 5', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByText('Row 20', { exact: true }))
			.not.toBeInTheDocument();
	});

	it('should render given dynamic size', async () => {
		function App() {
			const parentRef = useRef<HTMLDivElement>(null);

			const { totalSize, virtualItems } = useWindow(parentRef, {
				size: 10000,
				overscan: 5,
			});

			return (
				<div
					ref={parentRef}
					style={{ height: '200px', width: '200px', overflow: 'auto' }}
				>
					<div
						style={{
							position: 'relative',
							width: '100%',
							height: `${totalSize}px`,
						}}
					>
						{virtualItems.map((row) => (
							<div
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
								Row {row.index}
							</div>
						))}
					</div>
				</div>
			);
		}

		const screen = await render(<App />);
		await expect
			.element(screen.getByText('Row 1', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByText('Row 5', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByText('Row 20', { exact: true }))
			.not.toBeInTheDocument();
	});
});
