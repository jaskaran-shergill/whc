import { Popup } from "react-map-gl/maplibre";

export interface LocationData {
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

interface MarkerPopupProps {
	location: LocationData;
	onClose: () => void;
}

export default function MarkerPopup({ location, onClose }: MarkerPopupProps) {
	const closingCountdown = getClosingCountdown(location);

	return (
		<Popup
			longitude={location.lng}
			latitude={location.lat}
			anchor="top"
			offset={14}
			maxWidth="280px"
			closeButton={false}
			className="restaurant-popup"
			onClose={onClose}
		>
			<div className="relative w-[min(260px,calc(100vw-48px))] text-slate-900">
				<button
					type="button"
					aria-label="Close restaurant details"
					onClick={onClose}
					className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-md bg-white text-base leading-none text-slate-900 shadow-sm"
				>
					×
				</button>
				{location.imageUrl && <img src={location.imageUrl} alt="" className="block h-32 w-full object-cover" />}
				<div className="space-y-2 p-3">
					<strong className="block text-sm font-semibold leading-snug">{location.name}</strong>
					<div className="text-sm">
						<span className={location.status?.toLowerCase() === "open" ? "text-green-700" : "text-slate-600"}>{location.status ?? "Status unavailable"}</span>
						{closingCountdown && <span className="text-slate-600"> · Closes in {closingCountdown}</span>}
					</div>
					<div className="flex flex-wrap gap-x-4 text-sm">
						<a
							href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
							target="_blank"
							rel="noreferrer"
							aria-label={`Open ${location.name} in Google Maps`}
							className="inline-flex min-h-11 items-center text-blue-700 underline"
						>
							Google Maps
						</a>
						<a
							href={`https://maps.apple.com/?ll=${location.lat},${location.lng}&q=${encodeURIComponent(location.name)}`}
							target="_blank"
							rel="noreferrer"
							aria-label={`Open ${location.name} in Apple Maps`}
							className="inline-flex min-h-11 items-center text-blue-700 underline"
						>
							Apple Maps
						</a>
					</div>
				</div>
			</div>
		</Popup>
	);
}
