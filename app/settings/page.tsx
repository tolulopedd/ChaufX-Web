"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, Panel } from "../../components/admin-shell";
import { EmptyState, StatCard, adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "../../components/admin-primitives";
import { adminFetch, useAdminResource } from "../../lib/api";

type ProvincePricingRow = {
  province: string;
  flatFee: number;
  minHours: number;
};

type CityPricingRow = {
  province: string;
  city: string;
  flatFee: number;
  minHours: number;
};

type SettlementConfig = {
  platformSharePercent: number;
  driverSharePercent: number;
};

type FallbackPricingRow = {
  flatFee: number;
  minHours: number;
};

const settingsFallback = {
  zones: [],
  pricing: [],
  provincePricing: [] as ProvincePricingRow[],
  cityPricing: [] as CityPricingRow[],
  fallbackPricing: {
    flatFee: 35,
    minHours: 2
  } as FallbackPricingRow,
  settlementConfig: {
    platformSharePercent: 30,
    driverSharePercent: 70
  } as SettlementConfig
};

const defaultFallbackPricing = { flatFee: 35, minHours: 2 };

function normalizeProvincePricing(rows: ProvincePricingRow[]) {
  return rows
    .map((row) => ({
      province: row.province,
      flatFee: Number(row.flatFee),
      minHours: Number(row.minHours)
    }))
    .sort((left, right) => left.province.localeCompare(right.province));
}

function normalizeCityPricing(rows: CityPricingRow[]) {
  return rows
    .map((row) => ({
      province: row.province,
      city: row.city,
      flatFee: Number(row.flatFee),
      minHours: Number(row.minHours)
    }))
    .sort((left, right) => `${left.province}__${left.city}`.localeCompare(`${right.province}__${right.city}`));
}

function normalizeFallbackPricing(row: FallbackPricingRow) {
  return {
    flatFee: Number(row.flatFee),
    minHours: Number(row.minHours)
  };
}

export default function SettingsPage() {
  const { data, loading, error, reload } = useAdminResource<any>("/admin/settings", settingsFallback);
  const [provincePricing, setProvincePricing] = useState<ProvincePricingRow[]>([]);
  const [cityPricing, setCityPricing] = useState<CityPricingRow[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCityKey, setSelectedCityKey] = useState("");
  const [fallbackPricing, setFallbackPricing] = useState<FallbackPricingRow>({ flatFee: 35, minHours: 2 });
  const [platformSharePercent, setPlatformSharePercent] = useState(30);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setProvincePricing(data.provincePricing);
    setCityPricing(data.cityPricing);
    setFallbackPricing(data.fallbackPricing ?? { flatFee: 35, minHours: 2 });
    setPlatformSharePercent(data.settlementConfig?.platformSharePercent ?? 30);
  }, [data.cityPricing, data.fallbackPricing, data.provincePricing, data.settlementConfig?.platformSharePercent]);

  const provinceOptions = useMemo(
    () => provincePricing.map((row) => row.province).sort((left, right) => left.localeCompare(right)),
    [provincePricing]
  );

  useEffect(() => {
    if (!provinceOptions.length) {
      setSelectedProvince("");
      return;
    }

    if (!selectedProvince || !provinceOptions.includes(selectedProvince)) {
      setSelectedProvince(provinceOptions[0]);
    }
  }, [provinceOptions, selectedProvince]);

  const selectedProvinceRow = useMemo(
    () => provincePricing.find((row) => row.province === selectedProvince) ?? null,
    [provincePricing, selectedProvince]
  );
  const cityOptionItems = useMemo(
    () =>
      cityPricing.map((row, index) => ({
        key: `${row.province}__${row.city || "city"}__${index}`,
        index,
        row
      })),
    [cityPricing]
  );

  useEffect(() => {
    if (!cityOptionItems.length) {
      setSelectedCityKey("");
      return;
    }

    if (!selectedCityKey || !cityOptionItems.some((item) => item.key === selectedCityKey)) {
      setSelectedCityKey(cityOptionItems[0].key);
    }
  }, [cityOptionItems, selectedCityKey]);

  const selectedCityItem = useMemo(
    () => cityOptionItems.find((item) => item.key === selectedCityKey) ?? null,
    [cityOptionItems, selectedCityKey]
  );

  const provincePricingDirty = useMemo(
    () =>
      JSON.stringify(normalizeProvincePricing(provincePricing)) !==
      JSON.stringify(normalizeProvincePricing(data.provincePricing ?? [])),
    [data.provincePricing, provincePricing]
  );
  const cityPricingDirty = useMemo(
    () =>
      JSON.stringify(normalizeCityPricing(cityPricing)) !==
      JSON.stringify(normalizeCityPricing(data.cityPricing ?? [])),
    [cityPricing, data.cityPricing]
  );
  const fallbackPricingDirty = useMemo(
    () =>
      JSON.stringify(normalizeFallbackPricing(fallbackPricing)) !==
      JSON.stringify(normalizeFallbackPricing(data.fallbackPricing ?? defaultFallbackPricing)),
    [data.fallbackPricing, fallbackPricing]
  );
  const settlementPricingDirty = platformSharePercent !== (data.settlementConfig?.platformSharePercent ?? 30);
  const pricingDirty = provincePricingDirty || cityPricingDirty || fallbackPricingDirty || settlementPricingDirty;

  async function savePricing(scope: "all" | "fallback" | "settlement" = "all") {
    setSaving(true);
    setNotice("");

    try {
      const body = {
        provincePricing,
        cityPricing: cityPricing.filter((row) => row.province && row.city),
        fallbackPricing,
        settlementConfig: {
          platformSharePercent
        }
      };

      await adminFetch("/admin/settings/pricing", {
        method: "POST",
        body: JSON.stringify(body)
      });
      await reload();
      setNotice(
        scope === "fallback"
          ? "Fallback pricing saved."
          : scope === "settlement"
            ? "Settlement split saved."
            : "Pricing settings saved."
      );
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to save pricing settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Settings">
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard title="Provinces/Territories" value={provincePricing.length} detail="Configured province and territory pricing rows." />
        <StatCard title="City overrides" value={cityPricing.length} detail="Configured city-level pricing overrides." />
        <StatCard title="Fallback pricing" value={`$${fallbackPricing.flatFee}/hour`} detail={`Minimum ${fallbackPricing.minHours} hour${fallbackPricing.minHours === 1 ? "" : "s"} outside configured regions.`} />
        <StatCard
          title="Driver settlement split"
          value={`${100 - platformSharePercent}% / ${platformSharePercent}%`}
          detail="Driver payout share and platform share."
          tone="dark"
        />
      </div>

      {notice ? (
        <div className={`rounded-[18px] border px-4 py-3 text-sm font-medium ${
          notice.includes("saved")
            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
            : "border-amber-100 bg-amber-50 text-amber-700"
        }`}>
          {notice}
        </div>
      ) : null}

      <Panel
        title="Driver settlement formula"
        aside={
          <button
            type="button"
            onClick={() => savePricing("settlement")}
            disabled={saving}
            className={settlementPricingDirty ? adminPrimaryButtonClass : adminSecondaryButtonClass}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-sm font-semibold text-slate-950">Revenue share</div>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Platform share (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className={adminInputClass}
                value={platformSharePercent}
                onChange={(event) => setPlatformSharePercent(Math.max(0, Math.min(100, Number(event.target.value || 0))))}
              />
            </label>
          </div>

          <div className="rounded-[18px] border border-[#DCDDFF] bg-[#EEF0FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Settlement preview</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{100 - platformSharePercent}% driver payout</div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Fallback pricing"
        aside={
          <button
            type="button"
            onClick={() => savePricing("fallback")}
            disabled={saving}
            className={fallbackPricingDirty ? adminPrimaryButtonClass : adminSecondaryButtonClass}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="text-sm font-semibold text-slate-950">Outside-region rate</div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Flat fee / hour (CAD)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={adminInputClass}
                  value={fallbackPricing.flatFee}
                  onChange={(event) =>
                    setFallbackPricing((current) => ({ ...current, flatFee: Number(event.target.value || 0) }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Minimum hours</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={adminInputClass}
                  value={fallbackPricing.minHours}
                  onChange={(event) =>
                    setFallbackPricing((current) => ({ ...current, minHours: Number(event.target.value || 1) }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#DCDDFF] bg-[#EEF0FF] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Fallback preview</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              ${fallbackPricing.flatFee * fallbackPricing.minHours} minimum
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Provinces/Territories"
        aside={
          <button
            type="button"
            onClick={() => savePricing("all")}
            disabled={saving}
            className={pricingDirty ? adminPrimaryButtonClass : adminSecondaryButtonClass}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        }
      >
        {loading ? <p className="text-sm text-slate-500">Loading settings...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}
        {provincePricing.length ? (
          <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Province/Territory</span>
                <select
                  className={adminInputClass}
                  value={selectedProvince}
                  onChange={(event) => setSelectedProvince(event.target.value)}
                >
                  {provinceOptions.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProvinceRow ? (
                <div>
                <div>
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Selected province/territory</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">{selectedProvinceRow.province}</div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Flat fee / hour (CAD)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={adminInputClass}
                      value={selectedProvinceRow.flatFee}
                      onChange={(event) =>
                        setProvincePricing((current) =>
                          current.map((item) =>
                            item.province === selectedProvinceRow.province
                              ? { ...item, flatFee: Number(event.target.value || 0) }
                              : item
                          )
                        )
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Minimum hours / booking</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={adminInputClass}
                      value={selectedProvinceRow.minHours}
                      onChange={(event) =>
                        setProvincePricing((current) =>
                          current.map((item) =>
                            item.province === selectedProvinceRow.province
                              ? { ...item, minHours: Number(event.target.value || 1) }
                              : item
                          )
                        )
                      }
                    />
                  </label>
                </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <EmptyState title="No province pricing yet" />
        )}
      </Panel>

      <Panel
        title="City pricing overrides"
        aside={
          <button
            type="button"
            onClick={() => {
              const nextIndex = cityPricing.length;
              const nextKey = `${provinceOptions[0] ?? "Ontario"}__city__${nextIndex}`;

              setCityPricing((current) => [...current, { province: provinceOptions[0] ?? "Ontario", city: "", flatFee: 29, minHours: 2 }]);
              setSelectedCityKey(nextKey);
            }}
            className={adminSecondaryButtonClass}
          >
            Add city override
          </button>
        }
      >
        {cityPricing.length ? (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <div className="px-2 pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                City override list
              </div>
              <div className="space-y-2">
                {cityOptionItems.map((item) => {
                  const isActive = item.key === selectedCityKey;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedCityKey(item.key)}
                      className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-[#C7D2FE] bg-white shadow-[0_16px_30px_-24px_rgba(37,99,235,0.45)]"
                          : "border-transparent bg-white/70 hover:border-[#E5E7EB] hover:bg-white"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-950">
                        {item.row.city?.trim().length ? item.row.city : "Unnamed city"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {item.row.province} · ${item.row.flatFee}/hour · minimum {item.row.minHours} hour{item.row.minHours === 1 ? "" : "s"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCityItem ? (
              <div className="rounded-[18px] border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Selected city override</div>
                    <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {selectedCityItem.row.city?.trim().length ? selectedCityItem.row.city : "Unnamed city"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCityPricing((current) => current.filter((_, itemIndex) => itemIndex !== selectedCityItem.index));
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
                  >
                    Remove override
                  </button>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Province/Territory</span>
                    <select
                      className={adminInputClass}
                      value={selectedCityItem.row.province}
                      onChange={(event) =>
                        setCityPricing((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === selectedCityItem.index ? { ...item, province: event.target.value } : item
                          )
                        )
                      }
                    >
                      {provinceOptions.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">City</span>
                    <input
                      className={adminInputClass}
                      value={selectedCityItem.row.city}
                      onChange={(event) =>
                        setCityPricing((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === selectedCityItem.index ? { ...item, city: event.target.value } : item
                          )
                        )
                      }
                      placeholder="Toronto"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Flat fee / hour</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={adminInputClass}
                      value={selectedCityItem.row.flatFee}
                      onChange={(event) =>
                        setCityPricing((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === selectedCityItem.index ? { ...item, flatFee: Number(event.target.value || 0) } : item
                          )
                        )
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Minimum hours</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={adminInputClass}
                      value={selectedCityItem.row.minHours}
                      onChange={(event) =>
                        setCityPricing((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === selectedCityItem.index ? { ...item, minHours: Number(event.target.value || 1) } : item
                          )
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title="No city overrides yet" />
        )}
      </Panel>
    </AdminShell>
  );
}
