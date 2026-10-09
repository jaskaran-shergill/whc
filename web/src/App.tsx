import Map, { type MapRef, Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

function App() {
	const mapRef = useRef<MapRef>(null);

	interface LocationData {
		id: string | number;
		name: string;
		lng: number;
		lat: number;
		color?: string;
	}

	const [currentLocationMarker, setCurrentLocationMarker] = useState({
		longitude: 0,
		latitude: 0,
	});
	const [locations, setLocations] = useState<LocationData[]>([]);

	async function fetchLocation(userLat: number, userLng: number) {
		const response = await fetch("http://localhost:8787", {
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

		let locationList: LocationData[] = [];
		console.log(data);
		data.forEach((e: any) => {
			locationList.push({
				id: e.storeId,
				name: e.name,
				lat: e.latitude,
				lng: e.longitude,
				color: "#f54269",
			});
			setLocations(locationList);
		});
	}

	useEffect(() => {
		navigator.geolocation.getCurrentPosition(({ coords }) => {
			mapRef.current?.getMap().jumpTo({
				center: [coords.longitude, coords.latitude],
				zoom: 15,
			});

			setCurrentLocationMarker({
				longitude: coords.longitude,
				latitude: coords.latitude,
			});

			fetchLocation(coords.latitude, coords.longitude);
		});
	}, []);

	return (
		<main className="h-screen w-full">
			<Map
				initialViewState={{ longitude: -122.4, latitude: 37.8, zoom: 14 }}
				ref={mapRef}
				style={{ width: "100%", height: "100%" }}
				mapStyle="https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json"
			>
				<NavigationControl position="top-right" />

				<Marker longitude={currentLocationMarker.longitude} latitude={currentLocationMarker.latitude} color="#4263f5" />

				{locations.map((loc) => (
					<Marker key={loc.id} longitude={loc.lng} latitude={loc.lat} color={loc.color || "#ff4757"} />
				))}
			</Map>
		</main>
	);
}

export default App;
