import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// NOTE(joel): Automatically unmount and cleanup DOM after the test is finished.
// This is loaded automatically when importing anything from this file
// in a test file.
afterEach(() => {
	cleanup();
});

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
