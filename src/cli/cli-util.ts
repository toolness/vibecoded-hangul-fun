/**
 * Retrieves the given environment variable, throwing a helpful
 * error if it's not defined or empty.
 */
export function ensureEnvironmentVar(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Please define the ${name} environment variable.`);
  }

  return value;
}
