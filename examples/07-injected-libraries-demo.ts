/**
 * Example plugin demonstrating the use of injected libraries and helper functions
 * 
 * This example shows how to use:
 * - Pure CSS for responsive layouts
 * - Notyf for notifications
 * - Highlight.js for code syntax highlighting
 * - FontAwesome icons
 * - ACE Editor for code editing
 * - Split Grid for resizable panels
 * - Window helper functions (createBackendReq, waitForElement, etc.)
 */

import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";

export default class InjectedLibrariesDemoPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "Injected Libraries Demo",
        version: "1.0.0",
        author: "FDO SDK",
        description: "Demonstrates the use of automatically injected libraries and helper functions",
        icon: "💡"
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    init(): void {
        this.log("InjectedLibrariesDemoPlugin initialized!");
    }

    render(): string {
        return `
            <style>
                .demo-container {
                    padding: 20px;
                }
                
                .demo-section {
                    margin-bottom: 30px;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                
                .demo-section h3 {
                    margin-top: 0;
                    color: #333;
                }
                
                .split-container {
                    display: grid;
                    grid-template-columns: 1fr 10px 1fr;
                    height: 400px;
                    border: 1px solid #ccc;
                }
                
                .gutter {
                    background-color: #eee;
                    cursor: col-resize;
                    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
                    background-repeat: no-repeat;
                    background-position: center;
                }
                
                .panel {
                    padding: 15px;
                    overflow: auto;
                }
                
                #editor {
                    height: 300px;
                    border: 1px solid #ccc;
                }
                
                .icon-demo i {
                    font-size: 24px;
                    margin: 10px;
                }
            </style>
            
            <div class="demo-container">
                <h2><i class="fas fa-book"></i> Injected Libraries Demo</h2>
                
                <!-- Pure CSS Grid Demo -->
                <div class="demo-section">
                    <h3>1. Pure CSS Responsive Grid</h3>
                    <div class="pure-g">
                        <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                            <div style="padding: 10px; background: #e3f2fd; margin: 5px;">
                                <strong>Column 1</strong><br>
                                Full width on mobile, half on tablet, third on desktop
                            </div>
                        </div>
                        <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                            <div style="padding: 10px; background: #fff3e0; margin: 5px;">
                                <strong>Column 2</strong><br>
                                Responsive grid using Pure CSS
                            </div>
                        </div>
                        <div class="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                            <div style="padding: 10px; background: #f1f8e9; margin: 5px;">
                                <strong>Column 3</strong><br>
                                No extra CSS needed!
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Notyf Notifications Demo -->
                <div class="demo-section">
                    <h3>2. Notyf Notifications</h3>
                    <button class="pure-button pure-button-primary" onclick="showSuccessNotification()">
                        <i class="fas fa-check"></i> Show Success
                    </button>
                    <button class="pure-button" onclick="showErrorNotification()" style="background: #d32f2f; color: white; margin-left: 10px;">
                        <i class="fas fa-times"></i> Show Error
                    </button>
                    <button class="pure-button" onclick="showCustomNotification()" style="background: #7b1fa2; color: white; margin-left: 10px;">
                        <i class="fas fa-info-circle"></i> Show Custom
                    </button>
                </div>
                
                <!-- FontAwesome Icons Demo -->
                <div class="demo-section">
                    <h3>3. FontAwesome Icons</h3>
                    <div class="icon-demo">
                        <i class="fas fa-home" title="Solid Home"></i>
                        <i class="fas fa-user" title="Solid User"></i>
                        <i class="fas fa-heart" title="Solid Heart" style="color: red;"></i>
                        <i class="far fa-heart" title="Regular Heart"></i>
                        <i class="fas fa-star" title="Solid Star" style="color: gold;"></i>
                        <i class="far fa-star" title="Regular Star"></i>
                        <i class="fab fa-github" title="GitHub"></i>
                        <i class="fab fa-twitter" title="Twitter" style="color: #1da1f2;"></i>
                    </div>
                </div>
                
                <!-- Highlight.js Demo -->
                <div class="demo-section">
                    <h3>4. Syntax Highlighting with Highlight.js</h3>
                    <pre><code class="language-javascript">// JavaScript code with syntax highlighting
const message = "Hello, World!";

function greet(name) {
    return \`Hello, \${name}!\`;
}

class Plugin extends FDO_SDK {
    init() {
        this.log("Plugin initialized");
    }
}
</code></pre>
                </div>
                
                <!-- ACE Editor Demo -->
                <div class="demo-section">
                    <h3>5. ACE Code Editor</h3>
                    <div id="editor"></div>
                    <button class="pure-button" onclick="getEditorContent()" style="margin-top: 10px;">
                        <i class="fas fa-code"></i> Get Editor Content
                    </button>
                </div>
                
                <!-- Split Grid Demo -->
                <div class="demo-section">
                    <h3>6. Resizable Panels with Split Grid</h3>
                    <div class="split-container">
                        <div class="panel" style="background: #e8f5e9;">
                            <h4>Left Panel</h4>
                            <p>Drag the center gutter to resize panels.</p>
                            <ul>
                                <li>Draggable divider</li>
                                <li>Customizable min/max sizes</li>
                                <li>Snap to grid support</li>
                            </ul>
                        </div>
                        <div class="gutter gutter-col-1"></div>
                        <div class="panel" style="background: #fff3e0;">
                            <h4>Right Panel</h4>
                            <p>Perfect for creating split-view layouts!</p>
                            <pre><code class="language-javascript">Split({
    columnGutters: [{
        track: 1,
        element: document.querySelector('.gutter-col-1')
    }]
});</code></pre>
                        </div>
                    </div>
                </div>
                
                <!-- Window Helpers Demo -->
                <div class="demo-section">
                    <h3>7. Window Helper Functions</h3>
                    <button class="pure-button" onclick="testBackendReq()">
                        <i class="fas fa-server"></i> Test Backend Request
                    </button>
                    <button class="pure-button" onclick="testWaitForElement()" style="margin-left: 10px;">
                        <i class="fas fa-search"></i> Test Wait for Element
                    </button>
                    <button class="pure-button" onclick="testApplyClass()" style="margin-left: 10px;">
                        <i class="fas fa-palette"></i> Apply Class
                    </button>
                    <div id="helper-output" style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; min-height: 50px;">
                        Output will appear here...
                    </div>
                </div>
            </div>
            
            <script nonce="plugin-script-inject">
                // Initialize Notyf
                const notyf = new Notyf({
                    duration: 3000,
                    position: { x: 'right', y: 'top' },
                    ripple: true,
                    dismissible: true
                });
                
                function showSuccessNotification() {
                    notyf.success('Operation completed successfully! ✓');
                }
                
                function showErrorNotification() {
                    notyf.error('An error occurred! ✗');
                }
                
                function showCustomNotification() {
                    notyf.open({
                        type: 'info',
                        message: 'This is a custom notification with a longer message that demonstrates the flexibility of Notyf!',
                        background: '#7b1fa2',
                        duration: 5000
                    });
                }
                
                // Initialize Highlight.js
                hljs.highlightAll();
                
                // Initialize ACE Editor
                window.waitForElement('#editor', (element) => {
                    const editor = ace.edit("editor");
                    editor.setTheme("ace/theme/monokai");
                    editor.session.setMode("ace/mode/typescript");
                    editor.setValue(\`import { FDO_SDK, FDOInterface, PluginMetadata } from "@anikitenko/fdo-sdk";

export default class MyPlugin extends FDO_SDK implements FDOInterface {
    private readonly _metadata: PluginMetadata = {
        name: "My Plugin",
        version: "1.0.0",
        author: "Your Name",
        description: "Plugin description",
        icon: "🚀"
    };

    get metadata(): PluginMetadata {
        return this._metadata;
    }

    init(): void {
        this.log("MyPlugin initialized!");
    }

    render(): string {
        return "<div>Hello from my plugin!</div>";
    }
}\`, 1);
                    
                    editor.setOptions({
                        fontSize: "14px",
                        showPrintMargin: false
                    });
                });
                
                function getEditorContent() {
                    const content = ace.edit("editor").getValue();
                    notyf.success(\`Got \${content.split('\\n').length} lines of code!\`);
                    console.log('Editor content:', content);
                }
                
                // Initialize Split Grid
                window.waitForElement('.gutter-col-1', () => {
                    Split({
                        columnGutters: [{
                            track: 1,
                            element: document.querySelector('.gutter-col-1'),
                        }],
                        columnMinSize: 100
                    });
                });
                
                // Window helper function demos
                async function testBackendReq() {
                    const output = document.getElementById('helper-output');
                    output.innerHTML = 'Sending backend request...';
                    
                    try {
                        // This would normally call a backend handler
                        // For demo purposes, we'll simulate it
                        const result = await window.createBackendReq('getPluginInfo', { 
                            id: 'demo-plugin' 
                        });
                        output.innerHTML = \`<strong>Backend Response:</strong><br><pre>\${JSON.stringify(result, null, 2)}</pre>\`;
                    } catch (error) {
                        output.innerHTML = \`<strong>Error:</strong> Backend request failed (expected in demo mode)\`;
                    }
                }
                
                function testWaitForElement() {
                    const output = document.getElementById('helper-output');
                    output.innerHTML = 'Creating dynamic element...';
                    
                    // Create a new element after a delay
                    setTimeout(() => {
                        const newDiv = document.createElement('div');
                        newDiv.id = 'dynamic-element';
                        newDiv.textContent = 'I am a dynamically created element!';
                        newDiv.style.cssText = 'padding: 10px; background: #4caf50; color: white; border-radius: 3px; margin-top: 10px;';
                        output.appendChild(newDiv);
                    }, 500);
                    
                    // Wait for it to appear
                    window.waitForElement('#dynamic-element', (element) => {
                        notyf.success('Found the dynamic element!');
                        element.style.animation = 'pulse 0.5s';
                    }, 2000);
                }
                
                function testApplyClass() {
                    const output = document.getElementById('helper-output');
                    
                    // Apply a class to the output div
                    window.applyClassToSelector('pure-button-primary', '#helper-output');
                    
                    output.style.cssText = 'padding: 15px; margin-top: 10px; border-radius: 5px; font-weight: bold;';
                    output.innerHTML = 'Class "pure-button-primary" applied to this element!';
                    
                    notyf.success('CSS class applied successfully!');
                    
                    // Reset after 3 seconds
                    setTimeout(() => {
                        output.className = '';
                        output.style.cssText = 'margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; min-height: 50px;';
                        output.innerHTML = 'Output will appear here...';
                    }, 3000);
                }
                
                // Add a global event listener demo
                window.addGlobalEventListener('keydown', (event) => {
                    if (event.key === 'F1') {
                        event.preventDefault();
                        notyf.open({
                            type: 'info',
                            message: 'F1 Help: This demo shows all available injected libraries!',
                            background: '#2196f3',
                            duration: 4000
                        });
                    }
                });
                
                console.log('Injected Libraries Demo loaded successfully!');
                console.log('Available libraries:', {
                    Notyf: typeof Notyf !== 'undefined',
                    hljs: typeof hljs !== 'undefined',
                    ace: typeof ace !== 'undefined',
                    Split: typeof Split !== 'undefined'
                });
            </script>
        `;
    }
}
