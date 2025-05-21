import { type object_type } from "schemata/generated/object_type";

type OBJS = {
  obj: object_type;
};

export type fetch = <DB extends keyof OBJS, T extends OBJS[DB]["type"]>(
  db: DB,
  type: T,
  id: string
) => (OBJS[DB] & { type: T })["data"] | null | undefined;
