import ts from "typescript";
import path from "path";
import { simpleGit } from "simple-git";
const git = simpleGit();

type Diagnostic = {
  path: string | undefined;
  start: number | undefined;
  length: number | undefined;
  code: number;
  message: string | ts.DiagnosticMessageChain;
};
function collectTscDiagnostics(
  basePath: string,
  pathToConfig: string,
  extraCompilerOptions?: Record<string, any>
): Array<Diagnostic> {
  const { config } = ts.readConfigFile(pathToConfig, ts.sys.readFile);

  if (config == null) {
    throw new Error("unable to read config file:" + pathToConfig);
  }
  config.compilerOptions = {
    ...config.compilerOptions,
    ...extraCompilerOptions,
  };

  const { options, fileNames, errors } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    basePath
  );
  const program = ts.createProgram({
    options,
    rootNames: fileNames,
  });

  const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
    path: diagnostic.file?.fileName,
    start: diagnostic.start,
    length: diagnostic.length,
    code: diagnostic.code,
    message: diagnostic.messageText,
  }));
  return diagnostics;
}

function getAllDiagnostics(basePath: string) {
  return collectTscDiagnostics(basePath, "./tsconfig.json", {
    noImplicitAny: true,
  });
}

async function diffTscDiagnostics(from: string, to: string, basePath: string) {
  const currentBranch = (await git.branch()).current;
  git.checkout(from);
  const diagnosticsFrom = getAllDiagnostics(basePath);
  git.checkout(to);
  const diagnosticsTo = getAllDiagnostics(basePath);
  git.checkout(currentBranch);

  // we need to filter out new issues and existing issues in diff list
  const existingDiagnostics = new Map<string, Diagnostic>();
  diagnosticsFrom.forEach((diagnostic) => {
    const hash = JSON.stringify(diagnostic);
    existingDiagnostics.set(hash, diagnostic);
  });
  const diff = await git.diffSummary([from, to]);
  const changedFiles = new Set(
    diff.files.map((file) => path.resolve(basePath + file.file))
  );

  const diagnosticsToFix = diagnosticsTo.filter((diagnostic) => {
    if (diagnostic.path == null) return false;
    const hash = JSON.stringify(diagnostic);
    return !existingDiagnostics.has(hash) || changedFiles.has(diagnostic.path);
  });

  return diagnosticsToFix;
}

diffTscDiagnostics(
  "1d67625d3991525cda22d42f077dfd54c364a899",
  "225a888521ea8ddb48d2c514488897d8bbfd8f84",
  __dirname + "/../../"
).then(console.log);
