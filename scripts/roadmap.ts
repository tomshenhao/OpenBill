import { readFile, writeFile } from "node:fs/promises";
import { renderRoadmap, updateReadmeModules } from "./roadmap-content.ts";

const readme = await readFile("README.md", "utf8");
const files = { "ROADMAP.md": renderRoadmap(), "README.md": updateReadmeModules(readme) };
if (process.argv.includes("--check")) {
  for (const [path, content] of Object.entries(files)) {
    if (await readFile(path, "utf8") !== content) {
      console.error(`${path} is out of date. Run node scripts/roadmap.ts.`);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode) console.info("ROADMAP.md and the README module table match the configuration and translations.");
} else {
  for (const [path, content] of Object.entries(files)) {
    if (await readFile(path, "utf8") !== content) await writeFile(path, content);
  }
  console.info("Generated ROADMAP.md and the README module table from the configuration and translations.");
}
