import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useWindow } from '../src/index';

describe('useWindow', () => {
	it('should render', async () => {
		function App() {
			const parentRef = React.useRef();

			const { totalSize, virtualItems } = useWindow(parentRef, {
				size: 10000,
				estimateSize: React.useCallback(() => 35, []),
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
						{virtualItems.map(row => (
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

		render(<App />);

		expect(screen.getByText('Row 1')).toBeInTheDocument();
	});

	it('should render given dynamic size', async () => {
		function App() {
			const parentRef = React.useRef();

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
						{virtualItems.map(row => (
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

		const rendered = render(<App />);

		rendered.getByText('Row 1');
	});
});
