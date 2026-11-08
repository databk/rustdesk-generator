"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CustomConfig,
  TriggerRequest,
  OS_OPTIONS,
  ARCH_OPTIONS,
  CONN_TYPE_OPTIONS,
  triggerBuild,
  uploadLogo,
} from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [os, setOs] = useState("all");
  const [arch, setArch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploaded, setLogoUploaded] = useState<string | null>(null);

  const [custom, setCustom] = useState<CustomConfig>({
    app_name: "",
    conn_type: "",
  });

  const archOptions = useMemo(() => ARCH_OPTIONS[os] || [], [os]);

  const handleOsChange = (value: string) => {
    setOs(value);
    setArch("");
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    setError(null);
    try {
      const result = await uploadLogo(logoFile);
      setLogoUploaded(result.filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const req: TriggerRequest = {
        os,
        arch: arch || undefined,
        custom: {
          ...custom,
          app_name: custom.app_name || undefined,
          password: custom.password || undefined,
          salt: custom.salt || undefined,
          conn_type: custom.conn_type || undefined,
          override_settings: custom.override_settings || undefined,
          default_settings: custom.default_settings || undefined,
        },
      };
      const resp = await triggerBuild(req);
      router.push(`/build?id=${resp.uuid}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Build trigger failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            RustDesk Custom Client Builder
          </h1>
          <p className="mt-2 text-gray-600">
            Configure and build your custom RustDesk client.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Target Platform
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operating System
                </label>
                <select
                  value={os}
                  onChange={(e) => handleOsChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {OS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {archOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Architecture
                  </label>
                  <select
                    value={arch}
                    onChange={(e) => setArch(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select architecture</option>
                    {archOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Custom Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Name
                </label>
                <input
                  type="text"
                  value={custom.app_name || ""}
                  onChange={(e) =>
                    setCustom({ ...custom, app_name: e.target.value })
                  }
                  placeholder="e.g. MyCompany Remote"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    value={custom.password || ""}
                    onChange={(e) =>
                      setCustom({ ...custom, password: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salt
                  </label>
                  <input
                    type="text"
                    value={custom.salt || ""}
                    onChange={(e) =>
                      setCustom({ ...custom, salt: e.target.value })
                    }
                    placeholder="Optional"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Connection Type
                </label>
                <select
                  value={custom.conn_type || ""}
                  onChange={(e) =>
                    setCustom({ ...custom, conn_type: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CONN_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feature Toggles
                </label>
                <div className="space-y-2">
                  {[
                    {
                      key: "disable_installation" as const,
                      label: "Disable Installation",
                    },
                    {
                      key: "disable_settings" as const,
                      label: "Disable Settings",
                    },
                    {
                      key: "disable_account" as const,
                      label: "Disable Account",
                    },
                    {
                      key: "disable_ab" as const,
                      label: "Disable Address Book",
                    },
                    {
                      key: "disable_tcp_listen" as const,
                      label: "Disable TCP Listen",
                    },
                  ].map((toggle) => (
                    <label
                      key={toggle.key}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={custom[toggle.key] || false}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            [toggle.key]: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {toggle.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Override Settings (JSON)
                </label>
                <textarea
                  value={custom.override_settings || ""}
                  onChange={(e) =>
                    setCustom({ ...custom, override_settings: e.target.value })
                  }
                  placeholder='e.g. {"theme": "dark"}'
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Settings (JSON)
                </label>
                <textarea
                  value={custom.default_settings || ""}
                  onChange={(e) =>
                    setCustom({ ...custom, default_settings: e.target.value })
                  }
                  placeholder='e.g. {"server": "my.server.com"}'
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Logo Upload
            </h2>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/x-icon"
                onChange={(e) => {
                  setLogoFile(e.target.files?.[0] || null);
                  setLogoUploaded(null);
                }}
                className="text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                type="button"
                onClick={handleLogoUpload}
                disabled={!logoFile || logoUploading}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logoUploading ? "Uploading..." : "Upload"}
              </button>
              {logoUploaded && (
                <span className="text-sm text-green-600">
                  Uploaded: {logoUploaded}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Upload app icons/logos. Supported formats: PNG, JPEG, SVG, ICO.
            </p>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Build Custom Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
