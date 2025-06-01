import { Client } from "@elastic/elasticsearch";
import { es_green, create_index } from "./es-helpers.ts";
import { Database } from "./sqlite.ts";
import { start_invalidator } from "./invalidator.ts";
import { start_indexer } from "./indexer.ts";
import express from "express";

const port = 3001;

function start_express(client: Client) {
  const app = express();
  app.get("/search-apis/search", (req, res) => {
    const q = req.query.q;
    console.log({ q });
    if (typeof q !== "string") {
      res.status(401).send(`invalid query`);
      return;
    }
    client
      .search({
        index: "docs",
        explain: false,
        query: {
          bool: {
            should: [
              {
                match: {
                  "body.substr": {
                    query: q,
                    boost: 1.0,
                    operator: "and",
                  },
                },
              },
              {
                match: {
                  body: {
                    query: q,
                    boost: 2.0,
                    operator: "and",
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        collapse: {
          field: "url",
        },
      })
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((error) => {
        res.status(500).json(error);
      });
  });
  app.listen(port, () => {
    console.log(`elastic server listening on port ${port}`);
  });
}

async function start() {
  const client = new Client({ node: "http://127.0.0.1:9200" });
  const db = await Database.open("/mnt/queue.db");
  await es_green(client);
  await create_index(client, {
    index: "docs",
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      index: {
        max_ngram_diff: 8,
      },
      analysis: {
        tokenizer: {
          ngram_tokenizer: {
            type: "ngram",
            min_gram: 2,
            max_gram: 10,
            token_chars: ["letter", "digit"],
          },
        },
        analyzer: {
          ngram_analyzer: {
            type: "custom",
            tokenizer: "ngram_tokenizer",
            filter: ["lowercase"],
          },
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
        title: {
          type: "text",
          analyzer: "universal",
          fields: {
            substr: {
              type: "text",
              analyzer: "ngram_analyzer",
              search_analyzer: "standard",
            },
          },
        },
        body: {
          type: "text",
          analyzer: "universal",
          fields: {
            substr: {
              type: "text",
              analyzer: "ngram_analyzer",
              search_analyzer: "standard",
            },
          },
        },
        tag: { type: "keyword" },
        path: { type: "keyword" },
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
  start_express(client);

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
