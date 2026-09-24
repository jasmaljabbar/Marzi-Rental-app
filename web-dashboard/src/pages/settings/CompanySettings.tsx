import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountApi, settingsApi } from "../../api/services";
import { apiErrorMessage } from "../../api/http";
import { useInvalidate } from "../../hooks/useInvalidate";
import { useBusyFlags } from "../../hooks/useBusyFlags";
import { useAccountPlan } from "../../hooks/useAccountPlan";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Button } from "../../components/ui/Button";
import { ImageUpload } from "../../components/ui/ImageUpload";

// company_name/address/phone/logo_url/default_tax_rate_percent/currency are
// all backed by the Account model (PUT /account/company) — that's the system
// the invoice PDF generator and CurrencyContext actually read from. qr_code,
// low_stock_threshold, and max_discount_percent stay on the generic Setting
// key-value store (nodejs-backend/src/models/Setting.js; qr_code and
// low_stock_threshold are per-shop, see SHOP_SCOPED_KEYS in settingController.js) —
// those aren't invoice-branding fields, so there's no mismatch to fix there.
export function CompanySettings() {
  const queryClient = useQueryClient();
  const { afterSettingChange } = useInvalidate();
  const { hasFeature, catalog } = useAccountPlan();
  const canBrand = hasFeature("customBranding");
  const canShowQrCode = hasFeature("paymentQrCode");

  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ["settings", "list"], queryFn: settingsApi.list });
  const { data: companyInfo, isLoading: companyLoading } = useQuery({ queryKey: ["account", "company"], queryFn: accountApi.getCompanyInfo });

  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState<string[]>([]);
  const [defaultTaxRatePercent, setDefaultTaxRatePercent] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [qrCode, setQrCode] = useState<string[]>([]);
  const uploads = useBusyFlags();
  const [lowStockThreshold, setLowStockThreshold] = useState("2");
  const [maxDiscountPercent, setMaxDiscountPercent] = useState("");

  useEffect(() => {
    if (!settings) return;
    const get = (key: string) => settings.find((s) => s.key === key)?.value ?? "";
    setQrCode(get("qr_code") ? [get("qr_code")] : []);
    setLowStockThreshold(get("low_stock_threshold") || "2");
    setMaxDiscountPercent(get("max_discount_percent"));
  }, [settings]);

  useEffect(() => {
    if (!companyInfo) return;
    setCompanyName(companyInfo.company_name ?? "");
    setCompanyPhone(companyInfo.phone ?? "");
    setCompanyAddress(companyInfo.address ?? "");
    setLogoUrl(companyInfo.logo_url ? [companyInfo.logo_url] : []);
    setDefaultTaxRatePercent(companyInfo.default_tax_rate_percent ? String(companyInfo.default_tax_rate_percent) : "");
    setCurrency(companyInfo.currency || "INR");
  }, [companyInfo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        accountApi.updateCompanyInfo({
          company_name: companyName.trim(),
          phone: companyPhone || null,
          address: companyAddress || null,
          logo_url: logoUrl[0] ?? null,
          default_tax_rate_percent: defaultTaxRatePercent === "" ? 0 : Number(defaultTaxRatePercent),
          currency,
        }),
        settingsApi.update("qr_code", qrCode[0] ?? null),
        settingsApi.update("low_stock_threshold", lowStockThreshold || null),
        settingsApi.update("max_discount_percent", maxDiscountPercent || null),
      ]);
    },
    onSuccess: () => {
      toast.success("Settings saved.");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
      afterSettingChange();
    },
    onError: (err) => toast.error(apiErrorMessage(err).detail),
  });

  if (settingsLoading || companyLoading) return null;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Company information</h2>
        <div className="space-y-4">
          <Input label="Business name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          <Input label="Phone" type="tel" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
          <Textarea label="Address" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} rows={2} />
        </div>
        <p className="mt-2 text-xs text-slate-400">Appears on every invoice and account statement this business issues.</p>
      </Card>

      {companyInfo?.business_code && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Business code</h2>
          <p className="font-mono text-lg text-slate-900 dark:text-slate-100">{companyInfo.business_code}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Team members type this at sign-in only if their username is also used by another business.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Currency & tax</h2>
        <div className="space-y-4">
          <div>
            <Select label="Operating currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {(catalog?.currencies ?? [{ code: currency, symbol: "", label: currency }]).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label} ({c.symbol.trim()})
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-400">Used to format amounts across the dashboard and on invoice PDFs.</p>
          </div>
          <div>
            <Input
              label="Default tax rate (%)"
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="0"
              value={defaultTaxRatePercent}
              onChange={(e) => setDefaultTaxRatePercent(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Applied to a rental's invoice at return time unless a different rate is entered for that return.
            </p>
          </div>
        </div>
      </Card>

      {canBrand ? (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Branding</h2>
          <ImageUpload label="Logo" kind="logo" value={logoUrl} onChange={setLogoUrl} max={1} onBusyChange={(busy) => uploads.setBusy("logo", busy)} />
        </Card>
      ) : (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Branding</h2>
          <p className="text-xs text-slate-400">Custom logo branding isn't included in your current plan. Upgrade to unlock it.</p>
        </Card>
      )}

      {canShowQrCode ? (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Payment QR code</h2>
          <p className="mb-2 text-xs text-slate-400">Shown to customers after completing a rental return so they can scan and pay any pending due.</p>
          <ImageUpload kind="qr_code" value={qrCode} onChange={setQrCode} max={1} onBusyChange={(busy) => uploads.setBusy("qr", busy)} />
        </Card>
      ) : (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Payment QR code</h2>
          <p className="text-xs text-slate-400">The payment QR code feature isn't included in your current plan. Upgrade to unlock it.</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Inventory</h2>
        <Input
          label="Low-stock threshold (units)"
          type="number"
          min={0}
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">Equipment at or below this stock level shows a "low stock" warning across the dashboard.</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Discount policy</h2>
        <Input
          label="Max discount % on returns"
          type="number"
          min={0}
          max={100}
          placeholder="No cap"
          value={maxDiscountPercent}
          onChange={(e) => setMaxDiscountPercent(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">
          Caps how much staff can discount a rental at return time. Leave blank for no limit.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending} disabled={uploads.anyBusy}>
          Save settings
        </Button>
      </div>
    </div>
  );
}
