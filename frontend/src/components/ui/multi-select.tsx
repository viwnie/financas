import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface Option {
    label: string
    value: string
}

interface MultiSelectProps {
    options: Option[]
    selected: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    className?: string
    width?: string
    creatable?: boolean
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    className,
    width = "w-full",
    creatable = false
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    const handleSelect = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((item) => item !== value))
        } else {
            onChange([...selected, value])
        }
    }

    // Calculate label for display
    const getDisplayLabel = () => {
        if (selected.length === 0) return placeholder
        if (selected.length === 1) {
            return options.find((opt) => opt.value === selected[0])?.label || selected[0]
        }
        return `${selected.length} selected`
    }

    // Scroll to selected item execution
    const commandListRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (open && selected.length === 1) {
            // Attempt to scroll to the selected item
            const scroll = () => {
                const selectedOption = options.find(o => o.value === selected[0]);
                if (selectedOption && commandListRef.current) {
                    const query = `[data-selection-key="${selectedOption.value}"]`;
                    const element = commandListRef.current.querySelector(query);
                    if (element) {
                        element.scrollIntoView({ block: 'center' });
                    }
                }
            };

            // Try immediately and slightly delayed to ensure rendering
            requestAnimationFrame(() => {
                scroll();
                setTimeout(scroll, 100);
            });
        }
    }, [open, selected, options]);

    const handleCreateOption = () => {
        if (!inputValue) return;
        const newValue = inputValue.trim();
        if (newValue && !selected.includes(newValue)) {
            onChange([...selected, newValue]);
        }
        setInputValue("");
    }

    // Filter options to check if strict match exists
    const exactMatch = options.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("justify-between font-normal", width, className)}
                >
                    <span className="truncate">
                        {selected.length === options.length && options.length > 1 ? "All" : getDisplayLabel()}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("p-0", width)} align="start">
                <Command defaultValue={selected.length === 1 ? options.find(o => o.value === selected[0])?.label : undefined}>
                    <CommandInput
                        placeholder={`Search ${placeholder.toLowerCase()}...`}
                        value={inputValue}
                        onValueChange={setInputValue}
                    />
                    <CommandList ref={commandListRef}>
                        <CommandEmpty>
                            {creatable && inputValue && !exactMatch ? (
                                <button
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground w-full text-left"
                                    onClick={handleCreateOption}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add "{inputValue}"
                                </button>
                            ) : (
                                "No results found."
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    data-selection-key={option.value}
                                    onSelect={() => handleSelect(option.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.value)
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {creatable && inputValue && !exactMatch && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        value={inputValue}
                                        onSelect={handleCreateOption}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add "{inputValue}"
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
