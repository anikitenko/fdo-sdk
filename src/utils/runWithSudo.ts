import { dialog } from "electron";
import sudo from "@expo/sudo-prompt";
import { pify } from "./pify";

export interface SudoOptions {
    name?: string;
    icns?: string;
    env?: NodeJS.ProcessEnv;
    confirmMessage?: string;
}

/**
 * Runs a shell command with sudo privileges.
 */
export async function runWithSudo(
    command: string,
    options: SudoOptions = {}
): Promise<string> {
    const confirmed = await dialog.showMessageBox({
        type: "warning",
        buttons: ["Cancel", "Proceed"],
        defaultId: 1,
        cancelId: 0,
        title: "Permission Required",
        message: options.confirmMessage ?? "This operation requires privileged access.",
        detail: `The FDO Plugin: "${options.name ?? "Tool"}" is requesting elevated permissions.\n\nDo you want to proceed?`,
        noLink: true,
    });

    if (confirmed.response !== 1) {
        return ""
    }

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
        name: `FDO-Plugin`,
        icns: options.icns,
        env: options.env,
    });
}
