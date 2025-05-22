import { Client } from "@elastic/elasticsearch";
import { es_green, create_index } from "./es-helpers.ts";
import { Database } from "./sqlite.ts";
import { start_invalidator } from "./invalidator.ts";
import { start_indexer } from "./indexer.ts";

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
  await db.run(
    `create table if not exists meta (
       key text not null primary key,
       value text not null)`,
    []
  );
  await db.run(
    `create table if not exists url (url_id text not null primary key)`,
    []
  );
  await db.run(
    `create table if not exists doc (
       url_id text not null,
       perm text not null,
       primary key (url_id, perm),
       foreign key (url_id) references url (url_id)
     )`,
    []
  );
  await db.run(
    `create table if not exists dep (
       url_id text not null,
       dep text not null,
       primary key (url_id, dep),
       foreign key (url_id) references url (url_id)
     )`,
    []
  );
  await db.run(`create index if not exists dep_idx on dep (dep)`, []);
  await db.run(
    `create table if not exists queue (
       url_id text not null,
       primary key (url_id),
       foreign key (url_id) references url (url_id)
     )`,
    []
  );
  await db.run(`delete from queue where url_id = $1`, ["/"]);
  await db.run(`insert into queue (url_id) values ($1)`, ["/"]);
  await db.run(`insert or ignore into url (url_id) values ($1)`, ["/"]);

  const resume = start_indexer(client, db);
  await start_invalidator(db, resume);
  //await db.run("drop table if exists tmp", []);
  //await db.run("create table if not exists tmp(id any)", []);
  //await db.run("delete from tmp", []);
  //await db.run("insert into tmp (id) values ($1)", [Math.random()]);
  //await db.run("insert into tmp (id) values ($1)", ["myself"]);
  //const rows = await db.all<{ id: number }>("select * from tmp", []);
  //console.log(rows);

  await db.close();
  await client.close();
}

start().catch((err) => {
  console.error("Fatal Error!");
  console.error(err);
  process.exit(1);
});
