import axios from "axios";

import { type Database } from "./sqlite.ts";
import { forever } from "./forever.ts";

type change = { i: number; type: string; id: string; data: any };

async function poll_changeset(t: number): Promise<change[]> {
  return forever(async () => {
    const res = await axios.get(
      `http://object-reducer:3000/object-apis/poll-change-set?t=${t}`
    );
    return res.data as change[];
  });
}

export async function start_invalidator(db: Database, on_advance: () => void) {
  const res = await db.all<{ value: string }>(
    "select * from meta where key = $1",
    ["t"]
  );
  let last_t = parseInt(res[0]?.["value"] ?? "0");
  console.log({ last_t });
  while (true) {
    last_t += 1;
    const change_set = await poll_changeset(last_t);
    const deps = change_set.map(
      (x) => `${encodeURIComponent(x.type)}:${encodeURIComponent(x.id)}`
    );
    console.log({ deps });
    await db.in_transaction(async () => {
      for (const dep of deps) {
        await db.run(
          `insert or ignore into queue select url_id from dep where dep = $1`,
          [dep]
        );
        await db.run(`delete from dep where dep = $1`, [dep]);
      }
      await db.run(`insert or replace into meta (key, value) values ($1, $2)`, [
        "t",
        last_t,
      ]);
    });
    on_advance();
  }
}
