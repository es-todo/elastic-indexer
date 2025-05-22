import axios from "axios";
import { type Database } from "./sqlite.ts";
import { routes as orig_routes } from "./routes.ts";
import UrlPattern from "url-pattern";
import { type fetch } from "./fetch.ts";
import assert from "node:assert";
import { forever } from "./forever.ts";
import { type doc } from "./types.ts";
import { encode_permission } from "./permission.ts";
import { difference } from "./set-functions.ts";
import { type Client as ES } from "@elastic/elasticsearch";

const routes = orig_routes.map((x) => ({
  ...x,
  pattern: new UrlPattern(x.pattern, {
    segmentNameCharset: "a-zA-Z0-9_-",
  }),
}));

function find_route(url: string) {
  for (const route of routes) {
    const m = route.pattern.match(url);
    if (m) {
      console.log(m);
      return { ...route, params: m };
    }
  }
  throw new Error(`invalid url: "${url}"`);
}

type fetch_result =
  | { found: false }
  | { found: true; t: number; i: number; data: any };

async function do_fetch(type: string, id: string): Promise<fetch_result> {
  return forever(async () => {
    const res = await axios.get(
      `http://object-reducer:3000/object-apis/get-object?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`
    );
    return res.data as any;
  });
}

type url_data = {
  dependencies: { type: string; id: string }[];
  docs: doc[];
  links: string[];
};

async function render_url_data(url: string): Promise<url_data> {
  const route = find_route(url);
  const body_function = route.body(route.params, url);
  const cache: Map<string, Map<string, any>> = new Map();
  const promises: Promise<void>[] = [];
  const dependencies: { type: string; id: string }[] = [];
  const fetch: fetch = (db, type, id) => {
    assert(db === "obj");
    const c0 = ((c0) => {
      if (c0 === undefined) {
        const c0 = new Map<string, any>();
        cache.set(type, c0);
        return c0;
      } else {
        return c0;
      }
    })(cache.get(type));
    if (c0.has(id)) {
      return c0.get(id);
    }
    c0.set(id, undefined);
    promises.push(
      do_fetch(type, id).then((v) => {
        switch (v.found) {
          case true: {
            c0.set(id, v.data);
            return;
          }
          case false: {
            c0.set(id, null);
            return;
          }
          default:
            const invalid: never = v;
            throw invalid;
        }
      })
    );
    dependencies.push({ type, id });
    return undefined;
  };
  while (true) {
    const outcome = body_function(fetch);
    if (promises.length === 0) {
      return { ...outcome, dependencies };
    } else {
      await Promise.all(promises);
      promises.splice(0, promises.length);
    }
  }
}

async function index_url(es: ES, db: Database, url: string) {
  console.log(`indexing "${url}" ...`);
  const { dependencies, docs, links } = await render_url_data(url);
  console.log({ url, dependencies, docs, links });
  const existing_perms = (
    await db.all<{ perm: string }>(`select perm from doc where url_id = $1`, [
      url,
    ])
  ).map((x) => x.perm);
  const existing_deps = (
    await db.all<{ dep: string }>(`select dep from dep where url_id = $1`, [
      url,
    ])
  ).map((x) => x.dep);
  const new_perms = docs.map(({ permission }) => encode_permission(permission));
  const new_deps = dependencies.map(
    ({ type, id }) => `${encodeURIComponent(type)}:${encodeURIComponent(id)}`
  );
  const to_remove_perms = difference(existing_perms, new_perms);
  const to_add_perms = difference(new_perms, existing_perms);
  console.log({ to_remove_perms, to_add_perms });
  for (const doc of docs) {
    console.log(doc);
    const perm = encode_permission(doc.permission);
    const res = await es.index({
      index: doc.index,
      id: `${perm}:${url}`,
      body: {
        permission: perm,
        url: url,
        title: doc.title,
        body: doc.body,
        tag: doc.tags,
      },
    });
    console.log(res);
  }
  for (const perm of to_remove_perms) {
    console.log(perm);
    throw new Error("TODO remove doc from elastic");
  }
  await db.in_transaction(async () => {
    for (const perm of to_add_perms) {
      console.log(`adding ${url} ${perm}`);
      await db.run(`insert into doc (url_id, perm) values ($1, $2)`, [
        url,
        perm,
      ]);
    }
    for (const perm of to_remove_perms) {
      console.log(perm);
      throw new Error("TODO remove doc from sqlite");
    }
    for (const dep of difference(existing_deps, new_deps)) {
      throw new Error(`TODO remove dep ${dep}`);
    }
    for (const dep of difference(new_deps, existing_deps)) {
      await db.run(`insert into dep (url_id, dep) values ($1, $2)`, [url, dep]);
    }
    for (const link of links) {
      const existing_rows = await db.all(
        `select * from url where url_id = $1`,
        [link]
      );
      if (existing_rows.length === 0) {
        await db.run(`insert into url (url_id) values ($1)`, [link]);
        await db.run(`insert into queue (url_id) values ($1)`, [link]);
      }
    }
    await db.run(`delete from queue where url_id = $1`, [url]);
  });
}

async function index_once(es: ES, db: Database) {
  const res = await db.all<{ url_id: string }>(
    "select * from queue limit 1",
    []
  );
  if (res.length === 0) {
    return false;
  } else {
    const { url_id } = res[0];
    await index_url(es, db, url_id);
    return true;
  }
}

async function index_many(es: ES, db: Database) {
  while (true) {
    if ((await index_once(es, db)) === false) {
      return;
    }
  }
}

export function start_indexer(es: ES, db: Database): () => void {
  let scheduled = false;
  let promise = index_many(es, db);
  function halted() {
    if (!scheduled) return;
    scheduled = false;
    promise = index_many(es, db);
  }
  function resume() {
    if (scheduled) return;
    scheduled = true;
    promise.then(halted);
  }
  return resume;
}
