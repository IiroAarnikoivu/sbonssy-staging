"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/axios";
import Swal from "sweetalert2";

const VATManagementPage = () => {
  const t = useTranslations("VAT");
  const [users, setUsers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [filters, setFilters] = useState({
    role: "all",
    vatStatus: "all",
    country: "all",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [usersRes, payoutsRes, invoicesRes] = await Promise.all([
        api.get("/admin/users?includeVat=true"),
        api.get("/admin/payouts?includeVat=true"),
        api.get("/admin/invoices?includeVat=true"),
      ]);

      setUsers(usersRes.data?.users || usersRes.users || []);
      setPayouts(payoutsRes.payouts || []);
      setInvoices(invoicesRes.invoices || []);
    } catch (error) {
      console.error("Failed to load VAT data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Failed to load VAT management data: ${error?.message || error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const validateUserVAT = async (userId, vatNumber) => {
    try {
      const response = await api.post("/vat/validate", {
        vatNumber,
        userId
      });

      const result = response.validation;

      if (result.isValid) {
        Swal.fire({
          icon: "success",
          title: "VAT Validated",
          text: `VAT number ${result.vatNumber} is valid`,
        });

        loadData(); // Refresh data
      } else {
        Swal.fire({
          icon: "error",
          title: "Invalid VAT",
          text: result.error || "VAT number is invalid",
        });
      }
    } catch (error) {
      console.error('VAT validation error:', error);
      Swal.fire({
        icon: "error",
        title: "Validation Failed",
        text: error?.error || "Failed to validate VAT number",
      });
    }
  };

  const updateVATStatus = async (userId, newStatus) => {
    try {
      await api.post("/vat/update-info", {
        userId,
        vatStatus: newStatus,
      });

      Swal.fire({
        icon: "success",
        title: "Updated",
        text: "VAT status updated successfully",
      });

      loadData();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update VAT status",
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    if (filters.role !== "all" && user.role !== filters.role) return false;

    const vatInfo = user[user.subRole?.toLowerCase()];
    if (filters.vatStatus !== "all" && vatInfo?.vatStatus !== filters.vatStatus)
      return false;
    if (
      filters.country !== "all" &&
      vatInfo?.registrationCountry !== filters.country
    )
      return false;

    return true;
  });

  const getVATStatusBadge = (status) => {
    const colors = {
      valid: "bg-green-100 text-green-800",
      invalid: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      not_provided: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          colors[status] || colors.not_provided
        }`}
      >
        {status || "not_provided"}
      </span>
    );
  };

  const renderUsersTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Roles</option>
              <option value="sports-ambassador">Sports Ambassador</option>
              <option value="brand">Brand</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VAT Status
            </label>
            <select
              value={filters.vatStatus}
              onChange={(e) =>
                setFilters({ ...filters, vatStatus: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="invalid">Invalid</option>
              <option value="pending">Pending</option>
              <option value="not_provided">Not Provided</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={filters.country}
              onChange={(e) =>
                setFilters({ ...filters, country: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Countries</option>
              <option value="FI">Finland</option>
              <option value="SE">Sweden</option>
              <option value="NO">Norway</option>
              <option value="DK">Denmark</option>
              <option value="DE">Germany</option>
              <option value="US">United States</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAT Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAT Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VAT Treatment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const vatInfo = user[user.subRole?.toLowerCase()] || {};
                return (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vatInfo.registrationCountry || "Not set"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vatInfo.vatNumber || "Not provided"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getVATStatusBadge(vatInfo.vatStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vatInfo.needsVatOnCommission
                        ? `VAT ${(vatInfo.vatRate * 100).toFixed(1)}%`
                        : "No VAT"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {vatInfo.vatNumber && (
                        <button
                          onClick={() =>
                            validateUserVAT(user._id, vatInfo.vatNumber)
                          }
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Validate
                        </button>
                      )}
                      <select
                        value={vatInfo.vatStatus || "not_provided"}
                        onChange={(e) =>
                          updateVATStatus(user._id, e.target.value)
                        }
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="valid">Valid</option>
                        <option value="invalid">Invalid</option>
                        <option value="pending">Pending</option>
                        <option value="not_provided">Not Provided</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPayoutsTab = () => (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ambassador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                VAT Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gross Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                VAT Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                VAT Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payouts.map((payout) => (
              <tr key={payout._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payout.ambassador?.name ||
                    payout.ambassador?.email ||
                    "Unknown"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €{(payout.commissionAmount / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €{(payout.vatAmount / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  €{(payout.grossAmount / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payout.vatApplied
                    ? `${(payout.vatRate * 100).toFixed(1)}%`
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {payout.vatCountry || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      payout.status === "transferred"
                        ? "bg-green-100 text-green-800"
                        : payout.status === "paid"
                        ? "bg-blue-100 text-blue-800"
                        : payout.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {payout.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(payout.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInvoicesTab = () => (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subtotal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                VAT Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                VAT Treatment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client VAT #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.brand?.name || invoice.brand?.email || "Unknown"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.invoiceNumber || invoice.stripeInvoiceId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €{((invoice.subtotal || invoice.amount) / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €{((invoice.vatAmount || 0) / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  €{((invoice.total || invoice.amount) / 100).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.vatTreatment === "domestic"
                        ? "bg-blue-100 text-blue-800"
                        : invoice.vatTreatment === "reverse_charge"
                        ? "bg-green-100 text-green-800"
                        : invoice.vatTreatment === "export"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {invoice.vatTreatment || "domestic"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.clientVatNumber || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : invoice.status === "open"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading VAT management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">VAT Management</h1>
          <p className="mt-2 text-gray-600">
            Manage VAT information, validate VAT numbers, and monitor
            VAT-related transactions.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-blue-600">
              {
                users.filter(
                  (u) => u[u.subRole?.toLowerCase()]?.vatStatus === "valid"
                ).length
              }
            </div>
            <div className="text-sm text-gray-600">Valid VAT Numbers</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-yellow-600">
              {
                users.filter(
                  (u) => u[u.subRole?.toLowerCase()]?.vatStatus === "pending"
                ).length
              }
            </div>
            <div className="text-sm text-gray-600">Pending Validation</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-green-600">
              {payouts.filter((p) => p.vatApplied).length}
            </div>
            <div className="text-sm text-gray-600">VAT Payouts</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-purple-600">
              €
              {(
                payouts.reduce((sum, p) => sum + (p.vatAmount || 0), 0) / 100
              ).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total VAT Paid</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: "users", label: "Users & VAT Info" },
              { id: "payouts", label: "VAT Payouts" },
              { id: "invoices", label: "VAT Invoices" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "users" && renderUsersTab()}
        {activeTab === "payouts" && renderPayoutsTab()}
        {activeTab === "invoices" && renderInvoicesTab()}
      </div>
    </div>
  );
};

export default VATManagementPage;
