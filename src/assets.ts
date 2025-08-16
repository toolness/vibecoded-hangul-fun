/**
 * Where the assets are downloaded to, relative
 * to the repository root.
 */
export const ASSETS_DIR = "src/assets/database";

/**
 * Given an asset filename, returns the URL to it,
 * for use at runtime (in the browser).
 */
export function getAssetUrl(filename: string): URL {
  // Note that Vite will parse this, it shouldn't get
  // too complicated!  For more details see:
  // https://vite.dev/guide/assets
  return new URL(`./assets/database/${filename}`, import.meta.url);
}
