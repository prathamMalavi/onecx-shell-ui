// Instrumentation script: inject trace(...) calls after each executable statement
// Scope: src/**/*.ts excluding spec files and generated code under shared/generated
import * as path from 'path'
import { globSync } from 'glob'
import { Project, SyntaxKind, Node, SourceFile, Statement, FunctionDeclaration, MethodDeclaration, ArrowFunction, FunctionExpression } from 'ts-morph'

function relImport(fromFile: string, toModuleAbs: string) {
  const rel = path.relative(path.dirname(fromFile), toModuleAbs).replace(/\\/g, '/')
  return rel.startsWith('.') ? rel : `./${rel}`
}

function getFunctionContext(node: Node): { params: string[]; hasThis: boolean } {
  const func = node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) as MethodDeclaration
  if (func) return { params: func.getParameters().map((p) => p.getName()), hasThis: true }
  const fDecl = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) as FunctionDeclaration
  if (fDecl) return { params: fDecl.getParameters().map((p) => p.getName()), hasThis: false }
  const fExpr = node.getFirstAncestorByKind(SyntaxKind.FunctionExpression) as FunctionExpression
  if (fExpr) return { params: fExpr.getParameters().map((p) => p.getName()), hasThis: false }
  const arrow = node.getFirstAncestorByKind(SyntaxKind.ArrowFunction) as ArrowFunction
  if (arrow) return { params: arrow.getParameters().map((p) => p.getName()), hasThis: false }
  return { params: [], hasThis: false }
}

function buildExtras(ctx: { params: string[]; hasThis: boolean }) {
  const parts = [] as string[]
  if (ctx.hasThis) parts.push('this')
  parts.push(...ctx.params)
  return parts.length ? `{ ${parts.join(', ')} }` : 'undefined'
}

function instrumentFile(sf: SourceFile, projectRoot: string) {
  const absFile = sf.getFilePath()
  const traceModuleAbs = path.resolve(projectRoot, 'src/debug/trace.ts')
  const importPath = relImport(absFile, traceModuleAbs).replace(/\.ts$/i, '')

  // Add import if not present
  const hasImport = sf.getImportDeclarations().some((id) => id.getModuleSpecifierValue() === importPath && id.getNamedImports().some((n) => n.getName() === 'trace'))
  if (!hasImport) {
    sf.addImportDeclaration({ namedImports: [{ name: 'trace' }], moduleSpecifier: importPath })
  }

  // Instrument top-level statements and block statements
  const blocks: Node[] = []
  blocks.push(sf)
  blocks.push(...sf.getDescendantsOfKind(SyntaxKind.Block))

  for (const block of blocks) {
    // Get block statements
    const statements = (block as any).getStatements?.() as Statement[]
    if (!statements || statements.length === 0) continue

    // Insert trace after each statement
    // Use reverse order to keep indices stable
    for (let i = statements.length - 1; i >= 0; i--) {
      const st = statements[i]
      // Skip import/export/interface/type declarations which aren't executable
      const kind = st.getKind()
      if ([SyntaxKind.ImportDeclaration, SyntaxKind.ExportDeclaration, SyntaxKind.InterfaceDeclaration, SyntaxKind.TypeAliasDeclaration].includes(kind)) {
        continue
      }
      const line = st.getEndLineNumber()
      const ctx = getFunctionContext(st)
      const extras = buildExtras(ctx)
      const fileForLog = path.relative(projectRoot, absFile).replace(/\\/g, '/')
      const traceCall = `trace('${fileForLog}', ${line}, ${extras});`
      ;(block as any).insertStatements(i + 1, traceCall)
    }
  }
}

function main() {
  const projectRoot = process.cwd()
  const project = new Project({ tsConfigFilePath: path.resolve(projectRoot, 'tsconfig.json') })
  const files = globSync('src/**/*.ts', {
    cwd: projectRoot,
    absolute: true,
    ignore: ['src/**/*.spec.ts', 'src/app/shared/generated/**']
  })

  const sourceFiles = files.map((f) => project.addSourceFileAtPath(f))
  sourceFiles.forEach((sf) => instrumentFile(sf, projectRoot))
  project.saveSync()
  // eslint-disable-next-line no-console
  console.log(`Instrumented ${sourceFiles.length} files.`)
}

main()
