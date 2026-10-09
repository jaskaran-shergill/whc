import Map, { type MapRef, Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import mapStyleUrl from "./assets/map.json?url";
import { useEffect, useRef, useState } from "react";

interface LocationData {
	id: string | number;
	name: string;
	lng: number;
	lat: number;
	color?: string;
	imageUrl?: string;
	status?: string;
	timezone?: string;
	diningRoomHours?: Record<string, string | null>;
}

function getRestaurantImageUrl(assetId?: string): string | undefined {
	const match = assetId?.match(/^image-(.+-\d+x\d+)-([a-z0-9]+)$/i);
	if (!match) return undefined;

	const [, filename, extension] = match;
	return `https://cdn.sanity.io/images/czqk28jt/prod_th_ca/${filename}.${extension}?w=750&q=40&fit=max&auto=format`;
}

function getClosingCountdown(location: LocationData): string | null {
	if (location.status?.toLowerCase() !== "open" || !location.timezone || !location.diningRoomHours) return null;

	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: location.timezone,
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date());
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	const dayKeys: Record<string, string> = {
		Mon: "mon",
		Tue: "tue",
		Wed: "wed",
		Thu: "thr",
		Fri: "fri",
		Sat: "sat",
		Sun: "sun",
	};
	const day = dayKeys[values.weekday];
	const closingTime = day && location.diningRoomHours[`${day}Close`];
	if (!closingTime) return null;

	const [closingHour, closingMinute] = closingTime.split(":").map(Number);
	const minutesLeft = closingHour * 60 + closingMinute - Number(values.hour) * 60 - Number(values.minute);
	if (minutesLeft <= 0) return null;

	const hours = Math.floor(minutesLeft / 60);
	const minutes = minutesLeft % 60;
	return [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(" ");
}

function App() {
	const mapRef = useRef<MapRef>(null);

	const [currentLocationMarker, setCurrentLocationMarker] = useState({
		longitude: 0,
		latitude: 0,
	});
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

			setCurrentLocationMarker({
				longitude: coords.longitude,
				latitude: coords.latitude,
			});

			fetchLocation(coords.latitude, coords.longitude);
		});
	}, []);
	const closingCountdown = selectedLocation ? getClosingCountdown(selectedLocation) : null;

	return (
		<main className="h-screen w-full">
			<Map initialViewState={{ longitude: -79.3871, latitude: 43.6426, zoom: 14 }} ref={mapRef} style={{ width: "100%", height: "100%" }} mapStyle={mapStyleUrl}>
				<NavigationControl position="top-right" />

				<Marker longitude={currentLocationMarker.longitude} latitude={currentLocationMarker.latitude} color="#4263f5" />

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

				{selectedLocation && (
					<Popup
						longitude={selectedLocation.lng}
						latitude={selectedLocation.lat}
						anchor="top"
						offset={14}
						maxWidth="280px"
						closeButton={false}
						className="restaurant-popup"
						onClose={() => setSelectedLocation(null)}
					>
						<div className="relative w-[min(260px,calc(100vw-48px))] text-slate-900">
							<button
								type="button"
								aria-label="Close restaurant details"
								onClick={() => setSelectedLocation(null)}
								className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-md bg-white text-lg leading-none text-slate-900 shadow-sm"
							>
								×
							</button>
							{selectedLocation.imageUrl && <img src={selectedLocation.imageUrl} alt="" className="block h-32 w-full object-cover" />}
							<div className="space-y-2 p-3">
								<strong className="block text-sm font-semibold leading-snug">{selectedLocation.name}</strong>
								<div className="text-sm">
									<span className={selectedLocation.status?.toLowerCase() === "open" ? "text-green-700" : "text-slate-600"}>{selectedLocation.status ?? "Status unavailable"}</span>
									{closingCountdown && <span className="text-slate-600"> · Closes in {closingCountdown}</span>}
								</div>
								<div className="flex gap-4 text-sm">
									<a
										href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`}
										target="_blank"
										rel="noreferrer"
										aria-label={`Open ${selectedLocation.name} in Google Maps`}
										className="text-blue-700 underline"
									>
										Google Maps
									</a>
									<a
										href={`https://maps.apple.com/?ll=${selectedLocation.lat},${selectedLocation.lng}&q=${encodeURIComponent(selectedLocation.name)}`}
										target="_blank"
										rel="noreferrer"
										aria-label={`Open ${selectedLocation.name} in Apple Maps`}
										className="text-blue-700 underline"
									>
										Apple Maps
									</a>
								</div>
							</div>
						</div>
					</Popup>
				)}
			</Map>
		</main>
	);
}

export default App;
