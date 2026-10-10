import { useEffect, useState } from "react";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { AltArrowUpIcon } from "@solar-icons/react/linear/alt-arrow-up";
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier";
import type { LocationData } from "./MarkerPopup";

export interface Coordinates {
	latitude: number;
	longitude: number;
}

export interface PlaceSuggestion extends Coordinates {
	label: string;
}

interface StoreListProps {
	stores: LocationData[];
	userLocation: Coordinates | null;
	selectedStoreId: LocationData["id"] | null;
	isLoadingStores: boolean;
	storeLoadError: string | null;
	onSelect: (store: LocationData) => void;
	onSearchPlace: (place: PlaceSuggestion) => void;
}

function getDistanceInKm(from: Coordinates, to: LocationData): number {
	const radians = (degrees: number) => (degrees * Math.PI) / 180;
	const latitudeDifference = radians(to.lat - from.latitude);
	const longitudeDifference = radians(to.lng - from.longitude);
	const a = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDifference / 2) ** 2;
	return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance: number): string {
	return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
}

function getPlaceLabel(properties: Record<string, string | undefined>): string {
	const locality = properties.city ?? properties.town ?? properties.village ?? properties.county;
	return [properties.name, properties.street, locality, properties.state, properties.country].filter(Boolean).filter((part, index, all) => all.indexOf(part) === index).join(", ");
}

export default function StoreList({ stores, userLocation, selectedStoreId, isLoadingStores, storeLoadError, onSelect, onSearchPlace }: StoreListProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	useEffect(() => {
		const searchTerm = query.trim();
		if (searchTerm.length < 3) {
			setSuggestions([]);
			setIsSearching(false);
			return;
		}

		const controller = new AbortController();
		const timeout = window.setTimeout(async () => {
			setIsSearching(true);
			try {
				const params = new URLSearchParams({ q: searchTerm, limit: "5", lang: "en" });
				if (userLocation) {
					params.set("lat", String(userLocation.latitude));
					params.set("lon", String(userLocation.longitude));
				}
				const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal: controller.signal });
				if (!response.ok) throw new Error("Place search failed");
				const result = await response.json();
				const places = result.features.flatMap((feature: any) => {
					const [longitude, latitude] = feature.geometry.coordinates;
					const label = getPlaceLabel(feature.properties);
					return label && Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ latitude, longitude, label }] : [];
				});
				setSuggestions(places);
			} catch (error) {
				if (!controller.signal.aborted) setSuggestions([]);
			} finally {
				if (!controller.signal.aborted) setIsSearching(false);
			}
		}, 350);

		return () => {
			window.clearTimeout(timeout);
			controller.abort();
		};
	}, [query, userLocation]);

	const sortedStores = userLocation
		? [...stores].sort((a, b) => getDistanceInKm(userLocation, a) - getDistanceInKm(userLocation, b))
		: stores;

	function selectPlace(place: PlaceSuggestion) {
		setQuery("");
		setSuggestions([]);
		setIsCollapsed(false);
		onSearchPlace(place);
	}

	return (
		<section
			aria-label="Search places and browse nearby stores"
			className="absolute bottom-3 left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
		>
			<div className="flex items-center gap-2 p-2">
				<div className="relative min-w-0 flex-1">
					<MagnifierIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={18} color="#94a3b8" aria-hidden="true" />
				<input
					value={query}
					onChange={(event) => {
						const value = event.target.value;
						setQuery(value);
						setSuggestions([]);
						setIsSearching(value.trim().length >= 3);
					}}
					role="combobox"
					aria-label="Search for a location"
					aria-autocomplete="list"
					aria-expanded={suggestions.length > 0}
					placeholder="Search a city or address"
					className="h-9 w-full rounded-full bg-slate-100 pl-10 pr-4 text-base text-slate-900 outline-none placeholder:text-slate-500"
					onKeyDown={(event) => {
						if (event.key === "Enter" && suggestions[0]) {
							event.preventDefault();
							selectPlace(suggestions[0]);
						}
						if (event.key === "Escape") {
							setQuery("");
							setSuggestions([]);
							setIsSearching(false);
						}
					}}
					/>
				</div>
				<button
					type="button"
					aria-label={isCollapsed ? "Show nearby stores" : "Hide nearby stores"}
					aria-expanded={!isCollapsed}
					onClick={() => setIsCollapsed((collapsed) => !collapsed)}
					className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
				>
					{isCollapsed ? <AltArrowUpIcon size={18} aria-hidden="true" /> : <AltArrowDownIcon size={18} aria-hidden="true" />}
				</button>
			</div>
			{(isLoadingStores || storeLoadError) && (
				<p role="status" className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
					{isLoadingStores ? "Loading nearby stores…" : storeLoadError}
				</p>
			)}

			{!isCollapsed && query.trim() && (
				<div className="border-t border-slate-200">
					{suggestions.length > 0 ? (
						<ul className="store-list-scroll max-h-[30dvh] divide-y divide-slate-100 overflow-y-auto overscroll-contain" role="listbox">
							{suggestions.map((place) => (
								<li key={`${place.latitude},${place.longitude}`}>
									<button type="button" role="option" aria-selected="false" onClick={() => selectPlace(place)} className="min-h-12 w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50">
										{place.label}
									</button>
								</li>
							))}
						</ul>
					) : (
						<p role="status" className="px-4 py-3 text-sm text-slate-500">
							{query.trim().length < 3 ? "Type at least 3 characters to search." : isSearching ? "Searching places…" : "No places found."}
						</p>
					)}
					{suggestions.length > 0 && <p className="border-t border-slate-100 px-4 py-1.5 text-xs text-slate-500">Search data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></p>}
				</div>
			)}

			{!isCollapsed && !query.trim() && (
				<ul className="store-list-scroll max-h-[30dvh] divide-y divide-slate-100 overflow-y-auto overscroll-contain">
					{sortedStores.map((store) => {
						const distance = userLocation ? getDistanceInKm(userLocation, store) : null;
						const isSelected = store.id === selectedStoreId;
						return (
							<li key={store.id}>
								<button
									type="button"
									onClick={() => {
										onSelect(store);
										setIsCollapsed(true);
									}}
									aria-pressed={isSelected}
									className={`flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left ${isSelected ? "bg-slate-50" : "bg-white"}`}
								>
									{store.imageUrl && <img src={store.imageUrl} alt="" loading="lazy" className="h-10 w-14 shrink-0 rounded object-cover" />}
									<span className="min-w-0 flex-1 text-sm leading-snug text-slate-900">{store.name}</span>
									<span className="shrink-0 text-xs text-slate-500">{distance === null ? "" : formatDistance(distance)}</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
