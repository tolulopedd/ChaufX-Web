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

const settingsFallback = {
  zones: [],
  pricing: [],
  provincePricing: [] as ProvincePricingRow[],
  cityPricing: [] as CityPricingRow[],
  settlementConfig: {
    platformSharePercent: 30,
    driverSharePercent: 70
  } as SettlementConfig
};

export default function SettingsPage() {
  const { data, loading, error, reload } = useAdminResource<any>("/admin/settings", settingsFallback);
  const [provincePricing, setProvincePricing] = useState<ProvincePricingRow[]>([]);
  const [cityPricing, setCityPricing] = useState<CityPricingRow[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCityKey, setSelectedCityKey] = useState("");
  const [platformSharePercent, setPlatformSharePercent] = useState(30);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setProvincePricing(data.provincePricing);
    setCityPricing(data.cityPricing);
    setPlatformSharePercent(data.settlementConfig?.platformSharePercent ?? 30);
  }, [data.cityPricing, data.provincePricing, data.settlementConfig?.platformSharePercent]);

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

  async function savePricing() {
    setSaving(true);
    setNotice("");

    try {
      await adminFetch("/admin/settings/pricing", {
        method: "POST",
        body: JSON.stringify({
          provincePricing,
          cityPricing: cityPricing.filter((row) => row.province && row.city),
          settlementConfig: {
            platformSharePercent
          }
        })
      });
      await reload();
      setNotice("Pricing settings saved.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to save pricing settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Settings"
      description="Pricing, settlement split, and platform settings."
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard title="Provinces/Territories" value={provincePricing.length} detail="Configured province and territory pricing rows." />
        <StatCard title="City overrides" value={cityPricing.length} detail="Configured city-level pricing overrides." />
        <StatCard title="Pricing model" value="Flat fee + minimum hours" detail="Hourly flat fees and minimum booking hours." />
        <StatCard
          title="Driver settlement split"
          value={`${100 - platformSharePercent}% / ${platformSharePercent}%`}
          detail="Driver payout share and platform share."
          tone="dark"
        />
      </div>

      <Panel
        title="Driver settlement formula"
        subtitle="Set the weekly payout split for paid completed trips."
        aside={
          <button
            type="button"
            onClick={savePricing}
            disabled={saving}
            className={adminSecondaryButtonClass}
          >
            {saving ? "Saving..." : "Save split"}
          </button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
            <div className="text-sm font-semibold text-slate-950">Revenue share</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Choose the platform share percentage for paid trips.</p>
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

          <div className="rounded-[24px] border border-[#DCDDFF] bg-[#EEF0FF] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Settlement preview</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{100 - platformSharePercent}% driver payout</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              ChaufX retains {platformSharePercent}% and drivers receive {100 - platformSharePercent}%.
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Provinces/Territories"
        subtitle="Set default flat fees and minimum booking hours by province or territory."
        aside={
          <button
            type="button"
            onClick={savePricing}
            disabled={saving}
            className={adminPrimaryButtonClass}
          >
            {saving ? "Saving..." : "Save pricing"}
          </button>
        }
      >
        {loading ? <p className="text-sm text-slate-500">Loading settings...</p> : null}
        {error ? <p className="text-sm text-amber-600">{error}</p> : null}
        {notice ? <p className={`text-sm ${notice.includes("saved") ? "text-emerald-600" : "text-amber-600"}`}>{notice}</p> : null}

        {provincePricing.length ? (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <div className="px-2 pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Province/Territory list
              </div>
              <div className="space-y-2">
                {provinceOptions.map((province) => {
                  const row = provincePricing.find((item) => item.province === province);
                  const isActive = province === selectedProvince;

                  return (
                    <button
                      key={province}
                      type="button"
                      onClick={() => setSelectedProvince(province)}
                      className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-[#C7D2FE] bg-white shadow-[0_16px_30px_-24px_rgba(37,99,235,0.45)]"
                          : "border-transparent bg-white/70 hover:border-[#E5E7EB] hover:bg-white"
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-950">{province}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        ${row?.flatFee ?? 0}/hour · minimum {row?.minHours ?? 0} hour{row?.minHours === 1 ? "" : "s"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedProvinceRow ? (
              <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                <div>
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Selected province/territory</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">{selectedProvinceRow.province}</div>
                  <div className="mt-2 text-sm text-slate-500">Edit the default pricing used when no city override applies.</div>
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
        ) : (
          <EmptyState title="No province pricing yet" description="Province and territory pricing has not been configured." />
        )}
      </Panel>

      <Panel
        title="City pricing overrides"
        subtitle="Set city-level pricing where local rates differ from provincial defaults."
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
            <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-3">
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
              <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#4338CA]">Selected city override</div>
                    <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {selectedCityItem.row.city?.trim().length ? selectedCityItem.row.city : "Unnamed city"}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">Edit local pricing where the city differs from the province default.</div>
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
          <EmptyState title="No city overrides yet" description="No city-level pricing overrides have been added." />
        )}
      </Panel>
    </AdminShell>
  );
}
