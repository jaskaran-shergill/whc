import type { LocationData } from "./MarkerPopup";

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
	if (!stores.length) return null;

	const sortedStores = userLocation
		? [...stores].sort((a, b) => getDistanceInKm(userLocation, a) - getDistanceInKm(userLocation, b))
		: stores;

	return (
		<section
			aria-label="Stores sorted by distance"
			className="absolute left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
			style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
		>
			<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
				<strong className="text-sm font-semibold text-slate-900">Nearby stores</strong>
				<span className="text-xs text-slate-500">{stores.length}</span>
			</header>
			<ul className="max-h-[30dvh] divide-y divide-slate-100 overflow-y-auto overscroll-contain">
				{sortedStores.map((store) => {
					const distance = userLocation ? getDistanceInKm(userLocation, store) : null;
					const isSelected = store.id === selectedStoreId;

					return (
						<li key={store.id}>
							<button
								type="button"
								onClick={() => onSelect(store)}
								aria-pressed={isSelected}
								className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left ${isSelected ? "bg-slate-50" : "bg-white"}`}
							>
								<span className="truncate text-sm text-slate-900">{store.name}</span>
								<span className="shrink-0 text-xs text-slate-500">{distance === null ? "" : formatDistance(distance)}</span>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
