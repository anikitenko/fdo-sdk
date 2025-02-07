import * as path from "node:path";
import * as fs from "node:fs";

const getExampleContent: () => string = () :string => {
    const examplePath = path.resolve(__dirname, `example.txt`);
    return fs.readFileSync(examplePath, 'utf-8');
}

export const EXAMPLE: string = getExampleContent();
