import { exec } from "child_process";
import path from "path";
import fs from "fs";

export interface AgoraCliStatus {
  installed: boolean;
  version?: string;
  authenticated?: boolean;
  error?: string;
}

export class AgoraCli {
  private static getBinaryPath(): string {
    const candidate1 = path.resolve(process.cwd(), "agora_bin", "agora.exe");
    const candidate2 = path.resolve(process.cwd(), "..", "agora_bin", "agora.exe");
    if (fs.existsSync(candidate1)) return candidate1;
    if (fs.existsSync(candidate2)) return candidate2;
    return "agora";
  }

  public static async getVersion(): Promise<string> {
    const bin = this.getBinaryPath();
    return new Promise((resolve, reject) => {
      exec(`"${bin}" --version`, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout.trim());
      });
    });
  }

  public static async checkAuth(): Promise<{ authenticated: boolean; details: string }> {
    const bin = this.getBinaryPath();
    return new Promise((resolve) => {
      exec(`"${bin}" whoami`, (err, stdout) => {
        if (err || !stdout.includes("authenticated : yes") && !stdout.includes("Authenticated : yes")) {
          return resolve({ authenticated: false, details: stdout.trim() || (err ? err.message : "Not authenticated") });
        }
        resolve({ authenticated: true, details: stdout.trim() });
      });
    });
  }

  public static async diagnoseProject(projectId: string = "ET27CbgaO", feature: string = "convoai"): Promise<{ ready: boolean; summary: string }> {
    const bin = this.getBinaryPath();
    return new Promise((resolve) => {
      exec(`"${bin}" project doctor ${projectId} --feature ${feature}`, (err, stdout, stderr) => {
        const output = stdout + stderr;
        const isReady = output.includes("ready for CONVOAI") || output.includes("Ready");
        resolve({ ready: isReady, summary: output.trim() });
      });
    });
  }
}
