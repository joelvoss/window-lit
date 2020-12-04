# window-lit

Hook for virtualizing scrollable lists.

**Bundle size:**
- **CommonJS**: 4239 B (gzip: 1925 B, brotli: 1729 B)
- **ESModule**: 4176 B (gzip: 1936 B , brotli: 1738 B)
- **UMD**: 4474 B (gzip: 2008 B , brotli: 1796 B)

_This project is heavily inspired by react-window and react-virtualized._

## Requirements

  - React v16.8+
  - React DOM v16.8+

## Installation

```bash
$ npm i window-lit
# or
$ yarn add window-lit
```

## Examples

### [Basic example](./examples/basic)
```js
import * as React from 'react';
import ReactDOM from 'react-dom';

import { useWindow } from 'window-lit';

function BasicExample() {
  const parentRef = React.useRef();

  const { virtualItems, totalSize } = useWindow(parentRef, {
    size: 10000,
    estimateSize: React.useCallback(() => 35, []),
    overscan: 5,
  });
  
  return (
    <div
      ref={parentRef}
      className="List"
      style={{ width: `100%`, maxHeight: '100vh', overflow: 'auto' }}
    >
      <div
        style={{
          position: 'relative',
          height: `${totalSize}px`,
          width: '100%',
        }}
      >
        {virtualItems.map(row => (
          <div
            key={row.index}
            style={{
              position: 'absolute',
              width: '100%',
              height: `35px`,
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

ReactDOM.render(<BasicExample />, document.getElementById('root'));
```

Visit [./examples](./examples) to view all usage examples.


## Development

(1) Install dependencies

```bash
$ npm i
# or
$ yarn
```

(2) Run initial validation

```bash
$ ./Taskfile.sh validate
```

(3) Start developing by running the `watch` and `dev` tasks in separate
    terminal windows.  
    This spins up a development server hosting the different
    examples located in the [./examples](./examples) folder.

```bash
$ ./Taskfile dev
# in another terminal window
$ ./Taskfile watch
```

---

_This project was set up by @jvdx/core_
