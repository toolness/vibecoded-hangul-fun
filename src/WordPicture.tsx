import { getAssetUrl } from "./assets";
import type { WordPicture } from "./database-spec";

export function WordPicture({ picture }: { picture: WordPicture | undefined }) {
  if (!picture) {
    return <span className="question-picture question-emojis">�</span>;
  }

  if (picture.type === "emojis") {
    return (
      <span className="question-picture question-emojis">{picture.emojis}</span>
    );
  }

  if (picture.type === "local-image") {
    const src = getAssetUrl(picture.filename).href;
    return <img className="question-picture" src={src} />;
  }

  return null;
}
