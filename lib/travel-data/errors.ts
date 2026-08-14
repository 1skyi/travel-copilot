// ============================================================
// 地图数据错误类型
// 记录 status / message / provider，绝不携带 API Key
// ============================================================

export class TravelDataError extends Error {
  status: number;
  provider: string;

  constructor(status: number, message: string, provider: string) {
    super(message);
    this.name = "TravelDataError";
    this.status = status;
    this.provider = provider;
  }
}
