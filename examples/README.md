# FDO SDK Plugin Examples

This directory contains example plugin implementations that demonstrate core FDO SDK features.

## Start Here

For new plugin authoring and AI-assisted scaffolding, start with the fixture set first.

Primary authoring entry points:

1. **fixtures/minimal-plugin.fixture.ts**
   Pattern: smallest valid plugin scaffold with stable lifecycle behavior.
2. **fixtures/error-handling-plugin.fixture.ts**
   Pattern: deterministic `@handleError` behavior with safe render fallback UI.
3. **fixtures/storage-plugin.fixture.ts**
   Pattern: plugin-scoped default/json store usage with graceful JSON-store unavailability handling.
4. **fixtures/advanced-ui-plugin.fixture.ts**
   Pattern: advanced semantic/table/action UI composition with DOM helper classes.
5. **fixtures/operator-kubernetes-plugin.fixture.ts**
   Pattern: curated `kubectl` operator preset for cluster-console style plugins, including inspect/act workflow modeling.
6. **fixtures/operator-terraform-plugin.fixture.ts**
   Pattern: curated `terraform` operator preset for plan/apply style plugins, including preview/apply workflow modeling.
7. **fixtures/operator-custom-tool-plugin.fixture.ts**
   Pattern: generic scoped process execution for host-specific/internal tools not covered by curated presets.

Use the operator fixtures for production-oriented DevOps/SRE/plugin authoring work.
Use the non-operator fixtures for lifecycle, error-handling, storage, and UI composition baselines.

## Getting Started

For comprehensive documentation on using these examples, see the [Quick Start Guide](../specs/002-plugin-examples/quickstart.md).

## Learning Examples

The numbered examples are learning references, not the default production starting point.
Use them to understand individual SDK features after choosing the right fixture baseline.

The examples are still numbered to indicate learning progression:

1. **01-basic-plugin.ts** - Basic plugin creation with lifecycle and rendering
2. **02-interactive-plugin.ts** - Interactive UI with handlers and messaging
3. **03-persistence-plugin.ts** - Data persistence with storage backends
4. **04-ui-extensions-plugin.ts** - Quick actions and side panel integration
5. **05-advanced-dom-plugin.ts** - Advanced DOM generation with styling
6. **06-error-handling-plugin.ts** - Error handling and debugging techniques
7. **07-injected-libraries-demo.ts** - Demonstrates all automatically injected libraries and helper functions
8. **08-privileged-actions-plugin.ts** - Low-level host privileged action flow using `requestPrivilegedAction(...)` with correlation ids and stable response handling
9. **09-operator-plugin.ts** - Curated operator helper example for a known tool family using `requestOperatorTool(...)`

For operator-style plugins, prefer host-mediated `system.process.exec` with a narrow scope such as `system.process.scope.docker-cli`, `system.process.scope.kubectl`, `system.process.scope.terraform`, or another explicit tool-family scope rather than raw shell execution.

## Additional Examples

- **dom_elements_plugin.ts** - Comprehensive examples of DOM element creation
- **metadata-template.ts** - Template for plugin metadata structure

## Privileged Action Envelope Pattern

For host-mediated privileged operations, use a stable response envelope and correlation IDs.
This is the low-level transport pattern. For known operator tool families, prefer the curated operator fixtures and helper APIs first:

- `createOperatorToolCapabilityPreset(...)`
- `createOperatorToolActionRequest(...)`
- `requestOperatorTool(...)`

Use the generic transport pattern below when you need lower-level control or a non-curated action family:

```ts
const request = createFilesystemMutateActionRequest({
  action: "system.fs.mutate",
  payload: {
    scope: "etc-hosts",
    dryRun: true,
    operations: [{ type: "writeFile", path: "/etc/hosts", content: "# managed", encoding: "utf8" }]
  }
});

const response = await requestPrivilegedAction(request, {
  correlationIdPrefix: "etc-hosts",
});

if (response?.ok) {
  // { ok: true, correlationId, result }
} else {
  // { ok: false, correlationId, error, code? }
}
```

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
