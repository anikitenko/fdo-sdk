const path = require("path");
const { Project } = require("ts-morph");
const { sources: { RawSource }, Compilation } = require("webpack");

class DOMMetadataPlugin {
    constructor(options = {}) {
        this.srcDir = options.srcDir || "src";
        this.outFile = options.outFile || "dom-metadata.json";
    }

    /**
     * Generate AI-related metadata for a class
     * This includes usage hints, common patterns, and AI-friendly descriptions
     */
    generateAIMetadata(className, constructors, methods) {
        return {
            className,
            // Generate a concise summary
            summary: this.generateSummary(className, constructors, methods),
            // Identify common use cases
            commonUseCases: this.identifyCommonUseCases(className, methods),
            // Extract method signatures in AI-friendly format
            methodSignatures: this.generateMethodSignatures(methods),
            // Identify relationships with other classes
            relatedClasses: this.identifyRelatedClasses(className, methods),
            // Generate quick reference
            quickReference: this.generateQuickReference(className, constructors, methods)
        };
        
    }
    
    generateSummary(className, constructors, methods) {
        const constructorDesc = constructors.length > 0 ? constructors[0].description : "";
        const publicMethodCount = methods.filter(m => !m.uiSkip).length;
        
        return {
            description: constructorDesc || `${className} is a DOM helper class for creating HTML elements.`,
            methodCount: methods.length,
            publicMethodCount,
            hasExamples: methods.some(m => m.example)
        };
    }
    
    identifyCommonUseCases(className, methods) {
        const useCases = [];
        
        // Check for common patterns in methods
        if (methods.some(m => m.name.includes('Style') || m.name.includes('Class'))) {
            useCases.push("styling");
        }
        if (methods.some(m => m.name.includes('create') || m.name.includes('Create'))) {
            useCases.push("element-creation");
        }
        if (methods.some(m => m.name.includes('render') || m.name.includes('Render'))) {
            useCases.push("rendering");
        }
        if (methods.some(m => m.example?.includes('form') || m.description?.toLowerCase().includes('form'))) {
            useCases.push("form-handling");
        }
        
        return useCases;
    }
    
    generateMethodSignatures(methods) {
        return methods.map(method => {
            const params = method.parameters.map(p => 
                `${p.name}${p.optional ? '?' : ''}: ${p.type}`
            ).join(', ');
            
            return {
                name: method.name,
                signature: `${method.name}(${params})`,
                hasExample: !!method.example,
                isPublic: !method.uiSkip
            };
        });
    }
    
    identifyRelatedClasses(className, methods) {
        const related = new Set();
        
        // Check method return types and parameters for DOM class references
        methods.forEach(method => {
            method.parameters.forEach(param => {
                if (param.type.startsWith('DOM')) {
                    related.add(param.type);
                }
            });
            
            if (method.returns?.includes('DOM')) {
                const match = method.returns.match(/DOM\w+/g);
                if (match) {
                    match.forEach(cls => related.add(cls));
                }
            }
        });
        
        return Array.from(related);
    }
    
    generateQuickReference(className, constructors, methods) {
        const reference = {
            className,
            constructorExample: "",
            topMethods: []
        };
        
        // Get constructor example if available
        if (constructors.length > 0 && constructors[0].parameters) {
            const params = constructors[0].parameters.map(p => 
                p.optional ? `${p.name}?` : p.name
            ).join(', ');
            reference.constructorExample = `new ${className}(${params})`;
        }
        
        // Get top 3-5 most useful methods (those with examples or uiName)
        reference.topMethods = methods
            .filter(m => m.example || m.uiName)
            .slice(0, 5)
            .map(m => ({
                name: m.name,
                displayName: m.uiName || m.name,
                example: m.example
            }));
        
        return reference;
    }

