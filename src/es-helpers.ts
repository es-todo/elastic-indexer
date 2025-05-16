import { Client } from "@elastic/elasticsearch";
import { sleep } from "./sleep.ts";

export async function es_green(client: Client) {
  let green = false;
  while (!green) {
    try {
      const health = await client.cluster.health({
        wait_for_status: "green",
        timeout: "5s",
      });
      green = health.status.toLowerCase() === "green";
    } catch (err) {
      const delay = 500;
      console.error(
        `error connecting to elasticsearch; retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }
}

type create_index_specs = Parameters<Client["indices"]["create"]>[0];

export async function create_index(client: Client, req: create_index_specs) {
  try {
    const res = await client.indices.create(req);
    console.log(res);
  } catch (err: any) {
    if (err.meta?.body?.error?.type === "resource_already_exists_exception") {
      console.log("index already exists");
    } else {
      throw err;
    }
  }
}
