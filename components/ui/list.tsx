interface Props {
  items: string[];
}

export function List({ items }: Props) {
  return (
    <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
      {items?.map((d) => {
        return <li key={d}>{d}</li>;
      })}
    </ul>
  );
}
