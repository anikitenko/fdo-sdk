const path = require("path");
const { Project } = require("ts-morph");
const { RawSource } = require("webpack-sources");

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
        const metadata = {
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
        
        return metadata;
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

    apply(compiler) {
        compiler.hooks.thisCompilation.tap("Plugin", (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: "Plugin",
                    stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
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
                                            type: param.getType().getText(),
                                            optional: param.isOptional(),
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
                                            type: param.getType().getText(),
                                            description: paramTags[param.getName()] || "",
                                            optional: param.isOptional()
                                        }));

                                        return {
                                            name,
                                            description,
                                            parameters,
                                            ...extraTags
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
                    } catch (err) {
                        console.error("❌ Error generating DOM metadata:", err);
                    }
                }
            )
        })
    }
}

module.exports = DOMMetadataPlugin;
