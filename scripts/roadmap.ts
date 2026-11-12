import { readFile, writeFile } from "node:fs/promises";
import { renderRoadmap } from "./roadmap-content.ts";

const content = renderRoadmap();
if (process.argv.includes("--check")) {
  if (await readFile("ROADMAP.md", "utf8") !== content) {
    console.error("ROADMAP.md is out of date. Run node scripts/roadmap.ts.");
    process.exitCode = 1;
  } else console.info("ROADMAP.md matches the typed configuration and translations.");
} else {
  await writeFile("ROADMAP.md", content);
  console.info("Updated ROADMAP.md from the typed configuration and translations.");
}
