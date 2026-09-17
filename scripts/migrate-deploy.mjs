import { spawnSync } from "node:child_process";

// El build corre las migraciones antes de compilar, así que un parpadeo de la
// base tumbaba el despliegue entero. Con reintentos, una indisponibilidad
// momentánea deja de costar un deploy.
//
// Si tras los reintentos sigue fallando, el build falla a propósito: publicar
// código que espera un schema que no se aplicó es peor que no publicar.
const DELAYS_MS = [2000, 5000, 10000];

// Cuando la base acepta la conexión pero no responde, `migrate deploy` se
// queda esperando sin devolver nunca: un build se quedó 40 minutos en
// "Building" y bloqueó la cola entera, porque en el plan Hobby solo corre un
// build a la vez. Con un límite por intento, un cuelgue cuenta como fallo y
// pasa al reintento en vez de tumbar la cola.
const ATTEMPT_TIMEOUT_MS = 90_000;

for (let attempt = 0; attempt <= DELAYS_MS.length; attempt++) {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    timeout: ATTEMPT_TIMEOUT_MS,
    killSignal: "SIGKILL",
  });

  if (result.error?.code === "ETIMEDOUT") {
    console.warn(
      `\nLas migraciones se colgaron más de ${ATTEMPT_TIMEOUT_MS / 1000}s y se cortaron.`
    );
  }

  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt === DELAYS_MS.length) {
    console.error(
      `\nLas migraciones fallaron tras ${DELAYS_MS.length + 1} intentos. Se detiene el build.`
    );
    process.exit(1);
  }

  const delay = DELAYS_MS[attempt];
  console.warn(
    `\nLas migraciones fallaron (intento ${attempt + 1} de ${DELAYS_MS.length + 1}). ` +
      `Reintentando en ${delay / 1000}s…`
  );
  await new Promise((resolve) => setTimeout(resolve, delay));
}
