This is a simple (mostly) vibe-coded web app that
helps the user learn Korean. It has a variety
of modes:

- **Translate mode** - asks the user to translate
  romanized Koran words (e.g. "bibimbap") into Hangul.

- **Typing tutor mode** - asks the user to type
  Hangul words.

- **Picture mode** - shows the user a picture representing
  a word, asking them to type it in Hangul.

- **Reverse picture mode** - shows the user a word in
  Hangul, prompting the user to think of the picture
  it represents.

- **Minimal pair mode** - presents the user with the
  audio for two words that constitute a [minimal pair][],
  prompting them to guess the word they heard.

Typing modes present real-time feedback on how many
keystrokes the user has typed correctly so far.

Many of these modes were inspired by Gabriel Wyner's
[Fluent Forever](https://fluentforeverbook.com/).

All content is stored in Notion and downloaded at
build time. The static website is deployed does not
communicate with Notion.

The content can also be exported to
[Anki](https://apps.ankiweb.net/) as a deck.

## Quick start

### Prerequisites

You will need to create an internal Notion integration:

https://developers.notion.com/docs/create-a-notion-integration

The integration only needs read-only permission.

#### Words data source

You will also need to create a Notion data source called "Words"
with the following schema:

- `Name` - Text (title), contains the English/romanized word
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
- `Emojis` - Text, an emoji (or sequence of emojis) that pictorially
  represents the word. This can be used as an alternative to
  the image.
- `Audio` - An optional audio file recording the pronounciation
  of the word, used as an alternative to the browser's
  built-in text-to-speech functionality.
- `Category` - Select, an optional tag representing a
  category for the word, such as "History" or "Place".
- `Notes` - Text, contains optional pronunciation notes.
- `Sentences` - A relation to the Sentences data source (see below); the
  name of each row in the table should be an example sentence
  or song lyric that uses the word. This can be used to show the
  sentence on the back of each word's flash card, to provide
  context for it.
- `Disabled` - Checkbox, a boolean indicating whether to
  include this word in the app at all. This is essentially
  a way to "soft delete" a row.

[minimal pair]: https://en.wikipedia.org/wiki/Minimal_pair

#### Sentences data source

Also make a data source called "Sentences" with this schema:

- `Sentence` - Text (title), contains the Hangul of the sentence.
- `Markup` - Text, contains the sentence, but marked up using
  various rich text formatting options. See "Sentence markup" below.
- `Words` - Relation to the Words data source (see above). All
  the words used in the sentence.
- `Audio` - An optional audio file recording the pronounciation
  of the sentence.
- `Notes` - Text, contains optional pronunciation notes.
- `Disabled` - Checkbox, a boolean indicating whether to
  include this sentence in the app at all. This is essentially
  a way to "soft delete" a row.

#### Sentence markup

The markup field can contain the following:

- **Hyperlinks to words** - These should link a word in the
  sentence to its corresponding Word entry. We can use this to create
  Anki [Cloze][] cards for the sentence, where each highlighted
  word is obscured.

  We can also use it to put the picture of the word
  in the sentence.

  If the word background is gray, then we won't put a Cloze tag
  in for it (or otherwise quiz the user on it), but we will still
  use its picture.

  If the word isn't hyperlinked but is underlined, we will
  still quiz the user on it, even though we don't have a
  word defined for it.

[Cloze]: https://docs.ankiweb.net/editing.html#cloze-deletion

### Environment variables

Now create an `.env` file with the following variables defined:

```
NOTION_API_KEY=<Your Notion API key>
NOTION_DS_ID=<Your Notion data source id>
```

### Downloading the database

To download the database, run:

```
npm run download
```

This will put the database JSON in `src/database.json`.

### Importing into Anki

To import the downloaded database into Anki, run `npm run anki`.

This will actually copy all the pictures and images into your
Anki installation's media collection. It will also write a CSV
that you can import into Anki.

See [`anki.ts`](./anki.ts) for more details.

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
