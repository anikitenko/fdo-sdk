import { DOMText, type FDOInterface, FDO_SDK, type PluginMetadata, handleError, handler } from "@anikitenko/fdo-sdk";
import { defineExampleSetup } from "../shared/frontend-lifecycle";

/**
 * Scenario fixture: Error-safe lifecycle and handler behavior.
 * Pattern intent: deterministic fallback behavior for init, backend handlers, and render failures.
 *
 * Why this fixture exists:
 * - safe render fallback UI
 * - explicit backend handler registration in init()
 * - real iframe-to-backend handler invocation through UI_MESSAGE
 * - minimal reusable pattern for resilient plugins
 */
export default class ErrorHandlingFixturePlugin extends FDO_SDK implements FDOInterface {
  private readonly _metadata: PluginMetadata = {
    name: "Fixture: Error Handling",
    version: "1.0.0",
    author: "FDO SDK Team",
    description: "Reference fixture for resilient error handling",
    icon: "warning-sign",
  };

  get metadata(): PluginMetadata {
    return this._metadata;
  }

  
  init(): void {
    this.info("Error handling fixture initialized", {
      plugin: this.metadata.name,
      version: this.metadata.version,
    });
  }

  @handleError({
    returnErrorUI: true,
    errorUIRenderer: (error: Error) => new DOMText().createPText(error.message),
  })
  render(): string {
    return `
      <div style="padding: 16px;">
        <h1>${this.metadata.name}</h1>
        <p>Use this fixture when your plugin needs deterministic init, handler, and render fallback behavior.</p>
        <p>It keeps the pattern small: backend handlers in <code>init()</code>, safe fallback UI in <code>render()</code>, and iframe calls through <code>UI_MESSAGE</code>.</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
          <button id="fixture-ok-button" class="pure-button pure-button-primary" type="button">Trigger Success Handler</button>
          <button id="fixture-fail-button" class="pure-button" type="button">Trigger Failure Handler</button>
        </div>
        <pre id="fixture-error-output" style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; min-height: 120px;">Result will appear here...</pre>
      </div>
    `;
  }

  renderOnLoad() {
        return defineExampleSetup(`
      ({listen, timeout, interval, onDispose, isDisposed}) => {
        const successButton = document.getElementById("fixture-ok-button");
        const failureButton = document.getElementById("fixture-fail-button");
        const output = document.getElementById("fixture-error-output");

        if (!successButton || !failureButton || !output) {
          return;
        }

        const callHandler = (handler, content = {}) =>
          window.createBackendReq("UI_MESSAGE", { handler, content });

        const setOutput = (value) => {
          output.textContent = typeof value === "string"
            ? value
            : JSON.stringify(value, null, 2);
        };

        const runHandler = async (handler, content = {}) => {
          setOutput("Running...");
          try {
            const result = await callHandler(handler, content);
            setOutput(result);
          } catch (error) {
            setOutput({
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        listen(successButton, "click", () => {
          void runHandler("fixture.ok", { source: "fixture-ui" });
        });

        listen(failureButton, "click", () => {
          void runHandler("fixture.fail", {});
        });
      }
        `, "error-handling-plugin.fixture");
      }

    @handler("fixture.fail")
    private onFixtureFail() {
        throw new Error("Intentional fixture handler failure");
    }

    @handler("fixture.ok")
    private onFixtureOk(data: unknown) {
        return ({
              ok: true,
              data,
            });
    }
}

new ErrorHandlingFixturePlugin();
