import type { Database } from "better-sqlite3";

export interface RecentlyIncorrectCard {
  /**
   * This is the DB row from our DB, _not_ the Anki GUID. See
   * [ref:hangul-anki-id] for more details.
   */
  id: string;
  lastIncorrectTimestamp: number;
}

export interface GetRecentlyIncorrectCardsOptions {
  noteTypes: string[];
  maxAgeInDays: number;
  db: Database;
}

/**
 * Retrieves cards that were answered incorrectly within the specified time period.
 *
 * @param options.noteTypes - Array of note type names to filter by (exact match)
 * @param options.maxAgeInDays - Only include cards answered incorrectly within this many days
 * @param options.dbPath - Path to the Anki SQLite database file (collection.anki2)
 * @returns Array of cards with their fields and last incorrect answer timestamp
 */
export function getRecentlyIncorrectCardsSync(
  options: GetRecentlyIncorrectCardsOptions,
): RecentlyIncorrectCard[] {
  const { noteTypes, maxAgeInDays, db } = options;

  if (noteTypes.length === 0) {
    return [];
  }

  try {
    // Anki's notetypes table uses a custom "unicase" collation for case-insensitive
    // Unicode comparison. This collation is registered at runtime by Anki's application
    // code and is NOT available when querying the database externally (e.g., via sqlite3
    // CLI or better-sqlite3). Attempting to use WHERE clauses on the `name` column will
    // fail with "no such collation sequence: unicase".
    //
    // Workaround: Fetch all note types and filter in JavaScript instead.
    const allNoteTypes = db.prepare("SELECT id, name FROM notetypes").all() as {
      id: number;
      name: string;
    }[];

    const matchingIds = allNoteTypes
      .filter((nt) => noteTypes.includes(nt.name))
      .map((nt) => nt.id);

    if (matchingIds.length === 0) {
      return [];
    }

    // Calculate the cutoff timestamp in milliseconds (revlog.id is epoch milliseconds)
    const cutoffMs = Date.now() - maxAgeInDays * 24 * 60 * 60 * 1000;

    // Query for cards answered incorrectly (ease = 1) within the time period.
    // Group by note to get the most recent incorrect answer for each.
    const placeholders = matchingIds.map(() => "?").join(", ");
    const query = `
      SELECT n.flds, MAX(r.id) AS last_incorrect_ms
      FROM notes n
      JOIN cards c ON c.nid = n.id
      JOIN revlog r ON r.cid = c.id
      WHERE n.mid IN (${placeholders})
        AND r.ease = 1
        AND r.id > ?
      GROUP BY n.id
      ORDER BY last_incorrect_ms DESC
    `;

    const rows = db.prepare(query).all(...matchingIds, cutoffMs) as {
      flds: string;
      last_incorrect_ms: number;
    }[];

    return rows.map((row) => ({
      id: row.flds.split("\x1F")[0],
      lastIncorrectTimestamp: row.last_incorrect_ms,
    }));
  } finally {
    db.close();
  }
}

export function getRootAnkiDir(): string {
  // https://docs.ankiweb.net/files.html
  // Implemented by GitHub Copilot.
  const platform = process.platform;
  if (platform === "darwin") {
    // macOS
    return `${process.env.HOME}/Library/Application Support/Anki2`;
  } else if (platform === "win32") {
    // Windows
    return `${process.env.APPDATA}\\Anki2`;
  } else {
    throw new Error("Unsupported OS for Anki directory");
  }
}
