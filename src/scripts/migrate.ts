import ts from "typescript";
import { simpleGit } from "simple-git";
const git = simpleGit();

function collectTscDiagnostics(
  basePath: string,
  pathToConfig: string,
  extraCompilerOptions?: Record<string, any>
) {
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
  console.log(options, fileNames);
  const program = ts.createProgram({
    options,
    rootNames: fileNames,
  });

  const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
    path: diagnostic.file.fileName,
    start: diagnostic.start,
    length: diagnostic.length,
    code: diagnostic.code,
    message: diagnostic.messageText,
  }));
  console.log(diagnostics);
  return diagnostics;
}

function getAllDiagnostics() {
  return collectTscDiagnostics(__dirname + "/../../", "./tsconfig.json", {
    noImplicitAny: true,
  });
}

function diffTscDiagnostics(from: string, to: string) {
  git.checkout(from);
  const diagnosticsFrom = getAllDiagnostics();
  git.checkout("-");
  git.checkout(to);
  const diagnosticsTo = getAllDiagnostics();
  git.checkout("-");
  console.log(diagnosticsFrom, diagnosticsTo);
}

diffTscDiagnostics(
  "b22d13f06d5d25cab802dd432168f1a604bf8fbc",
  "f0d9616baddd2dfafffa6d51d243e09c4be9e614"
);
