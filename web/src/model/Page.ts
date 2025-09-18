export interface Page<T> {
  pageNumber: number;
  items: T[];
}

export interface PageX<T> {
  total: number;
  items: T[];
}
