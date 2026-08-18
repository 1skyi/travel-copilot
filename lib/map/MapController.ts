// ============================================================
// MapController — 地图视角与高亮状态的唯一控制方
// 只操作 AMap 实例，不直接触碰 React UI。
// ============================================================

import type {
  AMapMap,
  AMapMarker,
  AMapPolyline,
  AMapNamespace,
} from "./amap";

export interface MapLocationModel {
  id: string;
  dayId: number;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  color: string;
}

export interface MapRouteModel {
  id: string;
  dayId: number;
  points: Array<{ longitude: number; latitude: number }>;
  color: string;
}

export class MapController {
  private map: AMapMap;
  private AMap: AMapNamespace;
  private markers: AMapMarker[] = [];
  private polylines: AMapPolyline[] = [];
  private locations: MapLocationModel[] = [];
  private locationById = new Map<string, MapLocationModel>();
  private routeByDay = new Map<number, AMapPolyline[]>();

  constructor(map: AMapMap, AMap: AMapNamespace) {
    this.map = map;
    this.AMap = AMap;
  }

  private toLngLat(location: Pick<MapLocationModel, "longitude" | "latitude">) {
    return new this.AMap.LngLat(location.longitude, location.latitude);
  }

  private applyRouteStyle(line: AMapPolyline, dayId: number, activeDayId: number | null): void {
    if (activeDayId === null) {
      line.setOptions({ strokeWeight: 4, strokeOpacity: 0.8 });
    } else if (dayId === activeDayId) {
      line.setOptions({ strokeWeight: 6, strokeOpacity: 1 });
    } else {
      line.setOptions({ strokeWeight: 3, strokeOpacity: 0.35 });
    }
  }

  setLocations(
    locations: MapLocationModel[],
    onMarkerClick: (locationId: string, dayId: number) => void
  ): void {
    this.clearMarkers();
    this.locations = locations;
    this.locationById.clear();

    const overlays: AMapMarker[] = [];
    for (const location of locations) {
      this.locationById.set(location.id, location);
      const marker = new this.AMap.Marker({
        position: this.toLngLat(location),
        // 悬停展示高德格式化地址，让用户能确认定位结果是否符合预期
        title: location.address ? location.name + " · " + location.address : location.name,
        zIndex: 100,
      });
      marker.on("click", () => {
        this.focusLocation(location.id);
        onMarkerClick(location.id, location.dayId);
      });
      this.markers.push(marker);
      overlays.push(marker);
    }

    if (overlays.length > 0) this.map.add(overlays);
  }

  setRoutes(routes: MapRouteModel[], activeDayId: number | null): void {
    this.clearPolylines();
    const overlays: AMapPolyline[] = [];

    for (const route of routes) {
      const polyline = new this.AMap.Polyline({
        path: route.points.map((point) => new this.AMap.LngLat(point.longitude, point.latitude)),
        strokeColor: route.color,
        strokeWeight: 4,
        strokeOpacity: 0.8,
        lineJoin: "round",
        lineCap: "round",
        zIndex: 15,
      });
      this.applyRouteStyle(polyline, route.dayId, activeDayId);

      this.polylines.push(polyline);
      overlays.push(polyline);
      const list = this.routeByDay.get(route.dayId) ?? [];
      list.push(polyline);
      this.routeByDay.set(route.dayId, list);
    }

    if (overlays.length > 0) this.map.add(overlays);
  }

  setActiveDay(activeDayId: number | null): void {
    this.routeByDay.forEach((lines, dayId) => {
      for (const line of lines) {
        this.applyRouteStyle(line, dayId, activeDayId);
      }
    });
  }

  focusDay(dayId: number): void {
    const points = this.locations.filter((location) => location.dayId === dayId);
    this.fitToLocations(points);
  }

  focusLocation(locationId: string): void {
    const location = this.locationById.get(locationId);
    if (!location) return;
    this.map.setZoomAndCenter(13, this.toLngLat(location));
  }

  showFullJourney(): void {
    this.fitToLocations(this.locations);
  }

  clearFocus(): void {
    this.setActiveDay(null);
    this.showFullJourney();
  }

  private fitToLocations(locations: MapLocationModel[]): void {
    if (locations.length === 0) return;

    if (locations.length === 1) {
      this.map.setZoomAndCenter(12, this.toLngLat(locations[0]));
      return;
    }

    const longitudes = locations.map((location) => location.longitude);
    const latitudes = locations.map((location) => location.latitude);
    const southWest = new this.AMap.LngLat(Math.min(...longitudes), Math.min(...latitudes));
    const northEast = new this.AMap.LngLat(Math.max(...longitudes), Math.max(...latitudes));
    this.map.setBounds(new this.AMap.Bounds(southWest, northEast));
  }

  private clearMarkers(): void {
    if (this.markers.length > 0) this.map.remove(this.markers);
    this.markers = [];
    this.locationById.clear();
  }

  private clearPolylines(): void {
    if (this.polylines.length > 0) this.map.remove(this.polylines);
    this.polylines = [];
    this.routeByDay.clear();
  }

  resize(): void {
    this.map.resize?.();
  }

  destroy(): void {
    this.clearMarkers();
    this.clearPolylines();
    this.map.destroy();
  }
}