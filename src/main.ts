import { Client } from "@elastic/elasticsearch";
import UrlPattern from "url-pattern";
import { routes } from "./routes.ts";
import { es_green, create_index } from "./es-helpers.ts";
import { Database } from "./sqlite.ts";

const all_routes = routes.map((x) => ({
  ...x,
  pattern: new UrlPattern(x.pattern),
}));

async function start() {
  const client = new Client({ node: "http://127.0.0.1:9200" });
  const db = await Database.open("/mnt/queue.db");
  await es_green(client);
  await create_index(client, {
    index: "docs",
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          universal: {
            type: "custom",
            tokenizer: "icu_tokenizer",
            filter: ["icu_folding", "lowercase"],
          },
        },
      },
    },
    mappings: {
      dynamic: false,
      properties: {
        permission: { type: "keyword" },
        url: { type: "keyword" },
        title: { type: "text", analyzer: "universal" },
        body: { type: "text", analyzer: "universal" },
        tag: { type: "keyword" },
      },
    },
  });
  console.log("🎉 Elasticsearch is ready!");

  await db.close();
  await client.close();
}

start().catch((err) => {
  console.error("Fatal Error!");
  console.error(err);
  process.exit(1);
});
