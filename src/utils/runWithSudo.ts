import sudo from "@expo/sudo-prompt";
import { pify } from "./pify";

export interface SudoOptions {
    name?: string;
    icns?: string;
    env?: NodeJS.ProcessEnv;
}

/**
 * Runs a shell command with sudo privileges.
 */
export async function runWithSudo(
    command: string,
    options: SudoOptions = {}
): Promise<string> {
    const sudoExec = pify(
        (
            cmd: string,
            opts: any,
            cb: (
                error?: Error,
                stdout?: string | Buffer,
                stderr?: string | Buffer
            ) => void
        ) => sudo.exec(cmd, opts, cb)
    ) as (cmd: string, opts: any) => Promise<string>;

    return await sudoExec(command, {
        name: `FDO Plugin: ${options.name ?? "Tool"}`,
        icns: options.icns,
        env: options.env,
    });
}
