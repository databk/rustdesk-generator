"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { BuildStatusResponse, getBuildStatus, getDownloadUrl } from "@/lib/api";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-800 border-yellow-200",
  building: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-green-50 text-green-800 border-green-200",
  failed: "bg-red-50 text-red-800 border-red-200",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  building: "🔄",
  completed: "✅",
  failed: "❌",
};

export default function BuildPage() {
  const params = useParams();
  const id = params.id as string;
  const [build, setBuild] = useState<BuildStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await getBuildStatus(id);
        if (cancelled) return;
        setBuild(status);
        setError(null);
        setLoading(false);

        if (status.status === "pending" || status.status === "building") {
          setTimeout(poll, 5000);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to fetch build status");
        setLoading(false);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading build status...</p>
      </div>
    );
  }

  if (error && !build) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <a
            href="/"
            className="text-blue-600 hover:underline text-sm"
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }

  if (!build) return null;

  const isActive = build.status === "pending" || build.status === "building";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <a href="/" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to home
          </a>
          <h1 className="text-3xl font-bold text-gray-900">
            Build Status
          </h1>
        </header>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Build #{build.uuid.slice(0, 8)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {build.os}
                {build.arch && ` / ${build.arch}`}
                {" · "}
                {new Date(build.created_at).toLocaleString()}
              </p>
            </div>
            <div
              className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                STATUS_STYLES[build.status] || "bg-gray-50 text-gray-800 border-gray-200"
              }`}
            >
              {STATUS_ICONS[build.status] || "❓"} {build.status}
            </div>
          </div>

          {build.message && (
            <div className="mt-4 rounded-md bg-gray-50 p-3">
              <p className="text-sm text-gray-700">{build.message}</p>
            </div>
          )}
        </section>

        {build.status === "completed" && build.files.length > 0 && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Download
            </h2>
            <div className="space-y-3">
              {build.files.map((filename) => (
                <a
                  key={filename}
                  href={getDownloadUrl(build.uuid, filename)}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {filename}
                  </span>
                  <span className="text-sm text-blue-600">Download ↓</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {build.status === "failed" && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Build Failed
            </h2>
            <p className="text-sm text-gray-600">
              The build process encountered an error. Please try again or check
              the build configuration.
            </p>
            <a
              href="/"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start New Build
            </a>
          </section>
        )}

        {isActive && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <p className="text-sm text-gray-600">
                {build.status === "pending"
                  ? "Waiting for build to start..."
                  : "Build in progress..."}
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              This page will auto-refresh every 5 seconds.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}