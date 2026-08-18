// ============================================================
// Transportation Domain — 统一交通数据层
// 本层只负责候选交通方案的数据结构，不负责推荐决策。
// REAL / ESTIMATED / NO_DATA 必须显式区分。
// ============================================================

export type TransportationType =
  | "flight"
  | "high_speed_rail"
  | "train"
  | "bus"
  | "self_drive";

export type TransportationDataStatus = "REAL" | "ESTIMATED" | "NO_DATA";

export type TransportationAvailability = "AVAILABLE" | "SOLD_OUT" | "UNKNOWN";

export type TransportationSortBy = "price" | "duration" | "departureTime";

export interface TransportationPrice {
  // 票价模式：unitPrice = 单人价；totalPrice = passengerCount × unitPrice。
  // 自驾等总价模式可让 unitPrice 为 null，totalPrice 直接给总价。
  unitPrice: number | null;
  totalPrice: number;
  currency: string;
  isEstimated: boolean;
}

export interface SelfDriveCost {
  estimatedFuelCost: number;
  estimatedTollCost: number;
  estimatedParkingCost: number;
  estimatedRentalCost: number;
}

export interface TransportationOption {
  id: string;
  type: TransportationType;
  provider: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes?: number;
  price: TransportationPrice;
  passengerCount: number;
  availability: TransportationAvailability;
  dataSource: string;
  updatedAt: string;
  isEstimated: boolean;
  status: TransportationDataStatus;
  selfDriveCost?: SelfDriveCost;
}

export interface TransportationSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengerCount: number;
  preferredTypes?: TransportationType[];
  // 仅用于自驾估算；必须来自外部距离/行程数据，禁止伪造。
  distanceKm?: number;
  // 高德驾车路线的预计时长（秒）；用于自驾展示，禁止用固定值冒充。
  routeDurationSeconds?: number;
  durationDays?: number;
}

export interface TransportationProviderError {
  provider: string;
  type: TransportationType;
  code: string;
  message: string;
}

export interface TransportationProviderStatus {
  provider: string;
  types: TransportationType[];
  status: "OK" | "NO_DATA" | "ERROR";
  message: string;
  searchedAt: string;
}

export interface TransportationSearchResult {
  options: TransportationOption[];
  providerStatus: TransportationProviderStatus[];
  errors: TransportationProviderError[];
  searchedAt: string;
}

export interface TransportationSelection {
  outbound: TransportationOption | null;
  return: TransportationOption | null;
}

export const TRANSPORTATION_TYPE_LABELS: Record<TransportationType, string> = {
  flight: "飞机",
  high_speed_rail: "高铁",
  train: "火车",
  bus: "长途汽车",
  self_drive: "自驾",
};

export const TRANSPORTATION_STATUS_LABELS: Record<TransportationDataStatus, string> = {
  REAL: "真实数据",
  ESTIMATED: "估算",
  NO_DATA: "暂无数据",
};

// 票价校验：总价必须由人数和单人价推导，避免 UI 各自重复计算。
export function calculateTransportationTotalPrice(
  unitPrice: number,
  passengerCount: number
): number {
  const count = Math.max(1, passengerCount);
  return Math.round(unitPrice * count);
}
