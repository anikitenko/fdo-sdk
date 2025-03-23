const path = require("path");
const { Project } = require("ts-morph");
const { RawSource } = require("webpack-sources");

class DOMMetadataPlugin {
    constructor(options = {}) {
        this.srcDir = options.srcDir || "src";
        this.outFile = options.outFile || "dom-metadata.json";
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
                                    .filter(ctor => ctor.getBody())
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

                                result.push({className, constructors, methods});
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
