import { reportError } from "./lib/reportError";

window.addEventListener("error", (event) => reportError(event.error, "root"));
window.addEventListener("unhandledrejection", (event) => reportError(event.reason, "root"));
