const fs = require('fs');
const ts = require('typescript');

const files = [
  ['app/page.tsx', ts.ScriptKind.TSX],
  ['app/cbam-calculator/page.tsx', ts.ScriptKind.TSX],
  ['app/cbam-calculator/actual-data/page.tsx', ts.ScriptKind.TSX],
  ['app/cbam-calculator/bulk/page.tsx', ts.ScriptKind.TSX],
  ['app/cbam-calculator/electricity/page.tsx', ts.ScriptKind.TSX],
  ['src/components/AnonymousWorkspacePanel.tsx', ts.ScriptKind.TSX],
  ['src/lib/lca-projects.ts', ts.ScriptKind.TS],
  ['app/api/lca/projects/route.ts', ts.ScriptKind.TS],
  ['app/api/lca/projects/[id]/route.ts', ts.ScriptKind.TS],
];

let failed = 0;
for (const [relative, kind] of files) {
  const file = require('path').join(__dirname, '..', relative);
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    console.log(`FAIL ${relative}`);
    for (const error of errors) {
      console.log(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
    }
    failed += errors.length;
  } else {
    console.log(`PASS ${relative}`);
  }
}
if (failed) process.exit(1);
console.log('TypeScript transpile/syntax checks passed.');
