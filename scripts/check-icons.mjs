import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Guardián del sistema de iconos.
//
// Antes de esto la app tenía noventa iconos con doce tamaños distintos y
// cuatro grosores de trazo que no coincidían. Unificarlos costó un barrido de
// treinta archivos; sin algo que lo vigile, el desorden vuelve en el siguiente
// cambio, una decisión suelta a la vez.
//
// Corre en el build, así que un icono fuera del sistema no llega a producción.

const ALLOWED = [14, 17, 22];
// Los que definen el propio sistema y el catálogo de iconos.
const SKIP = new Set([
  "src/lib/icons.ts",
  "src/components/ui/IconBadge.tsx",
  "src/lib/category-icons.ts",
]);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const problems = [];

for (const path of walk("src")) {
  if (!/\.tsx?$/.test(path) || SKIP.has(path)) continue;
  const source = readFileSync(path, "utf8");
  if (!source.includes("lucide-react")) continue;

  source.split("\n").forEach((line, index) => {
    const where = `${path}:${index + 1}`;

    const size = line.match(/size=\{(\d+)\}/);
    if (size && !ALLOWED.includes(Number(size[1]))) {
      problems.push(
        `${where}  size={${size[1]}} — usa ICON.sm (14), ICON.md (17) o ICON.lg (22)`
      );
    }

    const stroke = line.match(/strokeWidth=\{([0-9.]+)\}/);
    if (stroke) {
      problems.push(
        `${where}  strokeWidth={${stroke[1]}} — el grosor no se declara: lucide ya usa 2`
      );
    }
  });
}

if (problems.length > 0) {
  console.error(`\nIconos fuera del sistema (${problems.length}):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("\nEl criterio vive en src/lib/icons.ts.\n");
  process.exit(1);
}

console.log("Iconos: todos dentro del sistema.");
