"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import Pagination from "@/components/Pagination/pagination";
import moment from "moment";
import { useTranslations } from "next-intl";
import ExcelJS from "exceljs"; // Ensure correct import
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { FaBan, FaEye, FaTrash } from "react-icons/fa";
import { FaPencil } from "react-icons/fa6";
import Swal from "sweetalert2";
import useDebounce from "@/hook/useDebounce";
const DynamicCSVLink = dynamic(
  () => import("react-csv").then((mod) => mod.CSVLink),
  {
    ssr: false, // Disable server-side rendering
  }
);

const AdminUser = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [error, setError] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const [isCsvLoading, setIsCsvLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [roleFilter, setRoleFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const router = useRouter();
  const t = useTranslations("Admin.users");
  const toastAlert = useTranslations("Sweetalert");
  const limit = 10;

  // Use debounce hook for search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch paginated users for table display
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get("admin/users", {
          params: {
            page: currentPage,
            limit,
            ...(roleFilter && { role: roleFilter }),
            ...(debouncedSearch && { search: debouncedSearch }),
          },
        });

        setUsers(resp.data?.users || []);
        setPageCount(resp.data?.pagination?.totalPages || 1);
        setError(null);
      } catch (err) {
        setError(t("errors.loadUsers"));
      }
    })();
  }, [currentPage, roleFilter, debouncedSearch, t]);

  // Fetch all users for CSV and XLSX export
  useEffect(() => {
    (async () => {
      setIsCsvLoading(true);
      try {
        const params = {
          limit: 0,
          ...(roleFilter && { role: roleFilter }),
          ...(debouncedSearch && { search: debouncedSearch }),
        };
        const resp = await api.get("admin/users", { params });
        setAllUsers(resp.data?.users || []);
        setCsvError(null);
      } catch (err) {
        console.error("Failed to load all users for export:", err);
        setCsvError(t("errors.loadExportUsers"));
      } finally {
        setIsCsvLoading(false);
      }
    })();
  }, [roleFilter, debouncedSearch, t]);

  const toCamelCase = (str) =>
    str
      ?.split("-")
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join("");

  const getTrackingKey = (user) => {
    if (!user) return "";
    if (user.role === "brand") return user?.brand?.tracking_key || "";
    if (user.role === "sports-ambassador") {
      const profileKey = toCamelCase(user?.subRole || "");
      return user?.[profileKey]?.tracking_key || "";
    }
    return "";
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRoleFilterChange = (e) => {
    const role = e.target.value || null;
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleBanClick = async (userId, currentStateId) => {
    const newStateId = currentStateId === 2 ? 1 : 2;
    const action = newStateId === 2 ? "ban" : "unban";

    const originalUsers = [...users];
    const originalAllUsers = [...allUsers];
    setUsers(
      users.map((user) =>
        user._id === userId ? { ...user, stateId: newStateId } : user
      )
    );
    setAllUsers(
      allUsers.map((user) =>
        user._id === userId ? { ...user, stateId: newStateId } : user
      )
    );
    setActionError(null);
    // setActionMessage(action === "ban" ? t("banSuccess") : t("unbanSuccess"));
    Swal.fire({
      title: action === "ban" ? t("banSuccess") : t("unbanSuccess"),
      icon: "success",
      toast: true,
      timer: 3000,
      position: "top-right",
      showConfirmButton: false,
    });

    try {
      const resp = await api.put(`/admin/users`, {
        userId,
        stateId: newStateId,
      });

      if (resp && resp.data) {
        setUsers(
          users.map((user) =>
            user._id === userId ? { ...user, ...resp.data } : user
          )
        );
        setAllUsers(
          allUsers.map((user) =>
            user._id === userId ? { ...user, ...resp.data } : user
          )
        );
      }
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setUsers(originalUsers);
      setAllUsers(originalAllUsers);
      setActionError(t(`errors.${action}Failed`));
      setActionMessage(null);
      setTimeout(() => setActionError(null), 3000);
    }
  };
  const handleDelete = async (id) => {
    try {
      const result = await Swal.fire({
        title: toastAlert("sure"),
        text: toastAlert("deleteQuesUser"),
        icon: "question",
        showCancelButton: true,
        confirmButtonText: toastAlert("yes"),
        cancelButtonText: toastAlert("no"),
        customClass: {
          confirmButton: "confirmButton",
          cancelButton: "cancelButton",
        },
      });

      if (result.isConfirmed) {
        const { data } = await api.delete(`/admin/users?id=${id}`);

        if (data) {
          await Swal.fire({
            toast: true,
            position: "top-right",
            title: toastAlert("userDeleteSuccess"),
            icon: "success",
            showConfirmButton: false,
            timer: 3000,
          });
        }
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      Swal.fire({
        toast: true,
        position: "top-right",
        title: toastAlert("userDeleteError"),
        icon: "error",
        showConfirmButton: false,
        timer: 3000,
      });
    }
  };

  const capitalizedRole = (role) =>
    role
      ?.split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("-");

  // Prepare data for CSV and XLSX
  const exportData = allUsers.map((user, index) => ({
    No: index + 1,
    Email: user.email,
    AuthProvider:
      user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1),
    Role: capitalizedRole(user.role),
    SubRole: user.subRole ? capitalizedRole(user.subRole) : "N/A",
    CreatedAt: moment(user.createdAt).format("LLL"),
    UpdatedAt: moment(user.updatedAt).format("LLL"),
    State: user.stateId === 2 ? "Banned" : "Active",
  }));

  // Handle XLSX download
  const handleXlsxDownload = async () => {
    if (isCsvLoading || !exportData.length) {
      return; // Prevent download if loading or no data
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Users");

      if (exportData.length > 0) {
        worksheet.columns = Object.keys(exportData[0]).map((key) => ({
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
          key: key,
          width: 20,
        }));
        worksheet.addRows(exportData);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `users-${Date.now()}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate XLSX file:", err);
      setCsvError(t("errors.generateXlsx"));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold mb-4">{t("heading")}</h1>
        <div className="mb-4 flex space-x-4">
          {/* CSV Download */}
          <DynamicCSVLink
            data={exportData}
            filename={`users-${moment().format("YYYY-MM-DD")}.csv`}
            className={`inline-block bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 ${
              isCsvLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-disabled={isCsvLoading}
          >
            {isCsvLoading ? t("loadingExport") : t("downloadCSV")}
          </DynamicCSVLink>
          {/* XLSX Download */}
          <button
            onClick={handleXlsxDownload}
            className={`inline-block bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 ${
              isCsvLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isCsvLoading}
          >
            {isCsvLoading ? t("loadingExport") : t("downloadXLSX")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {csvError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {csvError}
        </div>
      )}
      {actionMessage && (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {actionError}
        </div>
      )}
      <div className="mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="searchInput"
            className="text-sm font-medium text-gray-700"
          >
            Search:
          </label>
          <input
            id="searchInput"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by email, name, or company name..."
            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Clear
            </button>
          )}
        </div>
        <div>
          <label
            htmlFor="roleFilter"
            className="mr-2 text-sm font-medium text-gray-700"
          >
            {t("filter")}
          </label>
          <select
            id="roleFilter"
            value={roleFilter || ""}
            onChange={handleRoleFilterChange}
            className="p-2 border border-gray-300 rounded-md"
          >
            <option value="">{t("filterValues.all")}</option>
            <option value="fan">{t("filterValues.fan")}</option>
            <option value="sports-ambassador">{t("filterValues.amb")}</option>
            <option value="brand">{t("filterValues.brand")}</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("no")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("email")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("auth")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("role")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("subRole")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("trackingkey")}
              </th>
              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("created")}
              </th>

              <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">
                {t("action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {users?.length > 0 ? (
              users.map((user, i) => {
                const startSerial = (currentPage - 1) * limit + 1;
                const serialNumber = startSerial + i;

                return (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {serialNumber}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {user.authProvider.charAt(0).toUpperCase() +
                        user.authProvider.slice(1)}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {capitalizedRole(user.role)}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {user.subRole ? capitalizedRole(user.subRole) : "N/A"}
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {getTrackingKey(user) || "N/A"}
                    </td>

                    <td className="py-2 px-4 border-b text-sm text-gray-900">
                      {moment(user?.createdAt).format("LLL")}
                    </td>

                    <td className="py-1 px-4 border-b text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleBanClick(user?.supabaseId, user?.stateId)
                          }
                          className={`font-medium py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out ${
                            user.stateId === 2
                              ? "bg-green-500 text-white hover:bg-green-600 focus:ring-green-400"
                              : "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                          }`}
                        >
                          <FaBan className="text-sm" />
                        </button>
                        {user && user.role != "fan" && (
                          <button
                            onClick={() =>
                              user?.role === "sports-ambassador"
                                ? router.push(
                                    `/sports-ambassador-profile/${user?.subRole}/${user?.supabaseId}`
                                  )
                                : router.push(
                                    `/brand-profile/${user?.supabaseId}`
                                  )
                            }
                            className="font-medium py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-400"
                          >
                            <FaEye className="text-sm" />
                          </button>
                        )}
                        {user && user.role != "fan" && (
                          <button
                            onClick={() =>
                              router.push(
                                `users/edit/${user.role}/${user?.supabaseId}`
                              )
                            }
                            className="font-medium py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400"
                          >
                            <FaPencil className="text-sm" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(user?.supabaseId);
                          }}
                          className="font-medium py-1 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out bg-red-500 text-white hover:bg-red-600 focus:ring-red-400"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="8"
                  className="py-2 px-4 text-center text-sm text-gray-500"
                >
                  {error ? t("fallback1") : t("fallback2")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        pageCount={pageCount}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default AdminUser;
