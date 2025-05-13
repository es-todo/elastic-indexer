import { Client } from "@elastic/elasticsearch";
import { sleep } from "./sleep.ts";

async function start() {
  const client = new Client({ node: "http://localhost:9200" });

  let green = false;
  while (!green) {
    try {
      const health = await client.cluster.health({
        wait_for_status: "green",
        timeout: "30s",
      });
      console.log(health);
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
  client.close();
}

start().catch((err) => {
  console.error("Fatal Error!");
  console.error(err);
  process.exit(1);
});
