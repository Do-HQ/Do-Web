import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  label: string;
  optionKey?: string;
  options: { value: string; title: string }[];
  value?: string;
  setValue?: (theme: string) => void;
}

export function Dropdown({
  label,
  options,
  optionKey,
  value,
  setValue,
}: Props) {
  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{optionKey || "Pick an option"}</SelectLabel>
          {options?.map((d) => {
            return (
              <SelectItem value={d?.value} key={d?.value}>
                {d?.title}
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
