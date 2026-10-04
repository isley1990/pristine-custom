import { useEffect, useState, type FormEvent } from "react";

import { SearchIcon } from "./icons";

export function ShopToolbar({ q, sort, total, onSearch, onSort, placeholder = "Search by part number, size or brand" }: {
  q: string;
  sort: string;
  total: number;
  onSearch: (q: string) => void;
  onSort: (sort: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState(q);
  useEffect(() => setValue(q), [q]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(value.trim());
  };
  return (
    <div className="pc-toolbar pc-glass">
      <form className="pc-toolbar__search" onSubmit={submit} role="search">
        <label className="pc-sr" htmlFor="shop-q">{placeholder}</label>
        <input id="shop-q" onChange={(e) => setValue(e.target.value)} placeholder={placeholder} type="search" value={value} />
        <button aria-label="Search" type="submit"><SearchIcon /></button>
      </form>
      <p className="pc-toolbar__count">{total.toLocaleString("en-US")} part{total === 1 ? "" : "s"}</p>
      <label className="pc-toolbar__sort">
        <span>Sort</span>
        <select onChange={(e) => onSort(e.target.value)} value={sort}>
          <option value="relevance">Featured</option>
          <option value="name">Name A to Z</option>
          <option value="price-asc">Price low to high</option>
          <option value="price-desc">Price high to low</option>
        </select>
      </label>
    </div>
  );
}
