import { useCallback, useEffect, useState } from "react";
import { fetchSystems, type SystemMeta } from "./api";

interface UseSystemsResult {
	systems: SystemMeta[];
	loading: boolean;
	error: string | null;
	reload: () => void;
}

// Loads the official system catalog from the backend. The list is the
// source of truth for the background upload select, so it is fetched at
// runtime instead of being baked into the bundle.
export function useSystems(): UseSystemsResult {
	const [systems, setSystems] = useState<SystemMeta[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const list = await fetchSystems();
			setSystems(list);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load systems");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return { systems, loading, error, reload: load };
}
