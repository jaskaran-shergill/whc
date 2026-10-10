import Map, { type MapRef, Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import mapStyleUrl from "./assets/map.json?url";
import MarkerPopup, { type LocationData } from "./components/MarkerPopup";
import StoreList, { type Coordinates } from "./components/StoreList";
import { useEffect, useRef, useState } from "react";

function getRestaurantImageUrl(assetId?: string): string | undefined {
	const match = assetId?.match(/^image-(.+-\d+x\d+)-([a-z0-9]+)$/i);
	if (!match) return undefined;

	const [, filename, extension] = match;
	return `https://cdn.sanity.io/images/czqk28jt/prod_th_ca/${filename}.${extension}?w=750&q=40&fit=max&auto=format`;
}

const CN_TOWER = { latitude: 43.6426, longitude: -79.3871 };

function App() {
	const mapRef = useRef<MapRef>(null);
	const storeRequestId = useRef(0);

	const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
	const [locations, setLocations] = useState<LocationData[]>([]);
	const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
	const [isLocating, setIsLocating] = useState(true);
	const [isLoadingStores, setIsLoadingStores] = useState(false);
	const [storeLoadError, setStoreLoadError] = useState<string | null>(null);

	async function fetchLocation(userLat: number, userLng: number) {
		const requestId = ++storeRequestId.current;
		setIsLoadingStores(true);
		setStoreLoadError(null);
		try {
			const response = await fetch("https://whc-api.shergill.dev", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ userLat, userLng }),
			});
			if (!response.ok) throw new Error("Store search failed");

			const data = await response.json();
			if (!Array.isArray(data)) throw new Error("Store search returned invalid data");
			const locationList: LocationData[] = data.map((e: any) => ({
				id: e.storeId,
				name: e.name,
				lat: e.latitude,
				lng: e.longitude,
				color: "#f54269",
				imageUrl: getRestaurantImageUrl(e.restaurantImage?.asset?._id),
				status: e.status,
				timezone: e.timezone,
				diningRoomHours: e.diningRoomHours,
			}));
			if (requestId === storeRequestId.current) setLocations(locationList);
		} catch {
			if (requestId === storeRequestId.current) setStoreLoadError("Could not load nearby stores.");
		} finally {
			if (requestId === storeRequestId.current) setIsLoadingStores(false);
		}
	}

	useEffect(() => {
		let active = true;
		const useLocation = (latitude: number, longitude: number, zoom: number) => {
			if (!active) return;
			mapRef.current?.getMap().jumpTo({ center: [longitude, latitude], zoom });
			setUserLocation({ latitude, longitude });
			setIsLocating(false);
			void fetchLocation(latitude, longitude);
		};

		if (!navigator.geolocation) {
			useLocation(CN_TOWER.latitude, CN_TOWER.longitude, 14);
		} else {
			navigator.geolocation.getCurrentPosition(
				({ coords }) => useLocation(coords.latitude, coords.longitude, 15),
				() => useLocation(CN_TOWER.latitude, CN_TOWER.longitude, 14),
				{ enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 },
			);
		}

		return () => {
			active = false;
		};
	}, []);
	return (
		<main className="map-screen">
			<Map initialViewState={{ longitude: -79.3871, latitude: 43.6426, zoom: 14 }} ref={mapRef} style={{ width: "100%", height: "100%" }} mapStyle={mapStyleUrl}>
				<NavigationControl position="top-right" />

				{userLocation && <Marker longitude={userLocation.longitude} latitude={userLocation.latitude} color="#4263f5" />}

				{locations.map((loc) => (
					<Marker
						key={loc.id}
						longitude={loc.lng}
						latitude={loc.lat}
						color={loc.color || "#ff4757"}
						onClick={(event) => {
							event.originalEvent.stopPropagation();
							setSelectedLocation(loc);
						}}
					/>
				))}

				{selectedLocation && <MarkerPopup location={selectedLocation} onClose={() => setSelectedLocation(null)} />}
			</Map>
			<StoreList
				stores={locations}
				userLocation={userLocation}
				selectedStoreId={selectedLocation?.id ?? null}
				isLoadingStores={isLoadingStores}
				storeLoadError={storeLoadError}
				onSelect={(location) => {
					setSelectedLocation(location);
					mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: 600 });
				}}
				onSearchPlace={(place) => {
					setSelectedLocation(null);
					setUserLocation({ latitude: place.latitude, longitude: place.longitude });
					mapRef.current?.flyTo({ center: [place.longitude, place.latitude], zoom: 13, duration: 600 });
					void fetchLocation(place.latitude, place.longitude);
				}}
			/>
			{isLocating && (
				<div role="status" className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white text-slate-900">
					<span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
					<span className="text-sm font-medium">Getting your location…</span>
					<span className="text-xs text-slate-500">If unavailable, we’ll use the CN Tower.</span>
				</div>
			)}
		</main>
	);
}

export default App;
