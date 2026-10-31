/**
 * Cabeceras de seguridad de todas las respuestas (next.config.ts → headers()).
 *
 * CSP sin nonces (guía "Content Security Policy" de Next 16, "Without
 * Nonces"): las páginas son estáticas y los nonces exigen render dinámico en
 * cada petición. `script-src` admite 'unsafe-inline' por los scripts de
 * hidratación de Next; aun así la política bloquea scripts de terceros,
 * `<object>`, `<base>` ajenos, envíos de formularios fuera del sitio y que la
 * app se incruste en otra página (clickjacking).
 *
 * Orígenes externos: solo Firebase (Auth, Firestore, Functions, Storage, App
 * Check) y reCAPTCHA Enterprise para App Check. Con emuladores se añade
 * 127.0.0.1; en desarrollo, 'unsafe-eval' (React lo usa para depurar).
 */
export function contentSecurityPolicy({ dev = false, emulators = false } = {}): string {
  const local = emulators ? " http://127.0.0.1:* ws://127.0.0.1:*" : "";
  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": `'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
    "style-src": "'self' 'unsafe-inline'",
    "img-src": `'self' blob: data: https://firebasestorage.googleapis.com${local}`,
    "font-src": "'self'",
    "connect-src": `'self' https://*.googleapis.com https://*.cloudfunctions.net https://*.run.app https://*.firebaseio.com wss://*.firebaseio.com${local}`,
    "frame-src": "https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://*.firebaseapp.com",
    "worker-src": "'self' blob:",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
  };
  const policy = Object.entries(directives).map(([name, value]) => `${name} ${value}`);
  // Sin TLS en local: forzar https rompería las pruebas contra 127.0.0.1.
  if (!dev && !emulators) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders(options: { dev?: boolean; emulators?: boolean } = {}) {
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    // Nada de cámara, micrófono, ubicación ni pagos: la app no los usa.
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ];
  // HSTS solo tiene sentido servido por https (producción y previews).
  if (!options.dev && !options.emulators) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  }
  return headers;
}
