import {
    PluginRegistry, SecretStore, SSHClient, HostServiceError,
    createSecretsCapabilityBundle, createSSHCapabilityBundle,
    describeCapability, runCapabilityPreflight, validatePluginInitPayload,
} from "../../src";
import { resetCapabilityStateForTests } from "../../src/utils/capabilities";

const secrets = new SecretStore();
const ssh = new SSHClient();
const execResult = { stdout: "ok", stderr: "", exitCode: 0, signal: null, durationMs: 5, truncated: false };

beforeEach(() => {
    resetCapabilityStateForTests();
    PluginRegistry.configureHostServices(null);
});
afterEach(() => {
    vi.unstubAllGlobals();
    PluginRegistry.configureHostServices(null);
    resetCapabilityStateForTests();
});

function configure(request = vi.fn().mockResolvedValue(execResult)) {
    PluginRegistry.configureCapabilities({ granted: [
        ...createSecretsCapabilityBundle(["get", "set", "delete", "list", "use"]),
        ...createSSHCapabilityBundle(),
    ] });
    PluginRegistry.configureHostServices({ request });
    return request;
}

test("fails closed without a host, even when capabilities were granted", async () => {
    configure();
    PluginRegistry.configureHostServices(null);
    await expect(secrets.get("token")).rejects.toThrow("unavailable");
});

test.each(["get", "set", "delete", "list"] as const)("requires separate secrets.%s permission before calling host", async operation => {
    const transport = configure();
    PluginRegistry.configureCapabilities({ granted: ["secrets.use"] });
    const call = operation === "set" ? secrets.set("key", "value")
        : operation === "list" ? secrets.list() : secrets[operation]("key");
    await expect(call).rejects.toThrow(`secrets.${operation}`);
    expect(transport).not.toHaveBeenCalled();
});

test.each([{ granted: [] }, { granted: ["secrets.use"] }, { granted: ["ssh.exec"] }, { granted: ["ssh.exec", "secrets.use"] }, { granted: ["ssh.exec", "secrets.consume"] }, { granted: ["ssh.use", "secrets.use", "secrets.consume"] }, { granted: ["ssh.exec", "secrets.use", "secrets.consume"] }] as const)("SSH requires execution, base secret access and secret consumption grants: %j", async ({ granted }) => {
    const transport = configure();
    PluginRegistry.configureCapabilities({ granted: [...granted] });
    await expect(ssh.exec({ profileId: "prod", command: "uptime" })).rejects.toThrow("Capability");
    expect(transport).not.toHaveBeenCalled();
});

test("secret lifecycle uses backend transport; missing is distinct from an empty value", async () => {
    const request = configure(vi.fn()
        .mockResolvedValueOnce({ stored: true })
        .mockResolvedValueOnce({ value: "" })
        .mockResolvedValueOnce({ value: null })
        .mockResolvedValueOnce({ deleted: true })
        .mockResolvedValueOnce({ deleted: false }));
    await secrets.set("api-token", "");
    await expect(secrets.get("api-token")).resolves.toBe("");
    await expect(secrets.get("missing")).resolves.toBeNull();
    await expect(secrets.delete("api-token")).resolves.toBe(true);
    await expect(secrets.delete("api-token")).resolves.toBe(false);
    expect(request).toHaveBeenNthCalledWith(1, { action: "secrets.set", payload: { key: "api-token", value: "" } });
    expect(secrets.ref("key")).toEqual({ kind: "secret", key: "key" });
    expect(Object.isFrozen(secrets.ref("key"))).toBe(true);
});

test("metadata and profiles drop extra properties including secret values", async () => {
    configure(vi.fn().mockResolvedValueOnce({ entries: [{ key: "key", updatedAt: "2026-10-17T00:00:00Z", value: "SECRET" }] })
        .mockResolvedValueOnce({ profiles: [{ id: "prod", label: "Production", password: "SECRET" }] }));
    await expect(secrets.list()).resolves.toEqual([{ key: "key", updatedAt: "2026-10-17T00:00:00Z" }]);
    await expect(ssh.listProfiles()).resolves.toEqual([{ id: "prod", label: "Production" }]);
});

test.each(["", "../key", "with space", "key/child", "a".repeat(129)])("rejects invalid secret keys %j before transport", async key => {
    const request = configure();
    await expect(secrets.set(key, "SECRET")).rejects.toThrow("Secret key");
    expect(() => secrets.ref(key)).toThrow("Secret key");
    expect(request).not.toHaveBeenCalled();
});

test("SSH sends defaults and only approved fields; nonzero remote exit is a result", async () => {
    const request = configure(vi.fn().mockResolvedValue({ ...execResult, exitCode: 1, stderr: "failed" }));
    const result = await ssh.exec({ profileId: "prod", command: "false", password: "SECRET" } as never);
    expect(result.exitCode).toBe(1);
    expect(request).toHaveBeenCalledWith({ action: "ssh.exec", payload: {
        profileId: "prod", command: "false", timeoutMs: 30_000, maxOutputBytes: 1_048_576,
    } });
});

test.each([{ profileId: "", command: "x" }, { profileId: "p", command: "\0" },
    { profileId: "p", command: "x", timeoutMs: -1 }, { profileId: "p", command: "x", maxOutputBytes: Infinity }])(
    "rejects invalid SSH options before transport: %j", async options => {
        const request = configure();
        await expect(ssh.exec(options)).rejects.toThrow();
        expect(request).not.toHaveBeenCalled();
    });

test("host errors expose stable codes without leaking messages or payloads", async () => {
    configure(vi.fn().mockRejectedValue({ code: "LOCKED", message: "SECRET" }));
    await expect(secrets.get("token")).rejects.toMatchObject({ code: "LOCKED", message: "Host service request failed (LOCKED)." });
    configure(vi.fn().mockRejectedValue(new Error("SECRET")));
    await expect(secrets.get("token")).rejects.toBeInstanceOf(HostServiceError);
});

