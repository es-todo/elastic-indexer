export type url_outcome = {
  dependencies: dependency[];
  docs: doc[];
  urls: string[];
};

export type doc = {
  permission: permission;
  titles: string[];
  body: string[];
};

export type permission =
  | { type: "public" }
  | { type: "user"; user_id: string }
  | { type: "role"; role: string };

export type dependency = {
  db: string;
  type: string;
  id: string;
};
