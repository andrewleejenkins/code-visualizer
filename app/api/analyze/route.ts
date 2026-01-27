import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { analyzeCodebase } from "@/lib/analyzer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath || typeof projectPath !== "string") {
      return NextResponse.json(
        { error: "Project path is required" },
        { status: 400 }
      );
    }

    const resolvedPath = path.resolve(projectPath);

    // Validate path exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `Path does not exist: ${resolvedPath}` },
        { status: 400 }
      );
    }

    // Validate it's a directory
    if (!fs.statSync(resolvedPath).isDirectory()) {
      return NextResponse.json(
        { error: `Path is not a directory: ${resolvedPath}` },
        { status: 400 }
      );
    }

    // Run analysis
    const result = await analyzeCodebase(resolvedPath);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
