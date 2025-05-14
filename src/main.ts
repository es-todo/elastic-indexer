import { Client } from "@elastic/elasticsearch";
import { sleep } from "./sleep.ts";

async function start() {
  const client = new Client({ node: "http://127.0.0.1:9200" });

  let green = false;
  while (!green) {
    try {
      const health = await client.cluster.health({
        wait_for_status: "green",
        timeout: "5s",
      });
      console.log(health.status);
      green = health.status.toLowerCase() === "green";
    } catch (err) {
      const delay = 500;
      console.error(
        `error connecting to elasticsearch; retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }
  console.log("🎉 Elasticsearch is ready!");
  try {
    const res = await client.indices.create({
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
    console.log(res);
  } catch (err: any) {
    if (err.meta?.body?.error?.type === "resource_already_exists_exception") {
      console.log("index already exists");
    } else {
      throw err;
    }
  }

  client.close();
}

start().catch((err) => {
  console.error("Fatal Error!");
  console.error(err);
  process.exit(1);
});
