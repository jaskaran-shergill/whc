import type { LocationData } from "./MarkerPopup";
import { useState } from "react";

export interface Coordinates {
	latitude: number;
	longitude: number;
}

interface StoreListProps {
	stores: LocationData[];
	userLocation: Coordinates | null;
	selectedStoreId: LocationData["id"] | null;
	onSelect: (store: LocationData) => void;
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

export default function StoreList({ stores, userLocation, selectedStoreId, onSelect }: StoreListProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	if (!stores.length) return null;

	const sortedStores = userLocation
		? [...stores].sort((a, b) => getDistanceInKm(userLocation, a) - getDistanceInKm(userLocation, b))
		: stores;

	return (
		<section
			aria-label="Stores sorted by distance"
			className="absolute left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
			style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
		>
			<header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
				<strong className="text-sm font-semibold text-slate-900">Nearby stores</strong>
				<div className="flex items-center gap-3">
					<span className="text-xs text-slate-500">{stores.length}</span>
					<button
						type="button"
						aria-expanded={!isCollapsed}
						onClick={() => setIsCollapsed((collapsed) => !collapsed)}
						className="min-h-10 px-2 text-sm text-blue-700"
					>
						{isCollapsed ? "Show list" : "Hide list"}
					</button>
				</div>
			</header>
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
