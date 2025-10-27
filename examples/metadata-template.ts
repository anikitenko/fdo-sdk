/**
 * Plugin Metadata Template
 * 
 * This template provides a reusable structure for plugin metadata.
 * Copy this template when creating your own plugin and customize the values.
 * 
 * Compatible with SDK v1.x
 */

import { PluginMetadata } from "@anikitenko/fdo-sdk";

/**
 * Example metadata structure for a plugin.
 * All fields are required by the FDOInterface.
 */
export const exampleMetadata: PluginMetadata = {
  name: "Example Plugin",
  
  version: "1.0.0",
  
  author: "Your Name",
  
  description: "A brief description of what this plugin does",
  
  icon: "icon.png"
};

/**
 * Usage example:
 * 
 * import { exampleMetadata } from "./metadata-template";
 * 
 * class MyPlugin extends FDO_SDK implements FDOInterface {
 *   private readonly _metadata: PluginMetadata = {
 *     ...exampleMetadata,
 *     name: "My Custom Plugin",
 *     description: "My plugin description"
 *   };
 *   
 *   get metadata(): PluginMetadata {
 *     return this._metadata;
 *   }
 * }
 */
