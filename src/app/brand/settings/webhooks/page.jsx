"use client";

import { useState, useEffect } from "react";
import SettingsSidebar from "@/components/SettingsSidebar";
import api from "@/lib/axios";
import { useAuthStoreWithTranslations } from "@/store/authStoreHelpers";
import Loader from "@/components/Loader";

import { useTranslations } from "next-intl";
import Swal from "sweetalert2";

// Simple SVG icon components
const Copy = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const RefreshCw = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Zap = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

export default function WebhookSettingsPage() {
  const t = useTranslations("Settings.webhooks");
  const { user, loading: authLoading } = useAuthStoreWithTranslations();
  const isInvited = !!user?.onboardedDetails?.invitedBy;
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [recentWebhooks, setRecentWebhooks] = useState([]);

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5200";

  useEffect(() => {
    if (!authLoading && user) {
      fetchCredentials();
      fetchRecentWebhooks();
    }
  }, [authLoading, user]);

  const fetchCredentials = async () => {
    try {
      const response = await api.get("/brand/webhook-settings");
      if (response) {
        setCredentials(response);
      }
    } catch (error) {
      console.error("Failed to fetch credentials:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentWebhooks = async () => {
    try {
      const response = await api.get("/brand/webhook-events?limit=5");
      if (response) {
        setRecentWebhooks(response.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    }
  };

  const handleRegenerate = async () => {
    const result = await Swal.fire({
      title: t("confirmRegenerateTitle"),
      text: t("confirmRegenerateText"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#d33",
      confirmButtonText: t("yes", { defaultValue: "Yes" }),
      cancelButtonText: t("cancel", { defaultValue: "Cancel" }),
    });

    if (!result.isConfirmed) return;
    
    setRegenerating(true);
    try {
      const response = await api.post("/brand/webhook-settings");
      if (response) {
        setCredentials(response);
        Swal.fire({
          icon: "success",
          title: t("regenerateSuccess"),
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("regenerateError"),
        toast: true,
        position: "top-right",
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => setCopied({ ...copied, [key]: false }), 2000);
  };

  const testWebhook = async () => {
    setTestResult({ status: "testing" });
    
    const testPayload = {
      event: "purchase",
      orderId: `TEST_${Date.now()}`,
      amount: 100.00,
      currency: "EUR",
      attribution: {
        campaign: "CMP_test",
        athlete: "ATH_test",
        visitorId: "VIS_test"
      }
    };

    try {
      const res = await api.post("/webhooks/test", testPayload, {
        headers: {
          "Authorization": `Bearer ${credentials.apiKey}`,
          "X-Source": "dashboard"
        }
      });

      setTestResult({ 
        status: "success", 
        data: res,
        statusCode: 200 
      });
    } catch (error) {
      setTestResult({ 
        status: "error", 
        data: error,
        statusCode: 500
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Loader />
      </div>
    );
  }

  if (!user || user.onboardedDetails?.role !== "brand") {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <p>Access denied. Brand users only.</p>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-white">
      <SettingsSidebar role="brand" />
      <div className="md:w-4/5 md:p-6 md:pt-10 px-3 py-6 pt-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("heading")}</h1>
          <p className="text-gray-600">
            {t("subHeading")}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Credentials & Testing */}
          <div className="lg:col-span-2 space-y-6">
            {/* API Credentials */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{t("credentials")}</h2>
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || isInvited}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
                  title={isInvited ? "Only brand owners can regenerate keys" : ""}
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? t("generating") : t("regenerate")}
                </button>
              </div>

              {credentials ? (
                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("apiKey")}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={credentials.apiKey || t("apiKeyMask")}
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(credentials.apiKey, "apiKey")}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Copy to clipboard"
                      >
                        {copied.apiKey ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("authHeader", { API_KEY: "{API_KEY}" })}
                    </p>
                  </div>

                  {/* Webhook Secret */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("webhookSecret")}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={credentials.webhookSecret || t("secretMask")}
                        readOnly
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(credentials.webhookSecret, "secret")}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Copy to clipboard"
                      >
                        {copied.secret ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t("hmacHeader")}
                    </p>
                  </div>

                  {/* Webhook URLs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("endpoints")}
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-20">{t("test")}:</span>
                        <input
                          type="text"
                          value={credentials.testWebhookUrl || `${BASE_URL}/api/webhooks/test`}
                          readOnly
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(credentials.testWebhookUrl, "testUrl")}
                          className="p-1.5 hover:bg-gray-100 rounded transition"
                        >
                          {copied.testUrl ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-20">{t("production")}:</span>
                        <input
                          type="text"
                          value={credentials.webhookUrl || `${BASE_URL}/api/webhooks/conversion`}
                          readOnly
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(credentials.webhookUrl, "prodUrl")}
                          className="p-1.5 hover:bg-gray-100 rounded transition"
                        >
                          {copied.prodUrl ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {t("notGenerated")}
                </div>
              )}
            </div>

            {/* Test Webhook */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-semibold text-gray-900">{t("testIntegration")}</h2>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {t("testDescription")}
              </p>

              <button
                onClick={testWebhook}
                disabled={!credentials?.apiKey || testResult?.status === "testing"}
                className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50 font-semibold"
              >
                {testResult?.status === "testing" ? t("testing") : t("sendTest")}
              </button>

              <p className="text-[11px] text-gray-500 mt-3 leading-relaxed italic">
                {t("dashboardTestNote")}
              </p>

              {testResult && testResult.status !== "testing" && (
                <div className={`mt-4 p-4 rounded-lg ${
                  testResult.status === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.status === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-semibold ${
                      testResult.status === "success" ? "text-green-900" : "text-red-900"
                    }`}>
                      {testResult.status === "success" ? t("testSuccess") : t("testFailed")}
                    </span>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded overflow-auto max-h-48 border">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Recent Webhooks */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("recentEvents")}</h2>
              
              {recentWebhooks.length > 0 ? (
                <div className="space-y-2">
                  {recentWebhooks.map((webhook) => (
                    <div key={webhook._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          webhook.status === "success" ? "bg-green-500" : "bg-red-500"
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{webhook.eventType}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(webhook.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        webhook.status === "success" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {webhook.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  {t("noEvents")}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Integration Guide */}
          <div className="space-y-6">
            {/* Quick Start */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("quickStart")}</h2>
              
              <ol className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{t("step1Title")}</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {t("step1Desc")}
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{t("step2Title")}</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {t("step2Desc")}
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{t("step3Title")}</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {t("step3Desc")}
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-semibold text-xs">
                    4
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{t("step4Title")}</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {t("step4Desc")}
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Example Payload */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t("examplePayload")}</h2>
              
              <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto border border-gray-200">
{`POST /api/webhooks/conversion
Headers:
  Authorization: Bearer {API_KEY}
  Content-Type: application/json
  X-Webhook-Signature: {HMAC_SHA256}

Body:
{
  "event": "purchase",
  "orderId": "ORDER_12345",
  "amount": 100.00,
  "currency": "EUR",
  "attribution": {
    "campaign": "CMP_xxx",
    "athlete": "ATH_xxx",
    "visitorId": "VIS_xxx"
  },
  "customer": {
    "email": "customer@example.com"
  }
}`}
              </pre>
            </div>

            {/* Support */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h3 className="font-semibold text-orange-900 mb-2">{t("needHelp")}</h3>
              <p className="text-sm text-orange-800 mb-3">
                {t("supportText")}
              </p>
              <a href="mailto:info@sbonssy.com" className="inline-block px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium">
                {t("contactSupport")}
              </a>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