    /** @param {import('webpack').Compiler} compiler */
    apply(compiler) {
        compiler.hooks.thisCompilation.tap("Plugin", (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: "Plugin",
                    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
                },
                () => {
                    try {
                        const project = new Project({
                            tsConfigFilePath: path.resolve(__dirname, "tsconfig.json"),
                        });

                        const sourceFiles = project.getSourceFiles(`${this.srcDir}/**/*.ts`);
                        const result = [];

                        for (const sourceFile of sourceFiles) {
                            const classes = sourceFile.getClasses().filter(cls => cls.getName()?.startsWith("DOM"));

                            for (const cls of classes) {
                                const className = cls.getName();
                                const constructors = cls.getConstructors()
                                    .map(ctor => {
                                        const jsDoc = ctor.getJsDocs()[0];
                                        const description = jsDoc?.getComment() || "";

                                        const paramTags = {};
                                        const extraTags = {};

                                        jsDoc?.getTags().forEach(tag => {
                                            const tagName = tag.getTagName();
                                            const struct = tag.getStructure();

                                            if (tagName === "param") {
                                                let rawText = tag.getText();
                                                if (Array.isArray(rawText)) {
                                                    rawText = rawText.map(t => (typeof t === "string" ? t : t.getText())).join(" ");
                                                }

                                                rawText = rawText
                                                    .replace(/^@param\s+/i, "")
                                                    .replace(/\*\s*$/, "")
                                                    .replace(/\s+/g, " ")
                                                    .trim();

                                                const match = rawText.match(/^([\w$]+)\s*(?:[-:–]\s*)?(.*)$/);
                                                if (match) {
                                                    const [, paramName, paramDesc] = match;
                                                    paramTags[paramName] = paramDesc || "";
                                                } else {
                                                    console.warn(`⚠️ Could not parse @param: "${rawText}"`);
                                                }
                                            } else {
                                                // Handle @constructor and other custom tags
                                                extraTags[tagName] = struct.text?.replace("-", "").trim?.() || true;
                                            }
                                        });

                                        const parameters = ctor.getParameters().map(param => ({
                                            name: param.getName(),
                                            type: param.getType().getText(param).replace(/import\("[^"]+"\)\./g, ""),
                                            optional: param.isOptional(),
                                            rest: param.isRestParameter(),
                                            description: paramTags[param.getName()] || ""
                                        }));

                                        return {
                                            constructor: true,
                                            description,
                                            parameters,
                                            ...extraTags
                                        };
                                    });
                                const methods = cls.getMethods()
                                    .filter(method => method.getScope() === "public")
                                    .map(method => {
                                        const name = method.getName();
                                        const jsDoc = method.getJsDocs()[0];
                                        const description = jsDoc?.getComment() || "";

                                        const paramTags = {};
                                        const extraTags = {};

                                        jsDoc?.getTags().forEach(tag => {
                                            const tagName = tag.getTagName();
                                            const struct = tag.getStructure();

                                            if (tagName === "param") {
                                                const rawText = struct.text || "";
                                                const match = rawText.match(/^(\w+)\s*[-:–]?\s*(.*)$/);
                                                if (match) {
                                                    const [, paramName, paramDesc] = match;
                                                    paramTags[paramName] = paramDesc || "";
                                                }
                                            } else if (tagName === "returns") {
                                                extraTags["returns"] = struct.text || "";
                                            } else {
                                                extraTags[tagName] = struct.text || true;
                                            }
                                        });

                                        const parameters = method.getParameters().map(param => ({
                                            name: param.getName(),
                                            type: param.getType().getText(param).replace(/import\("[^"]+"\)\./g, ""),
                                            description: paramTags[param.getName()] || "",
                                            optional: param.isOptional(),
                                            rest: param.isRestParameter()
                                        }));

                                        if (typeof extraTags.example === "string") {
                                            extraTags.example = extraTags.example.replace(/<caption>[\s\S]*?<\/caption>/g, "").trim()
                                                .replace(new RegExp(`(?<![.\\w])${name}\\(`, "g"), `new ${className}().${name}(`);
                                        }
                                        return {
                                            name,
                                            description,
                                            parameters,
                                            ...extraTags,
                                            returnType: method.getReturnType().getText(method),
                                        };
                                    });

                                // Generate AI-related metadata
                                const aiMetadata = this.generateAIMetadata(className, constructors, methods);
                                
                                result.push({
                                    className, 
                                    constructors, 
                                    methods,
                                    aiMetadata
                                });
                            }
                        }

                        const json = JSON.stringify(result, null, 2);

                        compilation.emitAsset(this.outFile, new RawSource(json));
                        const contract = {
                            contractVersion: "1.0.0",
                            sdkVersion: require("./package.json").version,
                            valueKinds: {
                                "html-string": "Trusted serialized markup, never an Element. Text helpers escape content; composition helpers accept trusted HTML.",
                                "class-name-string": "CSS class token; pass through classes or class attributes, not as markup.",
                                "animation-name-string": "CSS animation name; use in animation/animationName declarations.",
                                "render-on-load-module": "Frontend source descriptor; never execute for static preview or in the backend.",
                                "dom-element": "Browser Element obtained only in frontend behavior; DOM builders do not return this kind."
                            },
                            styleOwnership: {
                                default: "Legacy shared Goober sheet, drained by renderHTML; cross-instance isolation is not guaranteed.",
                                isolated: "Call collector.collectStylesFrom(...helpers) before composition. Only attached instances contribute. renderHTML retains and emits the deduplicated sheet on every render.",
                                lifetime: "One collector and fresh helpers per plugin/view. Release references at teardown; replace the collector to reset styles."
                            },
                            lifecycle: {
                                key: "Use a unique stable lifecycleKey per frontend instance; identical generated options otherwise share an implicit key.",
                                teardown: "disposeRenderOnLoadActions(window, key) before replacing markup; pagehide also disposes. Setup may return cleanup synchronously or asynchronously.",
                                diagnostics: "onDiagnostic receives code, phase, message and remediation once per distinct failure per initialization. Strict throws synchronous initialization failures; handler and asynchronous failures are reported without unhandled rejections."
                            },
                            preview: { backendExecution: false, frontendExecution: false, inlineHandlers: false, policy: "Interpret allowlisted composition calls from authored source in a sandbox with isolated style owners; preserve source and unsupported expressions. Never evaluate arbitrary plugin code." },
                            classes: result.map(entry => ({
                                name: entry.className,
                                extends: entry.className === "DOM" ? null : "DOM",
                                constructors: entry.constructors,
                                methods: entry.methods.map(method => {
                                    const name = method.name;
                                    const kind = name === "createClassFromStyle" ? "class-name-string"
                                        : name === "createStyleKeyframe" ? "animation-name-string"
                                        : name === "collectStylesFrom" ? "style-collector"
                                        : ["combineProperties", "mergeOptions"].includes(name) ? "properties"
                                        : ["createAttributes", "createOnAttributes"].includes(name) ? "attribute-string" : "html-string";
                                    const example = typeof method.example === "string" ? method.example.replace(/<caption>[\s\S]*?<\/caption>/g, "").trim()
                                        .replace(new RegExp(`(?<![.\\w])${name}\\(`, "g"), `new ${entry.className}().${name}(`) : null;
                                    return {
                                        name, parameters: method.parameters, returnType: method.returnType,
                                        returnKind: kind,
                                        compositionArguments: method.parameters.filter(p => ["children", "element", "content", "label", "styleObj", "keyframe", "helpers", "defaultClass", "onClick", "onChange"].includes(p.name)).map(p => ({
                                            name: p.name,
                                            kind: p.name === "content" ? "plain-text"
                                                : p.name === "styleObj" ? "style-map"
                                                : p.name === "keyframe" ? "keyframe-css-string"
                                                : p.name === "helpers" ? "style-collector"
                                                : p.name === "defaultClass" ? "class-name-string"
                                                : ["onClick", "onChange"].includes(p.name) ? "frontend-handler"
                                                : p.name === "label" && name === "createOptgroup" ? "attribute-value" : "trusted-html-string",
                                            rest: p.rest
                                        })),
                                        sideEffects: name === "collectStylesFrom" ? ["assign-style-owner"] : name === "renderHTML" ? ["emit-css", "legacy-drain-shared-styles", "emit-host-script-placeholder"] : ["createAttributes", "createOnAttributes", "createElement", "mergeOptions"].includes(name) ? [] : ["register-css"],
                                        staticPreviewSafe: !["createButton", "createOnAttributes", "collectStylesFrom"].includes(name),
                                        constraints: "Static preview requires validated literal props, no serialized event functions, trusted/sanitized fragments and an isolated style collector. IDs may be generated when omitted.",
                                        example,
                                    };
                                })
                            }))
                        };
                        compilation.emitAsset("dom-authoring-contract.json", new RawSource(JSON.stringify(contract, null, 2)));
                        compilation.emitAsset("dom-authoring-contract.schema.json", new RawSource(require("fs").readFileSync(path.resolve(__dirname, "scripts/dom-authoring-contract.schema.json"), "utf8")));
                    } catch (err) {
                        compilation.errors.push(new Error(`Error generating DOM metadata: ${err.message}`));
                    }
                }
            )
        })
    }
}

module.exports = DOMMetadataPlugin;
