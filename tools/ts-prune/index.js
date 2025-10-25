#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsConfig() {
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    console.error('ts-prune: Unable to find tsconfig.json');
    process.exit(1);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    const message = ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n');
    console.error(`ts-prune: Failed to read tsconfig.json: ${message}`);
    process.exit(1);
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  return { parsed, configPath };
}

function createLanguageService(parsed) {
  const files = new Map(parsed.fileNames.map((file) => [path.resolve(file), { version: 0 }]));

  const servicesHost = {
    getScriptFileNames: () => Array.from(files.keys()),
    getScriptVersion: (fileName) => files.get(path.resolve(fileName))?.version.toString() ?? '0',
    getScriptSnapshot: (fileName) => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8'));
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };

  return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
}

function isIdentifier(node) {
  return node && ts.isIdentifier(node);
}

function isReExport(declaration, checker, targetSymbol) {
  if (!declaration) return false;
  if (ts.isExportSpecifier(declaration)) {
    const target = checker.getExportSpecifierLocalTargetSymbol(declaration);
    if (target && target !== targetSymbol) {
      return true;
    }
  }
  if (ts.isExportDeclaration(declaration) && declaration.moduleSpecifier) {
    return true;
  }
  if (ts.isExportAssignment(declaration)) {
    return true;
  }
  return false;
}

function findIdentifierNode(declaration) {
  if (!declaration) return null;
  if ('name' in declaration && declaration.name && ts.isIdentifier(declaration.name)) {
    return declaration.name;
  }
  if (ts.isVariableDeclaration(declaration) && ts.isIdentifier(declaration.name)) {
    return declaration.name;
  }
  if (ts.isFunctionDeclaration(declaration) && declaration.name) {
    return declaration.name;
  }
  if (ts.isClassDeclaration(declaration) && declaration.name) {
    return declaration.name;
  }
  if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration) || ts.isEnumDeclaration(declaration)) {
    return declaration.name;
  }
  if (ts.isModuleDeclaration(declaration)) {
    return declaration.name;
  }
  return null;
}

function collectUnusedExports(languageService, parsed) {
  const program = languageService.getProgram();
  if (!program) {
    console.error('ts-prune: failed to create TypeScript program');
    process.exit(1);
  }

  const checker = program.getTypeChecker();
  const unused = [];
  const includedFiles = new Set(parsed.fileNames.map((file) => path.resolve(file)));

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const absolutePath = path.resolve(sourceFile.fileName);
    if (!includedFiles.has(absolutePath)) {
      continue;
    }

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    const exportedSymbols = checker.getExportsOfModule(moduleSymbol);
    for (const symbol of exportedSymbols) {
      const name = symbol.getName();
      if (name === 'default') continue;

      const declarations = symbol.getDeclarations();
      if (!declarations || declarations.length === 0) {
        continue;
      }

      let isUsed = false;
      for (const declaration of declarations) {
        if (isReExport(declaration, checker, symbol)) {
          isUsed = true;
          break;
        }

        const identifier = findIdentifierNode(declaration);
        if (!identifier) {
          isUsed = true;
          break;
        }

        const declSource = declaration.getSourceFile();
        const fileName = declSource.fileName;
        const position = identifier.getStart();
        const references = languageService.findReferences(fileName, position);

        if (!references) {
          continue;
        }

        const hasExternalReference = references.some((entry) =>
          entry.references.some((ref) => !ref.isDefinition),
        );

        if (hasExternalReference) {
          isUsed = true;
          break;
        }
      }

      if (!isUsed) {
        const declaration = declarations[0];
        const source = declaration.getSourceFile();
        const { line, character } = source.getLineAndCharacterOfPosition(declaration.getStart());
        unused.push({
          name,
          file: path.relative(process.cwd(), source.fileName),
          line: line + 1,
          character: character + 1,
        });
      }
    }
  }

  return unused;
}

function main() {
  const { parsed } = loadTsConfig();
  const languageService = createLanguageService(parsed);
  const unused = collectUnusedExports(languageService, parsed);

  if (unused.length === 0) {
    console.log('ts-prune: no unused exports found');
    process.exit(0);
  }

  console.error('ts-prune: unused exports detected:');
  for (const entry of unused) {
    console.error(`  ${entry.file}:${entry.line}:${entry.character} - ${entry.name}`);
  }
  process.exit(1);
}

main();
