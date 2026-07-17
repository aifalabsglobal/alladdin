import { readFileSync } from "node:fs";

async function main() {
  const job = process.argv[2] ?? "predict";
  const port = process.argv[3] ?? "3001";
  const envText = readFileSync(".env", "utf8");
  const match = envText.match(/^CRON_SECRET=(?:"([^"]+)"|([^\r\n]+))$/m);
  const secret = match?.[1] ?? match?.[2];

  if (!secret) {
    throw new Error("CRON_SECRET is missing from .env");
  }

  const response = await fetch(`http://localhost:${port}/api/jobs/${job}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const text = await response.text();
  console.log(`HTTP ${response.status}`);
  console.log(text);

  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
