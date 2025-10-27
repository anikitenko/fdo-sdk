# Quick Start: Using Plugin Examples

**Feature**: Plugin Example Implementations  
**Date**: 2025-10-27  
**Audience**: Plugin developers learning the FDO SDK

## Overview

This guide helps you get started with the FDO SDK plugin examples. The examples are organized in progressive complexity from basic to advanced, allowing you to learn at your own pace.

## Prerequisites

Before using these examples, ensure you have:

1. **FDO SDK Installed**: Install via npm
   ```bash
   npm install @anikitenko/fdo-sdk
   ```

2. **Development Environment**: 
   - Node.js 18+ installed
   - TypeScript 5.7+ installed
   - Code editor with TypeScript support (VS Code recommended)

3. **FDO Desktop Application**: The FDO desktop application must be available to run and test plugins

## Example Progression

The examples are numbered to indicate learning progression. Start with 01 and work your way up:

### 01-basic-plugin.ts (Start Here)
**What you'll learn**: 
- How to create a minimal working plugin
- Plugin lifecycle (init and render methods)
- Basic metadata structure
- Simple HTML rendering

**Time to complete**: 5-10 minutes

**When to use this pattern**: When you need a simple plugin that displays static content

### 02-interactive-plugin.ts
**What you'll learn**:
- How to handle user interactions (button clicks, form inputs)
- Message handler registration
- IPC communication between plugin and main process
- Basic error handling

**Time to complete**: 15-20 minutes

**When to use this pattern**: When your plugin needs to respond to user actions

### 03-persistence-plugin.ts
**What you'll learn**:
- How to save and retrieve data
- Difference between StoreDefault (in-memory) and StoreJson (file-based)
- Proper key naming conventions
- Error handling for storage operations

**Time to complete**: 15-20 minutes

**When to use this pattern**: When your plugin needs to remember user preferences or state across sessions

### 04-ui-extensions-plugin.ts
**What you'll learn**:
- How to add quick actions to the FDO application
- How to create side panel menu items
- Using mixins to extend plugin functionality
- Message routing from UI extensions

**Time to complete**: 20-25 minutes

**When to use this pattern**: When you want to integrate your plugin into the FDO application's UI chrome

### 05-advanced-dom-plugin.ts
**What you'll learn**:
- How to use DOM helper classes (DOMText, DOMButton, DOMInput, etc.)
- CSS-in-JS styling with goober
- Building complex nested UI structures
- Form composition with multiple input types

**Time to complete**: 25-30 minutes

**When to use this pattern**: When you need rich, styled UI components with complex layouts

## How to Use an Example

### Step 1: Copy the Example
Copy the example file you want to learn from to your project:

```bash
cp node_modules/@anikitenko/fdo-sdk/examples/01-basic-plugin.ts my-plugin.ts
```

### Step 2: Read the Documentation
Open the file and read the header comment block and inline documentation. This explains:
- What the example demonstrates
- SDK version compatibility
- Expected output when running

### Step 3: Customize for Your Needs
Look for comments that say "CUSTOMIZE HERE" or "TODO: Replace with your...". These indicate where you should modify the code for your specific use case.

### Step 4: Run and Test
Load your plugin in the FDO desktop application and verify it works as expected. Check the console for any errors or log messages.

### Step 5: Experiment
Try modifying the example to add your own features. The inline comments explain what each section does, making it easier to understand how to extend the functionality.

## Common Patterns

### Plugin Metadata
All plugins must define metadata:
```typescript
private readonly _metadata: PluginMetadata = {
  name: "Your Plugin Name",
  version: "1.0.0",
  author: "Your Name",
  description: "What your plugin does",
  icon: "icon.png"
};
```

### Lifecycle Methods
All plugins must implement init() and render():
```typescript
init(): void {
  // Setup code: register handlers, initialize stores, etc.
  this.log("Plugin initialized");
}

render(): string {
  // Return HTML/UI definition
  return "<div>Your UI here</div>";
}
```

### Logging
Use the built-in logging methods:
```typescript
this.log("Info message");      // General information
this.error(new Error("Oops")); // Error logging
```

### Handler Registration
Register message handlers in init():
```typescript
PluginRegistry.registerHandler("myHandler", (data) => {
  // Handle the message
  return result;
});
```

## Troubleshooting

### Example Won't Compile
- Ensure TypeScript strict mode is enabled in your tsconfig.json
- Check that all imports are correct
- Verify SDK version compatibility in the example header

### Plugin Won't Load in FDO
- Check the console for error messages
- Verify your plugin class extends FDO_SDK
- Ensure all required methods (init, render) are implemented
- Check that metadata is properly defined

### Storage Operations Fail
- Verify you have write permissions in the storage directory
- Check that keys are properly namespaced
- Wrap storage operations in try-catch blocks

### UI Doesn't Render
- Check that render() returns a valid HTML string
- Verify DOM helper classes are used correctly
- Check browser console for JavaScript errors

## Next Steps

After working through the examples:

1. **Read the SDK Documentation**: Dive deeper into specific APIs and classes
2. **Review the SDK Source Code**: See how the SDK itself is implemented
3. **Join the Community**: Share your plugins and get help from other developers
4. **Build Your Plugin**: Apply what you've learned to create your own plugin

## SDK Version Compatibility

All examples are compatible with FDO SDK v1.x. Check the header comment in each example file for specific version information.

## Getting Help

If you encounter issues:
1. Check the inline comments in the example files
2. Review the SDK API documentation
3. Search existing issues in the GitHub repository
4. Open a new issue with a minimal reproduction case

## Contributing

Found a bug in an example or have a suggestion for improvement? Contributions are welcome! Please open an issue or pull request in the SDK repository.
