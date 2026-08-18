// ============================================================
// AMap JS SDK loader + 最小类型定义（仅客户端使用）
// 浏览器端只允许 NEXT_PUBLIC_AMAP_JS_KEY / 安全密钥；
// Web Service AMAP_API_KEY 绝不进入这里。
// ============================================================

export interface AMapLngLat {
  lng: number;
  lat: number;
}

// Bounds 仅作为 setBounds 的输入，不暴露内部实现。
export interface AMapBounds {
  readonly __amapBoundsBrand?: never;
}

export interface AMapMarker {
  on(event: "click", callback: (event: { target: AMapMarker }) => void): void;
  setzIndex(zIndex: number): void;
}

export interface AMapPolyline {
  setOptions(options: { strokeWeight?: number; strokeOpacity?: number }): void;
}

export interface AMapMap {
  add(overlays: Array<AMapMarker | AMapPolyline>): void;
  remove(overlays: Array<AMapMarker | AMapPolyline>): void;
  setZoomAndCenter(zoom: number, center: AMapLngLat): void;
  setBounds(bounds: AMapBounds): void;
  resize?(): void;
  destroy(): void;
}

export interface AMapNamespace {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Polyline: new (options: Record<string, unknown>) => AMapPolyline;
  LngLat: new (lng: number, lat: number) => AMapLngLat;
  Bounds: new (southWest: AMapLngLat, northEast: AMapLngLat) => AMapBounds;
}

let amapPromise: Promise<AMapNamespace> | null = null;

export function loadAMap(): Promise<AMapNamespace> {
  if (amapPromise) return amapPromise;

  if (typeof window === "undefined") {
    return Promise.reject(new Error("AMap 只能在浏览器中加载"));
  }

  const w = window as unknown as { AMap?: AMapNamespace };
  if (w.AMap) return Promise.resolve(w.AMap);

  const key = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
  if (!key) {
    return Promise.reject(new Error("缺少 NEXT_PUBLIC_AMAP_JS_KEY"));
  }

  amapPromise = new Promise<AMapNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({ key, v: "2.0" });
    const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE;
    if (securityJsCode) params.set("securityJsCode", securityJsCode);

    script.src = "https://webapi.amap.com/maps?" + params.toString();
    script.async = true;
    script.onerror = () => {
      amapPromise = null;
      reject(new Error("高德地图 JS SDK 加载失败"));
    };
    script.onload = () => {
      const loaded = (window as unknown as { AMap?: AMapNamespace }).AMap;
      if (loaded) {
        resolve(loaded);
      } else {
        amapPromise = null;
        reject(new Error("高德地图 JS SDK 初始化失败"));
      }
    };
    document.head.appendChild(script);
  });

  return amapPromise;
}