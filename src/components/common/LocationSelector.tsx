"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  CountryStateCityAPI,
  CountryItem,
  StateItem,
  CityItem,
} from "@/services/api/countryStateCityService";
import {
  Loader2,
  ChevronDown,
  Globe,
  MapPin,
  Building2,
  Search,
  Check,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface LocationValue {
  country: string;
  countryName?: string;
  state: string;
  stateName?: string;
  city: string;
  cityName?: string;
}

interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  emoji?: string;
}

interface SearchableSelectProps {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  emptyText?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  icon,
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  required = false,
  emptyText = "No results found",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const listRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value.toLowerCase() === value.toLowerCase()),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  // Keep highlighted index in sync with search
  useEffect(() => {
    if (filteredOptions.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions]);

  // Native wheel and touch event capture to completely bypass Dialog's react-remove-scroll
  useEffect(() => {
    const el = listRef.current;
    if (!open || !el) return;

    const stopPropagation = (e: Event) => {
      e.stopPropagation();
    };

    // Attach native listeners directly so wheel/touch never bubbles to document
    el.addEventListener("wheel", stopPropagation, { passive: true });
    el.addEventListener("touchmove", stopPropagation, { passive: true });

    return () => {
      el.removeEventListener("wheel", stopPropagation);
      el.removeEventListener("touchmove", stopPropagation);
    };
  }, [open]);

  // Scroll highlighted item into view for keyboard navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < filteredOptions.length
      ) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="form-group flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
        {icon}
        <span>{label}</span> {required && <span className="text-red-500">*</span>}
      </label>

      <Popover
        open={open}
        onOpenChange={(val) => {
          if (!disabled) {
            setOpen(val);
            if (!val) {
              setSearch("");
              setHighlightedIndex(-1);
            }
          }
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full h-9 pl-3 pr-2.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-between gap-1.5 transition-colors text-left",
              !selectedOption && "text-slate-400 font-normal"
            )}
          >
            <span className="truncate flex-1">
              {selectedOption ? (
                <span className="flex items-center gap-1.5 text-slate-800 font-medium">
                  {selectedOption.emoji && <span className="shrink-0">{selectedOption.emoji}</span>}
                  <span className="truncate">{selectedOption.label}</span>
                </span>
              ) : (
                placeholder
              )}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[340px] p-0 bg-white rounded-lg border border-slate-200 shadow-lg z-9999"
        >
          {/* Search Input Bar */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70 rounded-t-lg">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              autoFocus
              className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1 text-xs overscroll-contain"
            style={{
              overscrollBehavior: "contain",
              scrollbarWidth: "thin",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value.toLowerCase() === value.toLowerCase();
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "w-full px-2.5 py-1.5 text-xs rounded-md text-left flex items-center justify-between gap-2 transition-colors cursor-pointer",
                      isSelected
                        ? "bg-blue-50 text-blue-900 font-semibold"
                        : isHighlighted
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                    )}
                  >
                    <span className="truncate flex items-center gap-1.5 flex-1">
                      {opt.emoji && <span className="shrink-0">{opt.emoji}</span>}
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          ({opt.subLabel})
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface LocationSelectorProps {
  apiKey?: string;
  onLocationChange?: (location: LocationValue) => void;
  onAddState?: (stateName: string, stateIso2?: string) => void;
  onAddCity?: (cityName: string, stateName?: string) => void;
  initialCountry?: string;
  initialState?: string;
  initialCity?: string;
  required?: boolean;
  disabled?: boolean;
  disableCity?: boolean;
  disableCityReason?: string;
  existingStates?: string[];
  className?: string;
  showAddButton?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  apiKey,
  onLocationChange,
  onAddState,
  onAddCity,
  initialCountry = "IN",
  initialState = "",
  initialCity = "",
  required = false,
  disabled = false,
  disableCity = false,
  disableCityReason = "Cities cannot be selected when multiple states are selected",
  existingStates = [],
  className = "",
  showAddButton = false,
}) => {
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [states, setStates] = useState<StateItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry);
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [loading, setLoading] = useState<boolean>(false);

  const api = useMemo(() => new CountryStateCityAPI(apiKey), [apiKey]);

  const prevCountryRef = React.useRef(selectedCountry);
  const prevStateRef = React.useRef(selectedState);

  // Load countries on component mount
  useEffect(() => {
    let isMounted = true;
    const loadCountries = async () => {
      try {
        setLoading(true);
        const countriesData = await api.getCountries();
        if (isMounted) {
          setCountries(countriesData);
        }
      } catch (error) {
        console.error("Failed to load countries:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadCountries();
    return () => {
      isMounted = false;
    };
  }, [api]);

  // Load states when country changes
  useEffect(() => {
    let isMounted = true;
    if (selectedCountry) {
      const loadStates = async () => {
        try {
          setLoading(true);
          const statesData = await api.getStates(selectedCountry);
          if (isMounted) {
            setStates(statesData);
            if (prevCountryRef.current !== selectedCountry) {
              setSelectedState("");
              setCities([]);
              setSelectedCity("");
            }
            prevCountryRef.current = selectedCountry;
          }
        } catch (error) {
          console.error("Failed to load states:", error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      loadStates();
    } else {
      setStates([]);
      setCities([]);
      setSelectedState("");
      setSelectedCity("");
      prevCountryRef.current = "";
    }
    return () => {
      isMounted = false;
    };
  }, [selectedCountry, api]);

  // Load cities when state changes
  useEffect(() => {
    let isMounted = true;

    if (disableCity) {
      setCities([]);
      setSelectedCity("");
      return;
    }

    if (selectedCountry && selectedState) {
      const loadCities = async () => {
        try {
          setLoading(true);
          const citiesData = await api.getCities(selectedCountry, selectedState);
          if (isMounted) {
            setCities(citiesData);
            if (prevStateRef.current !== selectedState) {
              setSelectedCity("");
            }
            prevStateRef.current = selectedState;
          }
        } catch (error) {
          console.error("Failed to load cities:", error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      loadCities();
    } else {
      setCities([]);
      setSelectedCity("");
      prevStateRef.current = "";
    }
    return () => {
      isMounted = false;
    };
  }, [selectedCountry, selectedState, disableCity, api]);

  // Notify parent component on selection changes
  const notifyChange = (countryIso: string, stateIso: string, cityIdOrName: string) => {
    if (!onLocationChange) return;

    const matchedCountry = countries.find((c) => c.iso2 === countryIso);
    const matchedState = states.find((s) => s.iso2 === stateIso);
    const matchedCity = cities.find(
      (c) => String(c.id) === String(cityIdOrName) || c.name === cityIdOrName
    );

    onLocationChange({
      country: countryIso,
      countryName: matchedCountry?.name,
      state: stateIso,
      stateName: matchedState?.name,
      city: cityIdOrName,
      cityName: matchedCity?.name || cityIdOrName,
    });
  };

  const handleCountryChange = (val: string) => {
    setSelectedCountry(val);
    notifyChange(val, "", "");
  };

  const handleStateChange = (val: string) => {
    setSelectedState(val);
    notifyChange(selectedCountry, val, "");
  };

  const handleCityChange = (val: string) => {
    setSelectedCity(val);
    notifyChange(selectedCountry, selectedState, val);
  };

  const handleAddStateClick = () => {
    if (!selectedState) return;
    const stateObj = states.find((s) => s.iso2.toLowerCase() === selectedState.toLowerCase());
    const stateName = stateObj?.name || selectedState;
    if (onAddState) {
      onAddState(stateName, selectedState);
    }
  };

  const handleAddCityClick = () => {
    if (disableCity || !selectedCity) return;
    const cityObj = cities.find(
      (c) =>
        String(c.id).toLowerCase() === String(selectedCity).toLowerCase() ||
        c.name.toLowerCase() === selectedCity.toLowerCase()
    );
    const cityName = cityObj?.name || selectedCity;
    const stateObj = states.find((s) => s.iso2.toLowerCase() === selectedState.toLowerCase());
    const stateName = stateObj?.name || selectedState;
    if (onAddCity) {
      onAddCity(cityName, stateName);
    }
  };

  const countryOptions: SearchableOption[] = useMemo(() => {
    return countries.map((c) => ({
      value: c.iso2,
      label: c.name,
      subLabel: c.iso2,
      emoji: c.emoji,
    }));
  }, [countries]);

  const stateOptions: SearchableOption[] = useMemo(() => {
    return states.map((s) => ({
      value: s.iso2,
      label: s.name,
      subLabel: s.iso2,
    }));
  }, [states]);

  const cityOptions: SearchableOption[] = useMemo(() => {
    return cities.map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [cities]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 3 Searchable Dropdown Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <SearchableSelect
          id="country"
          label="Country"
          icon={<Globe className="w-3 h-3 text-slate-400" />}
          options={countryOptions}
          value={selectedCountry}
          onChange={handleCountryChange}
          placeholder="Select Country"
          searchPlaceholder="Search country (e.g. India)..."
          disabled={disabled || loading}
          required={required}
          emptyText="No country found"
        />

        <SearchableSelect
          id="state"
          label="State / Province"
          icon={<MapPin className="w-3 h-3 text-slate-400" />}
          options={stateOptions}
          value={selectedState}
          onChange={handleStateChange}
          placeholder="Select State"
          searchPlaceholder="Search state (e.g. Maharashtra)..."
          disabled={disabled || loading || !selectedCountry}
          required={required}
          emptyText="No state found"
        />

        <SearchableSelect
          id="city"
          label="City"
          icon={<Building2 className="w-3 h-3 text-slate-400" />}
          options={cityOptions}
          value={selectedCity}
          onChange={handleCityChange}
          placeholder={
            disableCity
              ? disableCityReason
              : !selectedCountry
              ? "Select country first"
              : !selectedState
              ? "Select state first"
              : cities.length === 0
              ? "No cities available"
              : "Select City (optional)"
          }
          searchPlaceholder="Search city (e.g. Mumbai)..."
          disabled={disabled || loading || !selectedState || disableCity}
          required={required}
          emptyText="No city found"
        />
      </div>

      {/* Action / Add Bar */}
      {showAddButton && (onAddState || onAddCity) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/80 mt-1">
          <div className="text-[11px] text-slate-600 min-w-0 truncate">
            {selectedState ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">Target:</span>
                <span className="font-semibold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded text-[11px]">
                  {states.find((s) => s.iso2 === selectedState)?.name || selectedState}
                </span>
                {selectedCity && !disableCity && (
                  <>
                    <span className="text-slate-400">&bull;</span>
                    <span className="font-semibold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded text-[11px]">
                      {cities.find((c) => String(c.id) === String(selectedCity) || c.name === selectedCity)?.name ||
                        selectedCity}
                    </span>
                  </>
                )}
                {disableCity && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                    {disableCityReason}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 italic">Select a state above to add to jurisdiction</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {onAddState && (
              <button
                type="button"
                onClick={handleAddStateClick}
                disabled={!selectedState}
                className="h-8 px-3 text-[11px] font-semibold rounded-lg bg-[#0F2557] text-white hover:bg-[#0F2557]/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                + Add State
              </button>
            )}

            {onAddCity && (
              <button
                type="button"
                onClick={handleAddCityClick}
                disabled={!selectedCity || disableCity}
                title={disableCity ? disableCityReason : undefined}
                className="h-8 px-3 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                + Add City
              </button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Loading location data...</span>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
