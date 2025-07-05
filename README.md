This is a simple vibe-coded web app that quizzes the user by asking
them to translate English/romanized words into Hangul.

## Quick start

### Environment variables

First create an `.env` file with the following variables defined:

```
NOTION_API_KEY=<Your Notion API key>
NOTION_DB_ID=<Your Notion DB id>
```

### Database schema

The Notion DB with the given ID must have the following fields:

* `Name` - Text, contains the English/romanized word
* `Hangul` - Text, contains the Hangul equivalent for the word
* `URL` - URL, contains an optional link where the user can
          learn more about the word being described.

### Downloading the database

To download the database, run:

```
npm run download
```

This will put the database JSON in `src/database.json`.
