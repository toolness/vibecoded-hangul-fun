This is a simple vibe-coded web app that quizzes the user by asking
them to translate English/romanized words into Hangul.

## Quick start

### Prerequisites

You will need to create an internal Notion integration:

https://developers.notion.com/docs/create-a-notion-integration

The integration only needs read-only permission.

You will also need to create a Notion database with the following
schema:

- `Name` - Text, contains the English/romanized word
- `Hangul` - Text, contains the Hangul equivalent for the word
- `Minimal pairs` - Self-relation linking to other words that
  consitute a [minimal pair][] with this one.
- `Is translation?` - Checkbox. If false, `Name` represents a
  Hangul romanization (e.g. "Seoul"), otherwise it represents
  an English translation of the word (e.g. "Art").
- `URL` - URL, contains an optional link where the user can
  learn more about the word being described.
- `Image URL` - URL, an optional image representing the word.
- `Image` - An optional image file representing the word, used
  as an alternative to image URL.
- `Audio` - An optional audio file recording the pronounciation
  of the word, used as an alternative to the browser's
  built-in text-to-speech functionality.
- `Category` - Select, an optional tag representing a
  category for the word, such as "History" or "Place".
- `Notes` - Text, contains optional pronunciation notes.
- `Disabled` - Checkbox, a boolean indicating whether to
  include this word in the app at all. This is essentially
  a way to "soft delete" a row.

[minimal pair]: https://en.wikipedia.org/wiki/Minimal_pair

### Environment variables

Now create an `.env` file with the following variables defined:

```
NOTION_API_KEY=<Your Notion API key>
NOTION_DB_ID=<Your Notion DB id>
```

### Downloading the database

To download the database, run:

```
npm run download
```

This will put the database JSON in `src/database.json`.

### Type checking

If you make changes to the codebase, be sure to run `npm run typecheck`
to ensure there are no type errors.

### Tests

You can run tests via `npm run test`.

You can run the tests interactively, re-running them whenever you change
files, with `npm run test:watch`.

### Code formatting

Run `npm run prettier` after changing code/before committing
to ensure that code is formatted consistently.

### Credits

- [Speaker_Icon.svg](src/assets/Speaker_Icon.svg) was taken from
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Speaker_Icon.svg)
  and is in the public domain.
