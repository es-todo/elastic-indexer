import { type permission } from "./types.ts";

export function encode_permission(permission: permission) {
  switch (permission.type) {
    case "public":
      return "public";
    case "internal":
      return "internal";
    case "user":
      return `user:${encodeURIComponent(permission.user_id)}`;
    case "role":
      return `role:${encodeURIComponent(permission.role)}`;
    default:
      const invalid: never = permission;
      throw invalid;
  }
}
