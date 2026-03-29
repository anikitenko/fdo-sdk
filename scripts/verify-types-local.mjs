import fs from "node:fs";
import path from "node:path";
import { verifyDeclaredTypePathsExist, verifyTypeArtifactsExist } from "./lib/verify-types-pack-lib.mjs";

const packageJsonPath = path.resolve("package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

verifyDeclaredTypePathsExist(packageJson);
verifyTypeArtifactsExist();

console.log("Verified local declaration artifacts and package type pointers.");
