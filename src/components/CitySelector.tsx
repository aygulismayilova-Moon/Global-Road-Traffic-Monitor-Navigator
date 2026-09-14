import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { City } from '../types';
import { WORLD_CITIES, getContinents } from '../data/worldCities';
import { Search, Globe, ChevronDown, Check, MapPin, X, ArrowLeft, Loader2 } from 'lucide-react';

interface CitySelectorProps {
  selectedCity: City;
  onSelectCity: (city: City) => void;
  onSearchCustomLocation?: (query: string) => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  selectedCity,
  onSelectCity,
  _onSearchCustomLocation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<string>('All');
  const [isSearchingWorldwide, setIsSearchingWorldwide] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [customCities, setCustomCities] = useState<City[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 72, left: 16, width: 440 });

  // Dynamically calculate dropdown coordinates relative to trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setDropdownPosition({
        top: Math.max(12, rect.bottom + 6),
        left: 12,
        width: window.innerWidth - 24,
      });
    } else {
      const desiredWidth = 440;
      const maxLeft = Math.max(16, window.innerWidth - desiredWidth - 16);
      const left = Math.max(16, Math.min(rect.left, maxLeft));
      setDropdownPosition({
        top: rect.bottom + 8,
        left,
        width: Math.min(desiredWidth, window.innerWidth - 32),
      });
    }
  };

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const continents = useMemo(() => ['All', ...getContinents()], []);

  // Combined preloaded + custom searched cities
  const allCities = useMemo(() => {
    return [...customCities, ...WORLD_CITIES];
  }, [customCities]);

  // Normalizer for accent-insensitive search (e.g. Baku / Bakı, São Paulo / Sao Paulo)
  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Filter cities: when user is searching, search globally across ALL continents
  const filteredCities = useMemo(() => {
    const rawQ = searchQuery.trim();
    const q = normalizeText(rawQ);
    return allCities.filter((city) => {
      // If user typed a search query, search globally regardless of continent tab
      const matchesContinent =
        q.length > 0
          ? true
          : selectedContinent === 'All' || city.continent === selectedContinent;
      if (!matchesContinent) return false;
      if (!q) return true;
      const normName = normalizeText(city.name);
      const normCountry = normalizeText(city.country);
      const normCode = normalizeText(city.countryCode);
      const normArterials = city.arterials.map((a) => normalizeText(a));
      return (
        normName.includes(q) ||
        normCountry.includes(q) ||
        normCode.includes(q) ||
        normArterials.some((a) => a.includes(q))
      );
    });
  }, [allCities, searchQuery, selectedContinent]);

  // Group filtered cities by country
  const groupedByCountry = useMemo(() => {
    const map = new Map<string, City[]>();
    for (const city of filteredCities) {
      const existing = map.get(city.country) || [];
      existing.push(city);
      map.set(city.country, existing);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredCities]);

  // Reset search and show back all cities
  const handleResetSearch = () => {
    setSearchQuery('');
    setSelectedContinent('All');
    setSearchError(null);
    searchInputRef.current?.focus();
  };

  // Worldwide city geocode search via server Places proxy
  const searchWorldwideLocation = async (queryText: string) => {
    const query = queryText.trim();
    if (!query) return;

    // Check if query directly matches any known city
    const qNorm = normalizeText(query);
    const matched = allCities.find(
      (c) => normalizeText(c.name) === qNorm || normalizeText(c.country) === qNorm
    );
    if (matched) {
      handleSelectCity(matched);
      return;
    }

    setIsSearchingWorldwide(true);
    setSearchError(null);

    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.places) && data.places.length > 0) {
          const place = data.places[0];
          const cityName = place.displayName?.text || query;
          const countryPart =
            place.formattedAddress?.split(',').slice(-1)[0]?.trim() || 'Worldwide';
          const countryCode =
            place.addressComponents?.find((c: any) =>
              c.types?.includes('country')
            )?.shortText || 'LOC';

          const newCity: City = {
            id: `custom-${Date.now()}-${encodeURIComponent(cityName)}`,
            name: cityName,
            country: countryPart,
            countryCode,
            continent: 'Global',
            lat: place.location.latitude,
            lng: place.location.longitude,
            zoom: 12,
            arterials: [
              `${cityName} Central Expressway`,
              `${cityName} Beltway`,
              `${cityName} Main Avenue`,
            ],
            alternativeBypasses: [
              `${cityName} Outer Orbital Bypass`,
              `${cityName} Perimeter Parkway`,
            ],
          };

          setCustomCities((prev) => [newCity, ...prev]);
          handleSelectCity(newCity);
          return;
        }
      }

      // If Places API couldn't locate it, notify user with option to go back
      setSearchError(`Could not pinpoint "${query}". Try searching a major city or country name.`);
    } catch (err: any) {
      console.warn('Places search failed:', err);
      setSearchError(`Search error. Click "Back to all cities" to view available cities.`);
    } finally {
      setIsSearchingWorldwide(false);
    }
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchWorldwideLocation(searchQuery.trim());
    }
  };

  const handleSelectCity = (city: City) => {
    onSelectCity(city);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedContinent('All');
    setSearchError(null);
  };

  const isFiltered = searchQuery.trim().length > 0 || selectedContinent !== 'All';

  return (
    <div className="relative inline-block text-left w-full sm:w-auto">
      {/* Current selection trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id="city-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 w-full sm:w-80 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 transition-all text-left shadow-lg backdrop-blur-md cursor-pointer group"
        title="Click to search and change city"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 group-hover:scale-105 transition-transform">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="truncate">{selectedCity.country}</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 shrink-0">{selectedCity.continent}</span>
            </div>
            <div className="text-sm font-bold text-white truncate flex items-center gap-2">
              <span className="truncate">{selectedCity.name}</span>
              <span className="text-xs font-normal text-slate-400 px-1.5 py-0.2 rounded bg-slate-700/60 shrink-0">
                {selectedCity.countryCode}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Render Backdrop & Dropdown Menu at Document Root using Portal so it's NEVER hidden behind panels or map */}
      {isOpen &&
        createPortal(
          <>
            {/* Full-screen Backdrop overlay */}
            <div
              className="fixed inset-0 z-[9998] bg-slate-950/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsOpen(false)}
            />
            {/* Dropdown Menu Modal positioned directly below the button */}
            <div
              id="city-selector-menu"
              ref={menuRef}
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
              className="fixed z-[9999] rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in fade-in zoom-in-95 duration-150 ring-1 ring-emerald-500/20"
            >
              {/* Header & Search Bar */}
              <div className="p-3 border-b border-slate-800 bg-slate-900/95 shrink-0 space-y-2.5">
                {/* Top row with Back button if filtered, or Title and Close button */}
                <div className="flex items-center justify-between">
                  {isFiltered ? (
                    <button
                      type="button"
                      id="city-selector-back-btn"
                      onClick={handleResetSearch}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
                      title="Show all cities back"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to all cities ({allCities.length})</span>
                    </button>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Select World City ({allCities.length} Cities)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search Input Bar */}
                <form onSubmit={handleCustomSearchSubmit} className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    id="city-search-input"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchError(null);
                    }}
                    placeholder="Search any city, country, or road (e.g. Baku, Paris)..."
                    className="w-full pl-9 pr-16 py-2.5 rounded-xl bg-slate-800/95 border border-slate-700 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {/* Action buttons inside search bar: Clear (X) or Search icon */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleResetSearch}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                        title="Clear search and show all cities"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSearchingWorldwide ? (
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin mr-1" />
                    ) : (
                      searchQuery.trim() && (
                        <button
                          type="submit"
                          className="px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
                          title="Search worldwide on Map"
                        >
                          Go
                        </button>
                      )
                    )}
                  </div>
                </form>

                {/* Continent Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
                  {continents.map((cont) => {
                    const isActive = selectedContinent === cont && !searchQuery;
                    return (
                      <button
                        key={cont}
                        type="button"
                        onClick={() => {
                          setSelectedContinent(cont);
                          setSearchQuery('');
                          setSearchError(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                        }`}
                      >
                        {cont}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Error Message */}
              {searchError && (
                <div className="mx-3 mt-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-2">
                  <span>{searchError}</span>
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="underline text-red-200 hover:text-white shrink-0 font-semibold"
                  >
                    Show All Cities
                  </button>
                </div>
              )}

              {/* List of Countries and Cities */}
              <div className="overflow-y-auto flex-1 p-2 space-y-3 divide-y divide-slate-800/60">
                {groupedByCountry.length === 0 ? (
                  <div className="py-8 text-center px-4 space-y-3">
                    <p className="text-sm text-slate-300 font-medium">
                      No pre-loaded city matches &quot;{searchQuery}&quot;.
                    </p>
                    <p className="text-xs text-slate-400">
                      Search across worldwide Google Maps or return back to all cities.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleResetSearch}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold transition cursor-pointer inline-flex items-center justify-center gap-1.5 border border-slate-700"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                        Back to All Cities ({allCities.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => searchWorldwideLocation(searchQuery)}
                        disabled={isSearchingWorldwide}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                      >
                        {isSearchingWorldwide ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        Search &quot;{searchQuery}&quot; Worldwide
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {groupedByCountry.map(([country, cities]) => (
                      <div key={country} className="pt-2 first:pt-0">
                        <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>{country}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {cities.length} {cities.length === 1 ? 'city' : 'cities'}
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {cities.map((city) => {
                            const isSelected = selectedCity.id === city.id;
                            return (
                              <button
                                key={city.id}
                                type="button"
                                onClick={() => handleSelectCity(city)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-sm transition cursor-pointer group ${
                                  isSelected
                                    ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                                    : 'hover:bg-slate-800/80 text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="truncate font-medium">{city.name}</span>
                                  <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1 rounded shrink-0">
                                    {city.countryCode}
                                  </span>
                                  <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                                    ({city.arterials.length} arterials)
                                  </span>
                                </div>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {/* Worldwide search suggestion when typing */}
                    {searchQuery.trim().length > 1 && (
                      <div className="pt-3 pb-1 text-center border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => searchWorldwideLocation(searchQuery)}
                          disabled={isSearchingWorldwide}
                          className="text-xs text-slate-400 hover:text-emerald-400 transition inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800 cursor-pointer"
                        >
                          {isSearchingWorldwide ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : (
                            <Search className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>
                            Can&apos;t find your road? Search &quot;{searchQuery}&quot; worldwide on Map
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer note with reset button */}
              <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
                {isFiltered ? (
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Show all {allCities.length} cities back</span>
                  </button>
                ) : (
                  <span>Live global traffic radar</span>
                )}
                <span className="text-emerald-400 font-medium">Google Live Routes</span>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
