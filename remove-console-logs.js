const fs = require('fs');
const path = require('path');

function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && 
               !file.endsWith('.spec.ts') && 
               !file.endsWith('.test.ts') &&
               !filePath.includes('__test-data__') &&
               !filePath.includes('node_modules')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function removeConsoleLogs(content) {
  // Remove console.log, console.warn, console.debug
  // Keep console.error
  
  // Pattern 1: Single line console.log/warn/debug
  content = content.replace(/^[ \t]*console\.(log|warn|debug)\([^;]*\);?\s*$/gm, '');
  
  // Pattern 2: Multi-line console.log/warn/debug
  content = content.replace(/^[ \t]*console\.(log|warn|debug)\([^)]*(\n[^)]*)*\);?\s*$/gm, '');
  
  // Clean up multiple consecutive blank lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  return content;
}

function main() {
  const srcDir = path.join(__dirname, 'src');
  const files = getAllTsFiles(srcDir);
  
  let totalLinesRemoved = 0;
  let filesModified = 0;
  
  files.forEach(filePath => {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const modifiedContent = removeConsoleLogs(originalContent);
    
    if (originalContent !== modifiedContent) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      const linesRemoved = originalContent.split('\n').length - modifiedContent.split('\n').length;
      totalLinesRemoved += linesRemoved;
      filesModified++;
      console.log(`✅ ${path.relative(srcDir, filePath)}: Removed ${linesRemoved} lines`);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Total lines removed: ${totalLinesRemoved}`);
  console.log(`\n✅ Done! All console.log/warn/debug statements have been removed.`);
  console.log(`⚠️  console.error statements were preserved for production error logging.`);
}

main();
