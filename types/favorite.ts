export type FavoriteItemType =
  | "chat"
  | "doc"
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
