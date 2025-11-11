# SDK for FlexDevOPs Application modules

## Overview

The FDO SDK provides a comprehensive toolkit for building application modules (plugins) for the FlexDevOps (FDO) desktop application ecosystem. This SDK enables developers to create modular extensions with rich UI capabilities using server-side HTML generation.

## Features

### DOM Element Generation

The SDK provides extensive DOM element creation capabilities through specialized classes:

- **DOMTable**: Create HTML tables with thead, tbody, tfoot, tr, th, td, and caption elements
- **DOMMedia**: Create media elements including images with accessibility support
- **DOMSemantic**: Create semantic HTML5 elements (article, section, nav, header, footer, aside, main)
- **DOMNested**: Create container elements including ordered lists (ol), definition lists (dl, dt, dd), and more
- **DOMInput**: Create form inputs including select dropdowns with options and optgroups
- **DOMText**: Create text elements (headings, paragraphs, spans, etc.)
- **DOMButton**: Create button elements with event handlers
- **DOMLink**: Create anchor elements
- **DOMMisc**: Create miscellaneous elements like horizontal rules

All DOM classes support:
- Custom CSS styling via goober CSS-in-JS
- Custom classes and inline styles
- Custom HTML attributes
- Event handlers
- Accessibility attributes

### Plugin Framework

- **FDO_SDK Base Class**: Abstract base class with lifecycle hooks (init, render)
- **IPC Communication**: Message-based communication between plugin workers and main application
- **Data Persistence**: Multiple storage backends (in-memory, JSON file-based)
- **System Integration**: Logging, file operations, and privilege elevation

### Injected Libraries

The FDO application automatically injects several popular libraries and helper functions into your plugin environment:

- **CSS Frameworks**: Pure CSS, Notyf notifications, Highlight.js themes
- **JavaScript Libraries**: FontAwesome icons, Split Grid, Highlight.js, Notyf, ACE Editor, Goober (CSS-in-JS)
- **Helper Functions**: Backend communication, DOM utilities, event management

For complete documentation on available libraries and usage examples, see [Injected Libraries Documentation](./docs/INJECTED_LIBRARIES.md).

## Getting Started

### Installation

```bash
npm install @anikitenko/fdo-sdk
```

### Creating a Plugin

```typescript
import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";

export default class MyPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "My Plugin",
        version: "1.0.0",
        author: "Your Name",
        description: "Plugin description",
        icon: "icon.png"
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    init(): void {
        this.log("MyPlugin initialized!");
    }

    render(): string {
        return "<div>Hello World</div>";
    }
}
```

### Example Usage

See `examples/example_plugin.ts` for a basic plugin example.

See `examples/dom_elements_plugin.ts` for comprehensive examples of using the new DOM element creation capabilities including tables, media, semantic HTML, lists, and form controls.

## Development

### Building

```bash
npm run build        # Build webpack bundle (automatically runs build:types first)
npm run build:types  # Generate TypeScript declarations only
```

### Testing

```bash
npm test             # Run Jest tests
npm run test:coverage # Run tests with coverage report
npm run coverage:open # Open coverage report in browser
```

### Publishing

The package includes a `prepublishOnly` script that automatically runs tests and builds before publishing to ensure quality.

## Documentation

- Full API documentation is available in the TypeScript declaration files
- All public methods include JSDoc comments with usage examples
- See the `examples/` directory for working plugin implementations

## License

ISC
