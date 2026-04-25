export type DocEntry = {
  index: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  tag?: string;
  href: string;
};
