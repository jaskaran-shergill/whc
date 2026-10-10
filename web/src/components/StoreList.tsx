import { useEffect, useRef, useState } from "react";
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
	const skipNextSearch = useRef(false);

	useEffect(() => {
		if (skipNextSearch.current) {
			skipNextSearch.current = false;
			return;
		}
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
		skipNextSearch.current = true;
		setQuery(place.label);
		setSuggestions([]);
		setIsCollapsed(false);
		onSearchPlace(place);
	}

	return (
		<section
			aria-label="Search places and browse nearby stores"
			className="absolute left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
			style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
		>
			<div className="flex items-center gap-2 p-2">
				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					role="combobox"
					aria-label="Search for a location"
					aria-autocomplete="list"
					aria-expanded={suggestions.length > 0}
					placeholder="Search a city or address"
					className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
					onKeyDown={(event) => {
						if (event.key === "Enter" && suggestions[0]) {
							event.preventDefault();
							selectPlace(suggestions[0]);
						}
						if (event.key === "Escape") setSuggestions([]);
					}}
				/>
				<button
					type="button"
					aria-expanded={!isCollapsed}
					onClick={() => setIsCollapsed((collapsed) => !collapsed)}
					className="min-h-11 shrink-0 rounded-md px-2 text-sm text-blue-700"
				>
					{isCollapsed ? "Show" : "Hide"}
				</button>
			</div>
			{(isLoadingStores || storeLoadError) && (
				<p role="status" className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
					{isLoadingStores ? "Loading nearby stores…" : storeLoadError}
				</p>
			)}

			{(suggestions.length > 0 || isSearching) && (
				<div className="border-t border-slate-200">
					{isSearching && <p className="px-4 py-3 text-sm text-slate-500">Searching places…</p>}
					{suggestions.length > 0 && (
						<ul className="max-h-52 overflow-y-auto overscroll-contain py-1" role="listbox">
							{suggestions.map((place) => (
								<li key={`${place.latitude},${place.longitude}`}>
									<button type="button" role="option" aria-selected="false" onClick={() => selectPlace(place)} className="min-h-11 w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50">
										{place.label}
									</button>
								</li>
							))}
						</ul>
					)}
					<p className="border-t border-slate-100 px-4 py-1.5 text-xs text-slate-500">
						Search data © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
					</p>
				</div>
			)}

			{!isCollapsed && (
				<ul className="max-h-[30dvh] divide-y divide-slate-100 overflow-y-auto overscroll-contain">
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
