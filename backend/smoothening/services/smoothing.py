"""
Geometry smoothing utilities.

Algorithms
----------
chaikin(coords, iterations)
    Chaikin's corner-cutting — good for natural, flowing road curves.
    Each iteration doubles the number of points.

douglas_peucker(coords, tolerance)
    Ramer–Douglas–Peucker simplification — reduces point count while
    preserving shape within `tolerance` (in the CRS units, usually metres).
"""

from shapely.geometry import MultiLineString, LineString, mapping
from shapely.ops import unary_union


def _chaikin_line(coords: list, iterations: int = 3) -> list:
    """Apply Chaikin's algorithm to a single line's coordinate list."""
    for _ in range(iterations):
        new_coords = [coords[0]]
        for i in range(len(coords) - 1):
            p0 = coords[i]
            p1 = coords[i + 1]
            q = (0.75 * p0[0] + 0.25 * p1[0], 0.75 * p0[1] + 0.25 * p1[1])
            r = (0.25 * p0[0] + 0.75 * p1[0], 0.25 * p0[1] + 0.75 * p1[1])
            new_coords.extend([q, r])
        new_coords.append(coords[-1])
        coords = new_coords
    return coords


def chaikin_smooth(multilinestring_wkt: str, iterations: int = 3) -> str:
    """
    Smooth a MultiLineString WKT using Chaikin's algorithm.

    Parameters
    ----------
    multilinestring_wkt : str
        WKT representation of the MultiLineString.
    iterations : int
        Number of smoothing passes (default 3). More = smoother.

    Returns
    -------
    str
        Smoothed MultiLineString as WKT.
    """
    from shapely import wkt as shapely_wkt

    geom = shapely_wkt.loads(multilinestring_wkt)
    smoothed_lines = []
    for line in geom.geoms:
        smoothed_coords = _chaikin_line(list(line.coords), iterations)
        smoothed_lines.append(LineString(smoothed_coords))
    return MultiLineString(smoothed_lines).wkt


def douglas_peucker_simplify(
    multilinestring_wkt: str, tolerance: float = 0.00001
) -> str:
    """
    Simplify a MultiLineString WKT using Douglas-Peucker.

    Parameters
    ----------
    multilinestring_wkt : str
        WKT representation of the MultiLineString.
    tolerance : float
        Simplification tolerance in CRS units.
        For EPSG:4326 (degrees) use ~0.00001; for projected (metres) use ~1.0.

    Returns
    -------
    str
        Simplified MultiLineString as WKT.
    """
    from shapely import wkt as shapely_wkt

    geom = shapely_wkt.loads(multilinestring_wkt)
    simplified = geom.simplify(tolerance, preserve_topology=True)
    return simplified.wkt
