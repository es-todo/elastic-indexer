import { type url_outcome } from "./types.ts";
import { type fetch } from "./fetch.ts";

type route = {
  pattern: string;
  priority: number;
  body: (
    params: Record<string, string>,
    url: string
  ) => (fetch: fetch) => Omit<url_outcome, "dependencies" | "priority">;
};

export const routes: route[] = [
  {
    pattern: "/users",
    priority: 10,
    body: () => (fetch) => {
      const root = fetch("obj", "users_ll", "root");
      console.log({ root });
      return { docs: [], links: root?.next ? [`/user/${root.next}`] : [] };
    },
  },
  {
    pattern: "/user/:user_id",
    priority: 10,
    body:
      ({ user_id }) =>
      (fetch) => {
        const ll = fetch("obj", "users_ll", user_id);
        const user = fetch("obj", "user", user_id);
        return {
          docs: [
            {
              index: "docs",
              permission: { type: "role", role: "account-manager" },
              title: user?.email ?? "",
              body: "",
              tags: [],
            },
          ],
          links: ll?.next ? [`/user/${ll.next}`] : [],
        };
      },
  },
  {
    pattern: "/",
    priority: 10,
    body: (_url) => {
      return (_fetch) => {
        return {
          docs: [],
          links: ["/users"],
        };
      };
    },
  },
];
