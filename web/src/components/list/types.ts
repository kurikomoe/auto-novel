interface ListOptionBase {
  hide?: boolean;
}

export interface ListTextOption extends ListOptionBase {
  type: 'text';
  history?: 'web' | 'wenku';
  placeholder?: string;
}

export interface ListSelectOption extends ListOptionBase {
  type: 'select';
  tags: string[];
  multiple?: boolean;
}

export type ListOptions = Record<string, ListTextOption | ListSelectOption>;

export type ListValue<T extends ListOptions> = {
  [K in keyof T]: T[K] extends ListSelectOption
    ? number
    : T[K] extends ListTextOption
      ? string
      : never;
};
