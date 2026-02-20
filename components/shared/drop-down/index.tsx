import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import * as React from "react";
import { Check, ChevronsUpDown, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { FieldLabel, Field, FieldContent } from "@/components/ui/field";
import LoaderComponent from "../loader";

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
      <SelectTrigger className="w-full">
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

type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  loading?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  loading,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggleOption = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Field>
        <FieldLabel
          data-slot="select-label"
          className={cn(
            "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
            "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-4",
            "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
          )}
        >
          Testt
        </FieldLabel>
        <FieldContent>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between"
            >
              <div className="flex gap-1 flex-wrap">
                {value.length === 0 && (
                  <span className="text-muted-foreground">{placeholder}</span>
                )}
                {value.map((val) => {
                  const option = options.find((o) => o.value === val);
                  return (
                    <Badge key={val} variant="secondary" className="capitalize">
                      {option?.label}
                    </Badge>
                  );
                })}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-full p-0 capitalize">
            <Command>
              <CommandInput placeholder="Search..." />
              <CommandEmpty>No results found.</CommandEmpty>
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader className="animate-spin" size={16} />
                </div>
              )}

              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                    className="capitalize"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 ",
                        value.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </FieldContent>
      </Field>
    </Popover>
  );
}
