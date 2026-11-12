import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

export const sha256 = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
export const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
export const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, "utf8"));

export async function writeOnce(path: string, bytes: Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: "wx" });
}

export async function jsonFiles(root: string): Promise<string[]> {
  if ((await lstat(root)).isSymbolicLink()) throw new Error("Data-store roots must not be symlinks");
  const result: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Symlinks are not permitted in the data store");
    if (entry.isDirectory()) result.push(...await jsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) result.push(path);
  }
  return result.sort();
}

export async function archiveFile(root: string, path: string): Promise<Buffer> {
  const resolvedRoot = await realpath(root);
  const target = resolve(resolvedRoot, path);
  if (!target.startsWith(`${resolvedRoot}${sep}`)) throw new Error("Artifact path escapes the evidence archive");
  const actual = await realpath(target);
  if (actual !== target || !actual.startsWith(`${resolvedRoot}${sep}`) || (await lstat(target)).isSymbolicLink()) throw new Error("Evidence symlinks are not permitted");
  if (relative(resolvedRoot, actual).startsWith("..")) throw new Error("Invalid evidence path");
  return readFile(actual);
}