test("malformed host responses cannot become missing secrets or successful commands", async () => {
    configure(vi.fn().mockResolvedValue({ value: undefined, message: "SECRET" }));
    await expect(secrets.get("token")).rejects.toThrow("Invalid host service response.");
    await expect(ssh.exec({ profileId: "prod", command: "x" })).rejects.toThrow("Invalid host service response.");
});

test("iframe access and cleared transports fail before calling the host", async () => {
    const request = configure();
    vi.stubGlobal("window", {});
    await expect(secrets.get("token")).rejects.toThrow("backend runtime");
    expect(request).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    PluginRegistry.clearPlugin();
    await expect(secrets.get("token")).rejects.toThrow("unavailable");
});

test("new capabilities participate in initialization validation and preflight", () => {
    expect(createSecretsCapabilityBundle(["get", "get"])).toEqual(["secrets.get", "secrets.use"]);
    expect(() => createSecretsCapabilityBundle([])).toThrow();
    expect(describeCapability("ssh.exec").category).toBe("ssh");
    expect(describeCapability("secrets.get").category).toBe("secrets");
    expect(runCapabilityPreflight({ declared: ["ssh.exec"], granted: [] }).missing[0].requiredCapabilities)
        .toEqual(["secrets.consume", "secrets.use", "ssh.exec", "ssh.use"]);
    expect(() => validatePluginInitPayload({ capabilities: createSSHCapabilityBundle() })).not.toThrow();
});

test("SSH can use host credential references without permission to read plaintext", async () => {
    const request = configure();
    PluginRegistry.configureCapabilities({ granted: ["ssh.use", "ssh.exec", "secrets.use", "secrets.consume"] });
    await expect(ssh.exec({ profileId: "prod", command: "uptime", timeoutMs: 500, maxOutputBytes: 100 }))
        .resolves.toEqual(execResult);
    await expect(secrets.get("key")).rejects.toThrow("secrets.get");
    expect(request).toHaveBeenCalledTimes(1);
});

test("profile listing has its own permission", async () => {
    const request = configure();
    PluginRegistry.configureCapabilities({ granted: ["ssh.use", "ssh.exec", "secrets.use", "secrets.consume"] });
    await expect(ssh.listProfiles()).rejects.toThrow("ssh.profiles.list");
    expect(request).not.toHaveBeenCalled();
});

test("clearing a worker invalidates its in-flight secret response", async () => {
    let resolve!: (value: unknown) => void;
    configure(vi.fn().mockImplementation(() => new Promise(done => { resolve = done; })));
    const pending = secrets.get("key");
    PluginRegistry.configureHostServices(null);
    resolve({ value: "SECRET" });
    await expect(pending).rejects.toMatchObject({ code: "UNAVAILABLE" });
});

test("rejects malformed acknowledgements and metadata", async () => {
    configure(vi.fn().mockResolvedValueOnce({ stored: false })
        .mockResolvedValueOnce({ deleted: "yes" })
        .mockResolvedValueOnce({ entries: [{ key: "key", updatedAt: "invalid" }] })
        .mockResolvedValueOnce({ profiles: [{ id: "p" }] }));
    await expect(secrets.set("key", "value")).rejects.toThrow("Invalid host service response");
    await expect(secrets.delete("key")).rejects.toThrow("Invalid host service response");
    await expect(secrets.list()).rejects.toThrow("Invalid host service response");
    await expect(ssh.listProfiles()).rejects.toThrow("Invalid host service response");
});

test.each(["get", "set", "delete", "list"] as const)("secrets.%s alone cannot bypass the base secrets.use permission", async operation => {
    const transport = configure();
    PluginRegistry.configureCapabilities({ granted: [`secrets.${operation}`] });
    const call = operation === "set" ? secrets.set("key", "value")
        : operation === "list" ? secrets.list() : secrets[operation]("key");
    await expect(call).rejects.toThrow("secrets.use");
    expect(transport).not.toHaveBeenCalled();
});

test("secret operation preflight identifies the base permission", () => {
    expect(createSecretsCapabilityBundle(["get", "list"])).toEqual(["secrets.get", "secrets.list", "secrets.use"]);
    const report = runCapabilityPreflight({ declared: ["secrets.get"], granted: [] });
    expect(report.missing[0].requiredCapabilities).toEqual(["secrets.get", "secrets.use"]);
    expect(report.missing[0].missingPrerequisites).toEqual(["secrets.use"]);
});

test.each([
    { granted: ["ssh.use"] },
    { granted: ["ssh.profiles.list"] },
] as const)("SSH profile listing requires base and operation grants: %j", async ({ granted }) => {
    const transport = configure();
    PluginRegistry.configureCapabilities({ granted: [...granted] });
    await expect(ssh.listProfiles()).rejects.toThrow("Capability");
    expect(transport).not.toHaveBeenCalled();
});

test("SSH profile listing needs no secret access when both SSH permissions are granted", async () => {
    configure(vi.fn().mockResolvedValue({ profiles: [{ id: "prod", label: "Production" }] }));
    PluginRegistry.configureCapabilities({ granted: ["ssh.use", "ssh.profiles.list"] });
    await expect(ssh.listProfiles()).resolves.toEqual([{ id: "prod", label: "Production" }]);
    expect(runCapabilityPreflight({ declared: ["ssh.profiles.list"], granted: [] }).missing[0].requiredCapabilities)
        .toEqual(["ssh.profiles.list", "ssh.use"]);
    expect(describeCapability("ssh.use").category).toBe("ssh");
});
