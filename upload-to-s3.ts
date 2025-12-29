import { readFile } from "fs/promises";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

import { ensureEnvironmentVar } from "./src/cli/cli-util.ts";

dotenv.config();

const AWS_ACCESS_KEY = ensureEnvironmentVar("AWS_ACCESS_KEY");

const AWS_SECRET_ACCESS_KEY = ensureEnvironmentVar("AWS_SECRET_ACCESS_KEY");

const AWS_BUCKET = ensureEnvironmentVar("AWS_BUCKET");

const AWS_BUCKET_REGION = ensureEnvironmentVar("AWS_BUCKET_REGION");

const TEST_FILE_PATH = "src/assets/database/1_000-N766Tw.mp3";
const S3_KEY = "1_000-N766Tw.mp3";

async function main() {
  const s3Client = new S3Client({
    region: AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const localFileContent = await readFile(TEST_FILE_PATH);

  console.log(`Uploading ${TEST_FILE_PATH} to s3://${AWS_BUCKET}/${S3_KEY}...`);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: S3_KEY,
      Body: localFileContent,
      ContentType: "audio/mpeg",
    }),
  );

  console.log("Upload complete.");

  const s3Url = `https://${AWS_BUCKET}.s3.${AWS_BUCKET_REGION}.amazonaws.com/${S3_KEY}`;
  console.log(`Fetching ${s3Url}...`);

  const response = await fetch(s3Url, {
    headers: {
      Origin: "https://example.com",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  const corsHeader = response.headers.get("access-control-allow-origin");
  if (corsHeader !== "*") {
    throw new Error(
      `Expected CORS header 'access-control-allow-origin: *', got '${corsHeader}'`,
    );
  }
  console.log("CORS headers verified.");

  const fetchedContent = new Uint8Array(await response.arrayBuffer());
  if (fetchedContent.length !== localFileContent.length) {
    throw new Error(
      `Content length mismatch: local=${localFileContent.length}, fetched=${fetchedContent.length}`,
    );
  }

  for (let i = 0; i < localFileContent.length; i++) {
    if (localFileContent[i] !== fetchedContent[i]) {
      throw new Error(`Content mismatch at byte ${i}`);
    }
  }
  console.log("Content verified.");

  console.log("All checks passed!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
