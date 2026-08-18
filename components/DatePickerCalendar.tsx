"use client";

// ============================================================
// DatePickerCalendar — 出行日期选择日历
// 点击输入框弹出日历面板：
// - 当天日期高亮（primary 圆环 + 今天标记）
// - 已选日期实心高亮
// - 支持 minDate 禁用更早日期（结束日期不得早于出发日期）
// - 点击面板外自动关闭
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

interface DatePickerCalendarProps {
  value?: string; // 支持 "YYYY-MM-DD" 与 "YYYY年M月D日"
  minDate?: string;
  onSelect: (isoDate: string) => void;
}

// 兼容两种日期格式；节日文案（国庆等）返回 null，不参与约束
function parseFlexibleDate(value?: string): Date | null {
  if (!value) return null;
  const iso = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const cn = value.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cn) return new Date(Number(cn[1]), Number(cn[2]) - 1, Number(cn[3]));
  return null;
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePickerCalendar({ value, minDate, onSelect }: DatePickerCalendarProps) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const selected = parseFlexibleDate(value);
  const min = parseFlexibleDate(minDate);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = selected ?? min ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击面板外关闭
  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const list: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      list.push(new Date(view.year, view.month, day));
    }
    return list;
  }, [view]);

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  const pick = (date: Date) => {
    onSelect(toIso(date));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border bg-background px-3 text-sm transition-all",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          open ? "border-primary/60" : "border-border hover:border-primary/40"
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn(value ? "text-foreground font-medium" : "text-muted-foreground/60")}>
          {value || "点击选择日期"}
        </span>
      </button>

      {/* 日历面板 */}
      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border bg-popover p-3 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {/* 月份导航 */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="上个月"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">
              {view.year} 年 {view.month + 1} 月
            </p>
            <button
              type="button"
              onClick={goNext}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="下个月"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-1 text-center text-[10px] text-muted-foreground">
                {weekday}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, index) => {
              if (!date) return <div key={"empty-" + index} />;

              const isToday = isSameDay(date, today);
              const isSelected = selected ? isSameDay(date, selected) : false;
              const disabled = min ? date < min : false;

              return (
                <button
                  key={date.getTime()}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  className={cn(
                    "relative flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : disabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "hover:bg-muted",
                    isToday && !isSelected && "ring-1 ring-inset ring-primary/60 font-semibold text-primary"
                  )}
                >
                  {date.getDate()}
                  {isToday && (
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] leading-none",
                        isSelected ? "text-primary-foreground/90" : "text-primary"
                      )}
                    >
                      今天
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 底部：回到今天 */}
          <div className="mt-2 border-t pt-2">
            <button
              type="button"
              onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 回到今天（{today.getMonth() + 1} 月 {today.getDate()} 日）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
