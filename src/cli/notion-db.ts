type HangulNotionDbConfig = {
  apiKey: string;
  dataSourceId: string;
};

export function getHangulNotionDbConfig(env: {
  [key: string]: string | undefined;
}): HangulNotionDbConfig {
  const NOTION_API_KEY = env.NOTION_API_KEY;

  if (!NOTION_API_KEY) {
    throw new Error("Please define NOTION_API_KEY!");
  }

  const NOTION_DS_ID = env.NOTION_DS_ID;

  if (!NOTION_DS_ID) {
    throw new Error("Please define NOTION_DS_ID!");
  }

  return {
    apiKey: NOTION_API_KEY,
    dataSourceId: NOTION_DS_ID,
  };
}
