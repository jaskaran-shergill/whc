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

function App() {
	const mapRef = useRef<MapRef>(null);

	const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
	const [locations, setLocations] = useState<LocationData[]>([]);
	const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

	async function fetchLocation(userLat: number, userLng: number) {
		const response = await fetch("https://whc-api.shergill.dev", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				userLat,
				userLng,
			}),
		});

		const data = await response.json();

		console.log(data);
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
		setLocations(locationList);
	}

	useEffect(() => {
		navigator.geolocation.getCurrentPosition(({ coords }) => {
			mapRef.current?.getMap().jumpTo({
				center: [coords.longitude, coords.latitude],
				zoom: 15,
			});

			setUserLocation({ latitude: coords.latitude, longitude: coords.longitude });

			fetchLocation(coords.latitude, coords.longitude);
		});
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
				onSelect={(location) => {
					setSelectedLocation(location);
					mapRef.current?.flyTo({ center: [location.lng, location.lat], zoom: 15, duration: 600 });
				}}
			/>
		</main>
	);
}

export default App;
