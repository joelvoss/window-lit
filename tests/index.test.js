import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import { MyComponent } from '../src/index';

describe('MyComponent', () => {
	it('renders without errors', async () => {
		const { getByRole, getByText } = render(<MyComponent />);

		// Assert default state
		expect(getByText(/clicked/i)).toBeInTheDocument();

		// Perform some action and await the expected change
		fireEvent.click(getByRole('button', { name: /\+1/i }));
		await waitFor(() => getByText(/clicked 1 times/i));

		// Assert DOM after action
		expect(getByText(/clicked 1 times/i)).toBeInTheDocument();

		// Performe more actions and await the expected change
		fireEvent.click(getByRole('button', { name: /\-1/i }));
		fireEvent.click(getByRole('button', { name: /\-1/i }));
		await waitFor(() => getByText(/clicked -1 times/i));

		// Assert DOM after actions
		expect(getByText(/clicked -1 times/i)).toBeInTheDocument();
	});
});
