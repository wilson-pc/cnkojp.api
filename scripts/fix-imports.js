import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '../dist');

async function fixImports(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await fixImports(filePath);
    } else if (path.extname(file) === '.js') {
      let content = fs.readFileSync(filePath, 'utf8');
      // Modificada la expresión regular para capturar mejor las importaciones locales
      content = content.replace(/from ['"](\.[^'"]+)['"]/g, (match, p1) => {
        if (path.extname(p1) === '') {
          console.log(`Fixing import in ${filePath}: ${p1} -> ${p1}.js`);
          return `from '${p1}.js'`;
        }
        return match;
      });
      fs.writeFileSync(filePath, content);
    }
  }
}

fixImports(distPath).catch(err => {
  console.error('Error fixing imports:', err);
  process.exit(1);
});