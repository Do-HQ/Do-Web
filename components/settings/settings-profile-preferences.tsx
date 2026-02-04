import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "../ui/field";

import { Laptop, Moon, Sun } from "lucide-react";
import { Dropdown } from "../shared/drop-down";
import { useTheme } from "next-themes";
import { Theme } from "@/types";

const SettingsProfileReferences = () => {
  const themes = [
    {
      value: "system",
      label: "System default",
      description: "Matches your device’s appearance settings automatically.",
      icon: Laptop,
    },
    {
      value: "light",
      label: "Light",
      description: "A bright theme that’s easy to read during the day.",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Dark",
      description: "A darker theme that’s easier on the eyes at night.",
      icon: Moon,
    },
  ];

  //   Hooks
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <FieldGroup>
        <FieldSeparator />
        <FieldSet>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-focus-mode">Theme</FieldLabel>
              <FieldDescription>
                Select a theme that works best for you
              </FieldDescription>
            </FieldContent>

            <Dropdown
              label="Themes"
              options={themes?.map((d) => ({
                value: d?.value,
                title: d?.label,
              }))}
              optionKey="Select a theme"
              value={theme}
              setValue={(t) => {
                setTheme(t as Theme);
              }}
            />
          </Field>
        </FieldSet>
      </FieldGroup>
    </div>
  );
};

export default SettingsProfileReferences;
