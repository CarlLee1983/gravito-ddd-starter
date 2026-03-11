import { OrbitAtlas } from '@gravito/atlas';
export function getOrbits(options) {
    const { useDatabase } = options;
    return [
        ...(useDatabase ? [OrbitAtlas] : []),
    ];
}
