import { dialog } from "electron";
import sudo from "@expo/sudo-prompt";
import { runWithSudo } from "../../src";
import { pify } from "../../src/utils/pify";

// Mock electron dialog
jest.mock("electron", () => ({
  dialog: {
    showMessageBox: jest.fn(),
  },
}));

// Mock sudo-prompt
jest.mock("@expo/sudo-prompt", () => ({
  exec: jest.fn(),
}));

// Mock pify to return a function that returns a promise
jest.mock("../../src/utils/pify", () => ({
  pify: jest.fn().mockImplementation(() => {
    return (cmd: string, opts: any) => {
      return new Promise((resolve, reject) => {
        const mockExec = require("@expo/sudo-prompt").exec;
        const callback = (error: Error | null, stdout?: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        };
        mockExec(cmd, opts, callback);
      });
    };
  }),
}));

describe("runWithSudo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show a confirmation dialog with default message when no confirmMessage is provided", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello");

    // Verify dialog was shown with default message
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      message: "This operation requires privileged access.",
    }));
  });

  it("should show a confirmation dialog with custom message when confirmMessage is provided", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello", { confirmMessage: "Custom message" });

    // Verify dialog was shown with custom message
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      message: "Custom message",
    }));
  });

  it("should use the provided name in the dialog detail", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello", { name: "Test Plugin" });

    // Verify dialog was shown with the plugin name
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.stringContaining("Test Plugin"),
    }));
  });

  it("should use 'Tool' as the default name if none is provided", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello");

    // Verify dialog was shown with the default name
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.stringContaining("Tool"),
    }));
  });

  it("should return an empty string if the user cancels the dialog", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Cancel"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 0 });

    const result = await runWithSudo("echo hello");

    // Verify sudo.exec was not called
    expect(sudo.exec).not.toHaveBeenCalled();

    // Verify an empty string was returned
    expect(result).toBe("");
  });

  it("should pass the command and options to sudo.exec", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    const options = {
      name: "Test Plugin",
      icns: "test.icns",
      env: { TEST_ENV: "value" },
    };

    await runWithSudo("echo hello", options);

    // Verify sudo.exec was called with the correct arguments
    expect(sudo.exec).toHaveBeenCalledWith(
      "echo hello",
      expect.objectContaining({
        name: "FDO-Plugin",
        icns: "test.icns",
        env: { TEST_ENV: "value" },
      }),
      expect.any(Function)
    );
  });

  it("should return the stdout from sudo.exec", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    const result = await runWithSudo("echo hello");

    // Verify the correct result was returned
    expect(result).toBe("Command executed successfully");
  });

  it("should throw an error if sudo.exec fails", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with an error
    const error = new Error("Command failed");
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(error);
    });

    // Expect the function to throw an error
    await expect(runWithSudo("echo hello")).rejects.toThrow("Command failed");
  });

  it("should verify all dialog configuration properties", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello");

    // Verify all dialog configuration properties
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      type: "warning",
      buttons: ["Cancel", "Proceed"],
      defaultId: 1,
      cancelId: 0,
      title: "Permission Required",
      message: "This operation requires privileged access.",
      noLink: true,
    }));
  });

  it("should handle empty command gracefully", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "");
    });

    const result = await runWithSudo("");

    // Verify sudo.exec was called with empty command
    expect(sudo.exec).toHaveBeenCalledWith(
      "",
      expect.any(Object),
      expect.any(Function)
    );

    // Verify empty result was returned
    expect(result).toBe("");
  });

  it("should pass only icns option when only icns is provided", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello", { icns: "test.icns" });

    // Verify sudo.exec was called with the correct arguments
    expect(sudo.exec).toHaveBeenCalledWith(
      "echo hello",
      expect.objectContaining({
        name: "FDO-Plugin",
        icns: "test.icns",
      }),
      expect.any(Function)
    );
  });

  it("should pass only env option when only env is provided", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    const env = { TEST_ENV: "value" };
    await runWithSudo("echo hello", { env });

    // Verify sudo.exec was called with the correct arguments
    expect(sudo.exec).toHaveBeenCalledWith(
      "echo hello",
      expect.objectContaining({
        name: "FDO-Plugin",
        env,
      }),
      expect.any(Function)
    );
  });

  it("should format the detail message correctly with plugin name", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello", { name: "Test Plugin" });

    // Verify the exact format of the detail message
    expect(dialog.showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      detail: `The FDO Plugin: "Test Plugin" is requesting elevated permissions.\n\nDo you want to proceed?`,
    }));
  });
  it("should call pify with sudo.exec function", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Mock sudo.exec to call the callback with a success result
    (sudo.exec as jest.Mock).mockImplementation((cmd, opts, cb) => {
      cb(null, "Command executed successfully");
    });

    await runWithSudo("echo hello");

    // Verify pify was called with a function that calls sudo.exec
    expect(pify).toHaveBeenCalled();
    const pifyArg = (pify as jest.Mock).mock.calls[0][0];
    expect(typeof pifyArg).toBe("function");

    // Call the function passed to pify to verify it calls sudo.exec
    const callback = jest.fn();
    pifyArg("test command", { test: "options" }, callback);
    expect(sudo.exec).toHaveBeenCalledWith("test command", { test: "options" }, callback);
  });

  it("should call the promisified function with correct arguments", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Create a spy for the promisified function
    const promisifiedFn = jest.fn().mockResolvedValue("Command executed successfully");
    (pify as jest.Mock).mockReturnValue(promisifiedFn);

    const options = {
      name: "Test Plugin",
      icns: "test.icns",
      env: { TEST_ENV: "value" },
    };

    await runWithSudo("echo hello", options);

    // Verify the promisified function was called with correct arguments
    expect(promisifiedFn).toHaveBeenCalledWith("echo hello", {
      name: "FDO-Plugin",
      icns: "test.icns",
      env: { TEST_ENV: "value" },
    });
  });

  it("should format the options correctly for sudoExec", async () => {
    // Mock dialog.showMessageBox to return a response indicating "Proceed"
    (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });

    // Create a spy for the promisified function
    const promisifiedFn = jest.fn().mockResolvedValue("Command executed successfully");
    (pify as jest.Mock).mockReturnValue(promisifiedFn);

    // Test with partial options
    await runWithSudo("echo hello", { icns: "test.icns" });

    // Verify options are formatted correctly
    expect(promisifiedFn).toHaveBeenCalledWith("echo hello", {
      name: "FDO-Plugin",
      icns: "test.icns",
      env: undefined,
    });
  });
});
