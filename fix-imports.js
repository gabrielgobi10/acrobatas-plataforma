cat > fix-imports.js << 'EOF'
import fs from "fs";
import path from "path";

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else {
      let content = fs.readFileSync(fullPath, "utf8");
      if (content.includes("adicionarprofissional")) {
        const fixed = content.replaceAll("adicionarprofissional", "adicionarprofissional");
        fs.writeFileSync(fullPath, fixed);
        console.log("✅ Corrigido:", fullPath);
      }
    }
  }
}

walk("./src");
console.log("\n🚀 Tudo corrigido! Agora roda: npm run dev -- --force");
EOF
