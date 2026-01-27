#!/usr/bin/env tsx

import * as fs from "fs";
import * as path from "path";
import { analyzeCodebase } from "../lib/analyzer";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npm run analyze <project-path>");
    console.error("Example: npm run analyze /path/to/your/project");
    process.exit(1);
  }

  const projectPath = path.resolve(args[0]);

  if (!fs.existsSync(projectPath)) {
    console.error(`Error: Project path does not exist: ${projectPath}`);
    process.exit(1);
  }

  if (!fs.statSync(projectPath).isDirectory()) {
    console.error(`Error: Project path is not a directory: ${projectPath}`);
    process.exit(1);
  }

  console.log(`\n🔍 Analyzing codebase: ${projectPath}\n`);

  const result = await analyzeCodebase(projectPath);

  // Print summary
  console.log("📁 API Routes:", result.routes?.routes.length || 0);
  console.log("🧩 Components:", result.components?.components.length || 0);
  console.log("🗃️  Models:", result.models?.models.length || 0);
  console.log("🔗 Files:", result.dependencies?.nodes.length || 0);
  console.log("🔗 Imports:", result.dependencies?.edges.length || 0);

  // Write output files
  const outputDir = path.join(__dirname, "..", "public", "data");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write individual files
  if (result.routes) {
    fs.writeFileSync(path.join(outputDir, "routes.json"), JSON.stringify(result.routes, null, 2));
  }
  if (result.components) {
    fs.writeFileSync(path.join(outputDir, "components.json"), JSON.stringify(result.components, null, 2));
  }
  if (result.models) {
    fs.writeFileSync(path.join(outputDir, "models.json"), JSON.stringify(result.models, null, 2));
  }
  if (result.dependencies) {
    fs.writeFileSync(path.join(outputDir, "dependencies.json"), JSON.stringify(result.dependencies, null, 2));
  }

  // Write combined result
  fs.writeFileSync(path.join(outputDir, "analysis.json"), JSON.stringify(result, null, 2));

  console.log(`\n✅ Analysis complete! Output written to ${outputDir}`);
  console.log("\nRun 'npm run dev' to view the dashboard.");
}

main().catch((err) => {
  console.error("Analysis failed:", err);
  process.exit(1);
});
