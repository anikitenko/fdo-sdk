# FDO SDK Plugin Examples

This directory contains example plugin implementations that demonstrate core FDO SDK features.

## Getting Started

For comprehensive documentation on using these examples, see the [Quick Start Guide](../specs/002-plugin-examples/quickstart.md).

## Examples

The examples are numbered to indicate learning progression:

1. **01-basic-plugin.ts** - Basic plugin creation with lifecycle and rendering
2. **02-interactive-plugin.ts** - Interactive UI with handlers and messaging
3. **03-persistence-plugin.ts** - Data persistence with storage backends
4. **04-ui-extensions-plugin.ts** - Quick actions and side panel integration
5. **05-advanced-dom-plugin.ts** - Advanced DOM generation with styling
6. **06-error-handling-plugin.ts** - Error handling and debugging techniques
7. **07-injected-libraries-demo.ts** - Demonstrates all automatically injected libraries and helper functions

## Additional Examples

- **dom_elements_plugin.ts** - Comprehensive examples of DOM element creation
- **example_plugin.ts** - Legacy example plugin (deprecated, use numbered examples instead)
- **metadata-template.ts** - Template for plugin metadata structure

## Injected Libraries

The FDO application automatically injects several popular libraries that you can use without additional imports:

- **CSS Frameworks**: Pure CSS, Notyf, Highlight.js
- **JavaScript Libraries**: FontAwesome, Split Grid, Highlight.js, Notyf, ACE Editor
- **Window Helpers**: `createBackendReq`, `waitForElement`, `executeInjectedScript`, and more

For complete documentation, see [Injected Libraries Documentation](../docs/INJECTED_LIBRARIES.md).

## Usage

Copy an example file to your project and customize it for your needs. Each example includes inline documentation explaining what each section does.

For detailed instructions, troubleshooting, and best practices, refer to the [Quick Start Guide](../specs/002-plugin-examples/quickstart.md).

## Troubleshooting

### Example Won't Compile

- **Issue**: TypeScript compilation errors
- **Solution**: Ensure TypeScript strict mode is enabled in your `tsconfig.json` and all imports are correct
- **Solution**: Verify SDK version compatibility in the example header comment

### Plugin Won't Load in FDO

- **Issue**: Plugin fails to load in the FDO application
- **Solution**: Check the console for error messages
- **Solution**: Verify your plugin class extends `FDO_SDK` and implements `FDOInterface`
- **Solution**: Ensure all required methods (`init`, `render`) are implemented
- **Solution**: Check that metadata is properly defined with all required fields

### Storage Operations Fail

- **Issue**: Data persistence errors (example 03)
- **Solution**: Verify you have write permissions in the storage directory
- **Solution**: Check that keys are properly namespaced (e.g., `pluginName:category:key`)
- **Solution**: Wrap all storage operations in try-catch blocks

### UI Doesn't Render

- **Issue**: Plugin UI not displaying correctly
- **Solution**: Check that `render()` returns a valid HTML string
- **Solution**: Verify DOM helper classes are used correctly (example 05)
- **Solution**: Check browser console for JavaScript errors
- **Solution**: Ensure `renderHTML()` is called when using DOM helpers

### Message Handlers Not Working

- **Issue**: Button clicks or form submissions not triggering handlers (example 02)
- **Solution**: Verify handlers are registered in `init()`, not in `render()`
- **Solution**: Check that handler names match the `message_type` used in UI elements
- **Solution**: Ensure handlers return properly structured result objects

### UI Extensions Not Appearing

- **Issue**: Quick actions or side panel items not showing (example 04)
- **Solution**: Verify mixins are applied correctly to the base class
- **Solution**: Check that `defineQuickActions()` and `defineSidePanel()` return valid configurations
- **Solution**: Ensure handlers are registered for all `message_type` values used in UI extensions

For more detailed troubleshooting, see the [Quick Start Guide](../specs/002-plugin-examples/quickstart.md#troubleshooting).

## Contributing

We welcome contributions to improve these examples! Here's how you can help:

### Reporting Issues

If you find a bug or issue in an example:

1. Check if the issue already exists in the [GitHub Issues](https://github.com/anikitenko/fdo-sdk/issues)
2. If not, create a new issue with:
   - Clear description of the problem
   - Which example file is affected
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Your environment (OS, Node version, SDK version)

### Suggesting Improvements

Have an idea to improve an example?

1. Open a GitHub issue describing your suggestion
2. Explain why the improvement would be helpful
3. Provide examples or mockups if applicable

### Submitting Changes

To contribute code changes:

1. Fork the repository
2. Create a new branch for your changes (`git checkout -b improve-example-03`)
3. Make your changes following these guidelines:
   - Maintain the existing code style and conventions
   - Keep inline documentation at 20%+ of total lines
   - Include "CUSTOMIZE HERE" markers where appropriate
   - Add "COMMON PITFALL" comments for common mistakes
   - Ensure all examples compile without errors
   - Test your changes in the FDO application
4. Commit your changes with a clear commit message
5. Push to your fork and submit a pull request
6. In your PR description, explain:
   - What changes you made
   - Why the changes are needed
   - How you tested the changes

### Code Style Guidelines

When contributing to examples:

- **Follow existing patterns**: Match the style and structure of existing examples
- **Comment thoroughly**: Maintain 20%+ documentation ratio
- **Use TypeScript strict mode**: All examples must compile with strict type checking
- **Handle errors**: Wrap operations in try-catch blocks
- **Be educational**: Examples are learning resources, prioritize clarity over brevity
- **Test thoroughly**: Ensure examples run correctly in the FDO application

### Questions?

If you have questions about contributing, feel free to:

- Open a GitHub issue with the "question" label
- Check existing issues and discussions
- Review the [SDK documentation](https://plugins.fdo.alexvwan.me)

Thank you for helping improve the FDO SDK examples!
