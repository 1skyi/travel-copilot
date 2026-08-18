// ============================================================
// SelfDriveProvider — 自驾数据提供方
// 自驾不是票价，而是总成本估算；所有字段均显式标记 ESTIMATED。
// 没有外部距离/天数数据时返回空结果，禁止猜测距离生成假数字。
// 距离与预计时长必须来自高德路线数据，不在此处伪造。
// ============================================================

import type {
  TransportationOption,
  TransportationSearchRequest,
  TransportationType,
} from "@/types/transportation";
import type { TransportationProvider } from "../interfaces/TransportationProvider";

export interface SelfDriveCostModel {
  fuelPerKm: number;
  tollPerKm: number;
  parkingPerDay: number;
  rentalPerDay: number;
}

export const DEFAULT_SELF_DRIVE_COST_MODEL: SelfDriveCostModel = {
  fuelPerKm: 0.8,
  tollPerKm: 0.4,
  parkingPerDay: 40,
  rentalPerDay: 260,
};

function padTime(value: number): string {
  return String(value).padStart(2, "0");
}

function formatChinaDateTime(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    padTime(date.getMonth() + 1) +
    "-" +
    padTime(date.getDate()) +
    " " +
    padTime(date.getHours()) +
    ":" +
    padTime(date.getMinutes())
  );
}

function formatRouteDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return hours + "小时" + minutes + "分钟";
  if (hours > 0) return hours + "小时";
  return minutes + "分钟";
}

export function estimateSelfDrive(
  request: TransportationSearchRequest,
  model: SelfDriveCostModel = DEFAULT_SELF_DRIVE_COST_MODEL
): TransportationOption | null {
  const distanceKm = request.distanceKm ?? 0;
  const days = request.durationDays ?? 0;
  if (distanceKm <= 0 || days <= 0) return null;

  const estimatedFuelCost = Math.round(distanceKm * model.fuelPerKm);
  const estimatedTollCost = Math.round(distanceKm * model.tollPerKm);
  const estimatedParkingCost = days * model.parkingPerDay;
  const estimatedRentalCost = days * model.rentalPerDay;
  const totalPrice =
    estimatedFuelCost + estimatedTollCost + estimatedParkingCost + estimatedRentalCost;

  const origin = request.origin.trim();
  const destination = request.destination.trim();
  const departureDate = request.departureDate.trim();
  const routeDurationSeconds = request.routeDurationSeconds ?? 0;
  const hasRealRouteDuration = routeDurationSeconds > 0;
  const duration = hasRealRouteDuration
    ? formatRouteDuration(routeDurationSeconds) + "（高德预计）"
    : "全程估算";
  const durationMinutes = hasRealRouteDuration
    ? Math.round(routeDurationSeconds / 60)
    : undefined;

  const departureTime = departureDate + " 08:00";
  let arrivalTime = (request.returnDate || departureDate) + " 18:00";
  if (hasRealRouteDuration) {
    const departure = new Date(departureDate + "T08:00:00+08:00");
    const arrival = new Date(departure.getTime() + routeDurationSeconds * 1000);
    arrivalTime = formatChinaDateTime(arrival);
  }

  return {
    id: ["self_drive", origin, destination, departureDate].join("_"),
    type: "self_drive",
    provider: "self_drive",
    origin,
    destination,
    departureTime,
    arrivalTime,
    duration,
    durationMinutes,
    price: {
      unitPrice: null,
      totalPrice,
      currency: "CNY",
      isEstimated: true,
    },
    passengerCount: Math.max(1, request.passengerCount),
    availability: "AVAILABLE",
    dataSource: "SELF_DRIVE_ESTIMATE",
    updatedAt: new Date().toISOString(),
    isEstimated: true,
    status: "ESTIMATED",
    selfDriveCost: {
      estimatedFuelCost,
      estimatedTollCost,
      estimatedParkingCost,
      estimatedRentalCost,
    },
  };
}

export class SelfDriveProvider implements TransportationProvider {
  readonly providerName = "self_drive";
  readonly types: TransportationType[] = ["self_drive"];

  private model: SelfDriveCostModel;

  constructor(model: SelfDriveCostModel = DEFAULT_SELF_DRIVE_COST_MODEL) {
    this.model = model;
  }

  async search(request: TransportationSearchRequest): Promise<TransportationOption[]> {
    const option = estimateSelfDrive(request, this.model);
    return option ? [option] : [];
  }
}