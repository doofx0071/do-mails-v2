#!/usr/bin/env node

/**
 * Workspace Setup Test Script
 * 
 * This script tests the workspace configuration to ensure:
 * 1. Workspace dependencies are properly linked
 * 2. Libraries can be built successfully
 * 3. TypeScript paths resolve correctly
 * 4. Import resolution works for @do-mails/* packages
 * 
 * Usage: node scripts/test-workspace.js
 */

import fs from 'fs'
import path from 'path'

console.log('🔧 Testing Workspace Setup...\n')

// Test 1: Check workspace configuration
console.log('Test 1: Workspace Configuration')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  
  if (packageJson.workspaces && packageJson.workspaces.includes('libs/*')) {
    console.log('  ✅ Workspaces configured correctly')
  } else {
    console.log('  ❌ Workspaces not configured')
  }
  
  const expectedDeps = [
    '@do-mails/alias-management',
    '@do-mails/domain-verification', 
    '@do-mails/email-processing'
  ]
  
  const hasWorkspaceDeps = expectedDeps.every(dep => 
    packageJson.dependencies[dep] && packageJson.dependencies[dep].startsWith('workspace:')
  )
  
  if (hasWorkspaceDeps) {
    console.log('  ✅ Workspace dependencies configured correctly')
  } else {
    console.log('  ❌ Workspace dependencies missing or incorrect')
    console.log('  Expected:', expectedDeps.map(dep => `${dep}: workspace:*`))
  }
} catch (error) {
  console.log(`  ❌ Error reading package.json: ${error.message}`)
}
console.log()

// Test 2: Check library package.json files
console.log('Test 2: Library Package Files')
const libraries = ['alias-management', 'domain-verification', 'email-processing']

libraries.forEach(lib => {
  const libPath = path.join('libs', lib, 'package.json')
  try {
    if (fs.existsSync(libPath)) {
      const libPackage = JSON.parse(fs.readFileSync(libPath, 'utf8'))
      console.log(`  ✅ ${lib}: package.json exists`)
      
      if (libPackage.scripts && libPackage.scripts.build) {
        console.log(`    ✅ Build script: ${libPackage.scripts.build}`)
      } else {
        console.log(`    ❌ Build script missing`)
      }
      
      if (libPackage.main && libPackage.types) {
        console.log(`    ✅ Entry points: main=${libPackage.main}, types=${libPackage.types}`)
      } else {
        console.log(`    ❌ Entry points missing`)
      }
    } else {
      console.log(`  ❌ ${lib}: package.json not found`)
    }
  } catch (error) {
    console.log(`  ❌ ${lib}: Error reading package.json - ${error.message}`)
  }
})
console.log()

// Test 3: Check TypeScript configuration
console.log('Test 3: TypeScript Configuration')
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
  
  const expectedPaths = [
    '@do-mails/alias-management',
    '@do-mails/domain-verification',
    '@do-mails/email-processing'
  ]
  
  const hasCorrectPaths = expectedPaths.every(pkg => 
    tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths[pkg]
  )
  
  if (hasCorrectPaths) {
    console.log('  ✅ TypeScript paths configured correctly')
    expectedPaths.forEach(pkg => {
      console.log(`    ✅ ${pkg} -> ${tsconfig.compilerOptions.paths[pkg][0]}`)
    })
  } else {
    console.log('  ❌ TypeScript paths missing or incorrect')
  }
} catch (error) {
  console.log(`  ❌ Error reading tsconfig.json: ${error.message}`)
}
console.log()

// Test 4: Check library source files
console.log('Test 4: Library Source Files')
libraries.forEach(lib => {
  const srcPath = path.join('libs', lib, 'src')
  const indexPath = path.join(srcPath, 'index.ts')
  
  try {
    if (fs.existsSync(srcPath)) {
      console.log(`  ✅ ${lib}: src directory exists`)
      
      if (fs.existsSync(indexPath)) {
        console.log(`    ✅ index.ts exists`)
      } else {
        console.log(`    ❌ index.ts missing`)
      }
    } else {
      console.log(`  ❌ ${lib}: src directory not found`)
    }
  } catch (error) {
    console.log(`  ❌ ${lib}: Error checking source files - ${error.message}`)
  }
})
console.log()

// Test 5: Check build scripts
console.log('Test 5: Build Scripts')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const expectedScripts = [
    'build:libs',
    'predev', 
    'prebuild',
    'test:contract',
    'test:integration',
    'test:vitest',
    'test:all'
  ]
  
  expectedScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`  ✅ ${script}: ${packageJson.scripts[script]}`)
    } else {
      console.log(`  ❌ ${script}: missing`)
    }
  })
} catch (error) {
  console.log(`  ❌ Error checking scripts: ${error.message}`)
}
console.log()

// Test 6: Manual testing instructions
console.log('🧪 Manual Testing Instructions:')
console.log('  1. Install dependencies: npm install')
console.log('  2. Build libraries: npm run build:libs')
console.log('  3. Type check: npm run type-check')
console.log('  4. Start development: npm run dev')
console.log('  5. Run tests: npm run test:all')
console.log()

console.log('📋 Expected Results:')
console.log('  ✅ npm install should link workspace packages')
console.log('  ✅ build:libs should compile all libraries to dist/')
console.log('  ✅ type-check should pass without import errors')
console.log('  ✅ dev should start without module resolution errors')
console.log('  ✅ API routes should import @do-mails/* packages successfully')
console.log()

console.log('🔍 Troubleshooting:')
console.log('  - If imports fail: Check tsconfig.json paths')
console.log('  - If builds fail: Check library tsconfig.json files')
console.log('  - If linking fails: Run npm install again')
console.log('  - If types missing: Ensure libraries have built dist/ folders')
