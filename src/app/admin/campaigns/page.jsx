"use client";
import Loader from "@/components/Loader";
import Pagination from "@/components/Pagination/pagination";
import api from "@/lib/axios";
import moment from "moment";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { FaEye, FaFileExcel, FaPencilAlt, FaTrash } from "react-icons/fa";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";
import ExcelJS from "exceljs";
import { useTranslations } from "next-intl";

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const toastAlert = useTranslations("Sweetalert");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useTranslations("Admin.campaigns");
  const [pageCount, setpageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [verStatus, setVerStatus] = useState({}); // trackingId -> status
  const [verLoading, setVerLoading] = useState({}); // trackingId -> boolean
  const router = useRouter();
  const limit = 10;
  const statusLabels = useMemo(
    () => ({
      verified: t("status.verified"),
      in_progress: t("status.inProgress"),
      not_started: t("status.notStarted"),
      accepted: t("status.accepted"),
    }),
    [t],
  );
  const DynamicCSVLink = dynamic(
    () => import("react-csv").then((mod) => mod.CSVLink),
    {
      ssr: false,
    },
  );

  // Transform campaign data for export
  const transformCampaignsForExport = (campaigns) => {
    return campaigns.map((campaign) => ({
      "Tracking ID": campaign?.trackingId || "N/A",
      Title: campaign?.basics?.title || "N/A",
      Description: campaign?.basics?.description || "N/A",
      "Campaign Type": campaign?.basics?.campaignType || "N/A",
      Category: campaign?.basics?.category || "N/A",
      "Offer Type": campaign?.basics?.offerType || "N/A",
      "Campaign URL": campaign?.basics?.campaign_url || "N/A",
      "Start Date": campaign?.basics?.startDate
        ? moment(campaign.basics.startDate).format("YYYY-MM-DD")
        : "N/A",
      "End Date": campaign?.basics?.endDate
        ? moment(campaign.basics.endDate).format("YYYY-MM-DD")
        : "N/A",
      "Is Ongoing": campaign?.basics?.isOngoing ? "Yes" : "No",
      "Target Regions": campaign?.basics?.targetRegions?.join(", ") || "N/A",
      "Compensation Type": campaign?.compensation?.type || "N/A",
      Commission: campaign?.compensation?.commission || 0,
      Amount: campaign?.compensation?.amount || 0,
      Gifting: campaign?.compensation?.gifting ? "Yes" : "No",
      Duration: campaign?.compensation?.duration || 0,
      "Affiliate Link Destination":
        campaign?.compensation?.affiliateLinkDestination || "N/A",
      "Brand Name": campaign?.brandId?.brand?.companyName || "N/A",
      Status:
        campaign?.stateID === 0
          ? "Pending"
          : campaign?.stateID === 1
            ? "Published"
            : campaign?.stateID === 2
              ? "Paused"
              : "N/A",
      "Created At": campaign?.createdAt
        ? moment(campaign.createdAt).format("YYYY-MM-DD HH:mm:ss")
        : "N/A",
      "Updated At": campaign?.updatedAt
        ? moment(campaign.updatedAt).format("YYYY-MM-DD HH:mm:ss")
        : "N/A",
    }));
  };

  // Export to Excel function
  const exportToExcel = async () => {
    const data = transformCampaignsForExport(allCampaigns);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Campaigns");

    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map((key) => ({
        header: key,
        key: key,
        width: 20,
      }));
      worksheet.addRows(data);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campaigns-${moment().format("YYYY-MM-DD")}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const getAllCampaigns = async () => {
    try {
      const resp = await api.get("/admin/all-campaigns", {
        params: { page: currentPage, limit },
      });

      setCampaigns(resp.data);
      setpageCount(resp.pagination.totalPages);
    } catch (err) {
      setError(err.message || "Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllCampaigns();
  }, [currentPage]);

  useEffect(() => {
    (async () => {
      const resp = await api.get("/admin/all-campaigns", {
        params: { limit: 0 },
      });
      setAllCampaigns(resp.data);
    })();
  }, []);

  // Prefetch verification status for visible campaigns
  useEffect(() => {
    if (!campaigns?.length) return;
    campaigns.forEach((c) => {
      const tid = c?.trackingId;
      if (tid && verStatus[tid] === undefined) {
        fetchVerificationStatus(tid);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const fetchVerificationStatus = async (trackingId) => {
    if (!trackingId || verLoading[trackingId]) return;
    setVerLoading((p) => ({ ...p, [trackingId]: true }));
    try {
      const { data } = await api.get(`/admin/campaign-tracking-status`, {
        params: { trackingId },
      });
      setVerStatus((p) => ({
        ...p,
        [trackingId]: data?.verification?.status || "not_started",
      }));
    } catch (e) {
      console.warn("Failed to fetch verification status", e?.message || e);
      setVerStatus((p) => ({ ...p, [trackingId]: "not_started" }));
    } finally {
      setVerLoading((p) => ({ ...p, [trackingId]: false }));
    }
  };

  const handleGenerateTestLink = async (campaign) => {
    try {
      const { value: ambassadorKey } = await Swal.fire({
        title: t("testLinkDialog.title"),
        input: "text",
        inputLabel: t("testLinkDialog.inputLabel"),
        inputPlaceholder: t("testLinkDialog.inputPlaceholder"),
        showCancelButton: true,
        cancelButtonText: toastAlert("cancel"),
        confirmButtonText: toastAlert("yes"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });
      if (!ambassadorKey) return;
      const resp = await api.post(`/admin/campaign-test-link`, {
        trackingId: campaign?.trackingId,
        ambassadorTrackingKey: ambassadorKey,
      });

      // Extract link/token from API response (support both plain and nested shapes)
      const apiLink = resp?.data?.testLink || "";
      const token =
        resp?.data?.testToken || resp?.data?.verification?.testToken || "";
      const fallbackLink = token
        ? `${window.location.origin}/api/click?campaign=${encodeURIComponent(
            campaign?.trackingId || "",
          )}&athlete=${encodeURIComponent(
            ambassadorKey,
          )}&testToken=${encodeURIComponent(token)}`
        : "";
      const link = apiLink || fallbackLink;

      await Swal.fire({
        title: t("testLinkDialog.successTitle"),
        html: `<div class="text-left break-all">${
          link || t("testLinkDialog.linkUnavailable")
        }</div>`,
        showCloseButton: true,
        confirmButtonText: t("testLinkDialog.copy"),
        showCancelButton: true,
        cancelButtonText: toastAlert("cancel"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      }).then(async (res) => {
        if (res.isConfirmed && link) {
          try {
            await navigator.clipboard.writeText(link);
            Swal.fire({
              title: t("testLinkDialog.copied"),
              toast: true,
              position: "top-right",
              timer: 2000,
              showConfirmButton: false,
              icon: "success",
            });
          } catch (_) {}
        }
      });
      // refresh status
      fetchVerificationStatus(campaign?.trackingId);
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: t("testLinkDialog.errorTitle"),
        text: e?.response?.data?.message || e?.message || "",
      });
    }
  };

  const handleViewTestEvents = async (campaign) => {
    try {
      const { data } = await api.get(`/admin/campaign-test-events`, {
        params: { trackingId: campaign?.trackingId },
      });
      const lines = (data?.events || []).slice(0, 10).map((ev) => {
        const name = ev?.eventData?.eventName || ev?.eventType;
        const ts = ev?.createdAt
          ? moment(ev.createdAt).format("YYYY-MM-DD HH:mm")
          : "";
        return `${ts} — ${name} — visitor ${ev?.visitorId}`;
      });
      Swal.fire({
        title: `Test events (${data?.count || 0})`,
        html: `<pre style="text-align:left; white-space:pre-wrap;">${
          lines.join("\n") || "No test events yet."
        }</pre>`,
        width: 700,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Failed to load test events",
        text: e?.response?.data?.message || e?.message || "",
      });
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: toastAlert("sure"),
      text: toastAlert("revertMsg"),
      cancelButtonText: toastAlert("cancel"),
      confirmButtonText: toastAlert("deleteCardSuccessConfirmButtonText"),
      icon: "warning",
      showCancelButton: true,
      customClass: {
        confirmButton: "confirmButton",
        cancelButton: "cancelButton",
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        await api.delete(`/admin/all-campaigns/${id}`);
        getAllCampaigns();
        Swal.fire({
          title: toastAlert("deleted"),
          toast: true,
          position: "top-right",
          showConfirmButton: false,
          timer: 3000,
          icon: "success",
        });
      }
    });
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );

  if (error)
    return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex gap-4 mb-4">
        <DynamicCSVLink
          data={transformCampaignsForExport(allCampaigns)}
          headers={[
            { label: "Tracking ID", key: "Tracking ID" },
            { label: "Title", key: "Title" },
            { label: "Description", key: "Description" },
            { label: "Campaign Type", key: "Campaign Type" },
            { label: "Category", key: "Category" },
            { label: "Offer Type", key: "Offer Type" },
            { label: "Campaign URL", key: "Campaign URL" },
            { label: "Start Date", key: "Start Date" },
            { label: "End Date", key: "End Date" },
            { label: "Is Ongoing", key: "Is Ongoing" },
            { label: "Target Regions", key: "Target Regions" },
            { label: "Compensation Type", key: "Compensation Type" },
            { label: "Commission", key: "Commission" },
            { label: "Amount", key: "Amount" },
            { label: "Gifting", key: "Gifting" },
            { label: "Duration", key: "Duration" },
            {
              label: "Affiliate Link Destination",
              key: "Affiliate Link Destination",
            },
            { label: "Brand Name", key: "Brand Name" },
            { label: "Status", key: "Status" },
            { label: "Created At", key: "Created At" },
            { label: "Updated At", key: "Updated At" },
          ]}
          filename={`campaigns-${moment().format("YYYY-MM-DD")}.csv`}
          className={`inline-block bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 mb-4`}
        >
          {t("csv")}
        </DynamicCSVLink>

        <button
          onClick={exportToExcel}
          className={`inline-block bg-green-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 mb-4`}
        >
          {/* <FaFileExcel className="mr-2" /> */}
          {t("excel")}
        </button>
      </div>
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">
        {" "}
        {t("heading")}
      </h1>

      {campaigns.length > 0 ? (
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="py-3 px-5 text-left"> {t("title")}</th>
                <th className="py-3 px-5 text-left"> {t("description")}</th>
                <th className="py-3 px-5 text-left"> {t("brandName")}</th>
                <th className="py-3 px-5 text-left"> {t("type")}</th>
                <th className="py-3 px-5 text-left"> {t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const title = campaign?.basics?.title || "N/A";
                const desc = campaign?.basics?.description || "N/A";
                const type = campaign?.basics?.campaignType || "N/A";
                const brandName =
                  campaign?.brandId?.brand?.companyName || "N/A";

                const trackingId = campaign?.trackingId;
                const status = verStatus[trackingId];
                const verifiedStatus = campaign?.verification?.status;
                const effectiveStatus =
                  verifiedStatus || status || "not_started";
                const displayStatus =
                  statusLabels[effectiveStatus] || effectiveStatus;

                return (
                  <tr
                    key={campaign?._id}
                    className="hover:bg-gray-50 border-t border-gray-200"
                  >
                    <td className="py-3 px-5">{title}</td>
                    <td className="py-3 px-5 truncate max-w-xs" title={desc}>
                      {desc.length > 40 ? desc.slice(0, 40) + "..." : desc}
                    </td>
                    <td className="py-3 px-5">{brandName}</td>
                    <td className="py-3 px-5 capitalize">
                      <div className="flex items-center gap-2">
                        <span>{type}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            effectiveStatus === "verified"
                              ? "bg-green-100 text-green-700"
                              : effectiveStatus === "in_progress"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                          title={t("verificationStatusTooltip")}
                        >
                          {verLoading[trackingId] ? "…" : displayStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5 flex flex-wrap gap-2">
                      {/* Primary action first: Accept (verified) or Accepted (accepted) or Test Link (other) */}
                      {effectiveStatus === "verified" && (
                        <button
                          className={
                            "bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md flex items-center space-x-1 text-sm transition"
                          }
                          onClick={async () => {
                            try {
                              const result = await Swal.fire({
                                title: toastAlert("sure"),
                                text: toastAlert("publishCampaign"),
                                cancelButtonText: toastAlert("cancel"),
                                confirmButtonText: toastAlert("yes"),
                                icon: "warning",
                                showCancelButton: true,
                                customClass: {
                                  confirmButton: "confirmButton",
                                  cancelButton: "cancelButton",
                                },
                              });

                              if (!result.isConfirmed) return;

                              const { data } = await api.post(
                                `/admin/campaign/publish`,
                                {
                                  trackingId,
                                },
                              );
                              Swal.fire({
                                title: toastAlert("publishCampaignSuccess"),
                                toast: true,
                                position: "top-right",
                                showConfirmButton: false,
                                timer: 3000,
                                icon: "success",
                              });
                              setVerStatus((p) => ({
                                ...p,
                                [trackingId]: "accepted",
                              }));
                              getAllCampaigns();
                              fetchVerificationStatus(trackingId);
                            } catch (e) {
                              const messageKey =
                                e?.response?.data?.messageKey || "";
                              const translatedError = messageKey
                                ? toastAlert(messageKey)
                                : e?.response?.data?.message ||
                                  e?.message ||
                                  "";
                              Swal.fire({
                                title: toastAlert("publishCampaignError"),
                                text: translatedError,
                                icon: "error",
                              });
                            }
                          }}
                          title={t("acceptTooltip")}
                        >
                          {t("acceptButton")}
                        </button>
                      )}
                      {effectiveStatus === "accepted" && (
                        <button
                          className={
                            "bg-gray-300 text-gray-700 px-3 py-1 rounded-md flex items-center space-x-1 text-sm cursor-not-allowed"
                          }
                          disabled
                          title={t("acceptedTooltip")}
                        >
                          {t("acceptedLabel")}
                        </button>
                      )}
                      {!(
                        effectiveStatus === "verified" ||
                        effectiveStatus === "accepted"
                      ) && (
                        <button
                          className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-sm"
                          onClick={() => handleGenerateTestLink(campaign)}
                          title={t("testLinkTooltip")}
                        >
                          {t("testLinkButton")}
                        </button>
                      )}
                      {/* Eye second */}
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md flex items-center space-x-1 text-sm transition"
                        onClick={() => {
                          router.push(`/campaign-details/${campaign?._id}`);
                        }}
                      >
                        <FaEye className="text-sm" />
                      </button>
                      {/* Delete last */}
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md flex items-center space-x-1 text-sm transition"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(campaign?._id);
                        }}
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-gray-500 mt-10">{t("fallbackText")}</p>
      )}
      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default Campaigns;
