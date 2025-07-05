import './App.css'
import _database from "./database.json";
import type { DatabaseRow } from './database-spec';

// eslint-disable-next-line
const DATABASE_ROWS: DatabaseRow[] = _database.filter(row => row.name && row.hangul);

function App() {
  // TODO:
  //
  // 1. Pick a random database row from DATABASE_ROWS that we either haven't
  //    shown the user, or that the user got wrong before.
  //
  // 2. Show the row's name (english/romanized text) and ask the user to
  //    enter the Hangul representation.
  //
  //    Show a large text field in which the user can type their answer.
  //
  //    Below the text field should also be a button labeled "give up".
  // 
  //    If the row has a URL associated with it, hyperlink the name to the URL,
  //    ensuring it opens in a new window if clicked on.
  //
  // 3. As the user types their response, let them know how many characters
  //    they got right. Once they have all characters right, show
  //    a "next" button that takes the user back to step 1.
  //
  // 4. If the user clicks "give up", show them the Hangul representation,
  //    along with a "next" button that takes them back to step 1.

  return (
    <>
      <div>
        TODO: Replace this content.
      </div>
    </>
  )
}

export default App
