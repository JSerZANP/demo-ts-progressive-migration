import ts from "typescript";

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

collectTscDiagnostics(__dirname + "/../../", "./tsconfig.json", {
  noImplicitAny: true,
});
