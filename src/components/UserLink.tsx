import { Link } from "react-router-dom";

// UserLink renders a clickable username link to the public profile.
export default function UserLink({ children }: { children: React.ReactNode }) {
	if (!children) return null;
	const name = String(children);
	return (
		<Link to={`/app/u/${encodeURIComponent(name)}`} className="link hover:underline">
			{name}
		</Link>
	);
}
