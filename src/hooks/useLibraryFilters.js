import { useState, useMemo } from "react";
import { RATING_ORDER } from "../lib/bookUtils";

export function useLibraryFilters(books, stats) {
  const [search,       setSearch]       = useState("");
  const [libGenres,    setLibGenres]    = useState([]);
  const [libYears,     setLibYears]     = useState([]);
  const [libAuthors,   setLibAuthors]   = useState([]);
  const [libCountries, setLibCountries] = useState([]);
  const [libFormats,   setLibFormats]   = useState([]);
  const [libMoods,     setLibMoods]     = useState([]);
  const [libArchetypes,setLibArchetypes]= useState([]);
  const [libThemes,    setLibThemes]    = useState([]);
  const [libSort,      setLibSort]      = useState("title");

  const setAllFilters = ({ genres = [], years = [], authors = [], countries = [], formats = [], moods = [], archetypes = [], themes = [] } = {}) => {
    setSearch("");
    setLibGenres(genres);
    setLibYears(years.map(String));
    setLibAuthors(authors);
    setLibCountries(countries);
    setLibFormats(formats);
    setLibMoods(moods);
    setLibArchetypes(archetypes);
    setLibThemes(themes);
  };

  const filteredBooks = useMemo(() =>
    books.filter(b => {
      if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false;
      if (libGenres.length    > 0 && !(b.genre  || []).some(g => libGenres.includes(g)))          return false;
      if (libYears.length     > 0 && !libYears.includes(String(b.year)))                           return false;
      if (libAuthors.length   > 0 && !(b.authors || []).some(a => libAuthors.includes(a.name)))    return false;
      if (libCountries.length > 0 && !libCountries.includes(b.country))                            return false;
      if (libFormats.length   > 0 && !libFormats.includes(b.format || "Unknown"))                  return false;
      if (libMoods.length     > 0 && !libMoods.includes(b.mood))                                   return false;
      if (libArchetypes.length> 0 && !libArchetypes.includes(b.archetype))                         return false;
      if (libThemes.length    > 0 && !(b.theme  || []).some(t => libThemes.includes(t)))           return false;
      return true;
    }).sort((a, b) => {
      if (libSort === "year")   return b.year - a.year;
      if (libSort === "title")  return a.title.localeCompare(b.title);
      if (libSort === "author") return a.author.localeCompare(b.author);
      if (libSort === "rating") {
        const ai = a.rating ? RATING_ORDER.indexOf(a.rating) : 99;
        const bi = b.rating ? RATING_ORDER.indexOf(b.rating) : 99;
        return ai !== bi ? ai - bi : a.title.localeCompare(b.title);
      }
      return 0;
    }), [books, search, libGenres, libYears, libAuthors, libCountries, libFormats, libMoods, libArchetypes, libThemes, libSort]);

  const allYears    = useMemo(() => Object.keys(stats.byYear).sort().reverse(), [stats]);
  const allAuthors  = useMemo(() => [...new Set(books.flatMap(b => (b.authors || []).map(a => a.name)))].sort(), [books]);
  const allCountries= useMemo(() => [...new Set(books.map(b => b.country).filter(Boolean))].sort(), [books]);
  const allFormats  = useMemo(() => [...new Set(books.map(b => b.format || "Unknown"))].sort(), [books]);
  const allMoods    = useMemo(() => [...new Set(books.map(b => b.mood).filter(Boolean))].sort(), [books]);
  const allArchetypes=useMemo(() => [...new Set(books.map(b => b.archetype).filter(Boolean))].sort(), [books]);
  const allThemes   = useMemo(() => [...new Set(books.flatMap(b => b.theme || []))].sort(), [books]);
  const allYearsList= useMemo(() => {
    const years = Object.keys(stats.byYearTracked).map(Number);
    if (!years.length) return [];
    const min = Math.min(...years);
    const max = Math.max(Math.max(...years), new Date().getFullYear());
    const full = [];
    for (let y = min; y <= max; y++) full.push(y);
    return full;
  }, [stats]);
  const allYearsListFull = useMemo(() => Object.keys(stats.byYear).sort().map(Number), [stats]);

  return {
    search, setSearch,
    libGenres, libYears, libAuthors, libCountries, libFormats, libMoods, libArchetypes, libThemes, libSort,
    setLibGenres, setLibYears, setLibAuthors, setLibCountries, setLibFormats, setLibMoods, setLibArchetypes, setLibThemes, setLibSort,
    setAllFilters,
    filteredBooks,
    allYears, allAuthors, allCountries, allFormats, allMoods, allArchetypes, allThemes,
    allYearsList, allYearsListFull,
  };
}
