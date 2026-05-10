export type FavoriteItemType =
  | "chat"
  | "doc"
  | "jam"
  | "workflow"
  | "task"
  | "subtask"
  | "risk"
  | "issue";

export type AppFavoriteItem = {
  key: string;
  type: FavoriteItemType;
  label: string;
  href: string;
  subtitle?: string;
  createdAt: number;
};
