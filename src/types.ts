export type url_outcome = {
  dependencies: dependency[];
  docs: doc[];
  links: string[];
  priority: number;
};

export type doc = {
  permission: permission;
  title: string;
  body: string;
};

export type permission =
  | { type: "public" }
  | { type: "internal" }
  | { type: "user"; user_id: string }
  | { type: "role"; role: string };

export type dependency = {
  db: string;
  type: string;
  id: string;
};
