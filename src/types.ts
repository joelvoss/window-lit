export interface ScrollToOptions {
	align: 'auto' | 'start' | 'center' | 'end';
}

export interface ItemSize {
	index: number;
	start: number;
	size: number;
	end: number;
}

export interface InternalState {
	overscan: number;
	itemSizes: ItemSize[];
	outerSize: number;
	totalSize: number;
	scrollOffset: number;
}

export type ObserverCallback = (rect?: DOMRect) => void;

export interface NodeState {
	rect?: DOMRect;
	hasRectChanged: boolean;
	callbacks: ObserverCallback[];
}
