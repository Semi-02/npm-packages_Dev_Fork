import { execSync } from 'node:child_process';
import path from "node:path";
import * as fs from "node:fs/promises"
import { EscapeToVariableName2, StringBuilderImpl } from '@klaus-liebler/commons';
import * as npm from "./npm"

export async function flatbuffers_generate(options: string, inputFile: string, outputBaseDir: string) {
  const cmd = `flatc ${options} -o "${outputBaseDir}" "${inputFile}"`
  execSync(cmd, {
    env: process.env
  });
}

export async function flatbuffers_generate_c(sourceDirs: Array<string>, destDir: string) {
  for(const sourceDir of sourceDirs){
    for (const file of (await fs.readdir(sourceDir)).filter(e => e.endsWith(".fbs"))) {
      const inputFile = path.join(sourceDir, file);
      await flatbuffers_generate("-c --gen-all", inputFile, destDir);
    }
  }
}

export async function flatbuffers_generate_ts(sourceDirs: Array<string>, destDir:string) {
  const sb = new StringBuilderImpl();
  for(const sourceDir of sourceDirs){
    for (const file of (await fs.readdir(sourceDir)).filter(e => e.endsWith(".fbs"))) {
      const inputFile = path.join(sourceDir, file);
      const parsed=path.parse(file)
      await flatbuffers_generate("-T --gen-all --ts-no-import-ext", inputFile, destDir);
      sb.AppendLine(`export * as ${EscapeToVariableName2(parsed.name)} from "./${parsed.name}"`)
    }
  }
  npm.CreateAndInstallNpmProjectLazily(
    destDir,
    {
      "name": `@generated/flatbuffers_ts`,
      "version": "1.0.0",
      "author": "@klaus-liebler/espidf-vite-secure-build-tools",
      "license": "No License",
      "description": "Generated during build from the terrific @klaus-liebler/espidf-vite-secure-build-tools",
      "dependencies": {
        "flatbuffers": "25.1.24"
      }
    }
  )
}