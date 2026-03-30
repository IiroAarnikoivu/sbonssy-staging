"use client";

import { useState, useEffect, useRef } from "react";

export default function UploadLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filter, setFilter] = useState("all");
  const [currentLogId, setCurrentLogId] = useState(null);
  // Backend-driven pagination for created users
  const [cuPage, setCuPage] = useState(1);
  const [cuHasMore, setCuHasMore] = useState(false);
  const [cuLoading, setCuLoading] = useState(false);
  const [cuInitialized, setCuInitialized] = useState(false);
  const [cuTotal, setCuTotal] = useState(0);
  // Refs to avoid race conditions in scroll handler
  const cuLoadingRef = useRef(false);
  const lastRequestedPageRef = useRef(0);
  const CU_LIMIT = 10;

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Reset page index when switching to a different log ID (not when appending)
  useEffect(() => {
    if (!currentLogId) return;
    setCuPage(1);
    // Do NOT reset cuHasMore here to avoid racing the server-set value
    setCuLoading(false);
    setCuInitialized(false);
    setCuTotal(0);
    cuLoadingRef.current = false;
    lastRequestedPageRef.current = 0;
  }, [currentLogId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url =
        filter === "all"
          ? "/api/admin/upload-logs"
          : `/api/admin/upload-logs?status=${filter}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogDetails = async (logId, page = 1, append = false) => {
    try {
      const response = await fetch(
        `/api/admin/upload-logs?logId=${logId}&cuPage=${page}&cuLimit=${CU_LIMIT}`
      );
      const data = await response.json();

      if (data.success) {
        if (!append) {
          setCurrentLogId(logId);
        }
        if (append && selectedLog && selectedLog._id === logId) {
          // Append new page of created users
          const merged = {
            ...selectedLog,
            ...data.log,
            createdUsers: [
              ...(selectedLog.createdUsers || []),
              ...(data.log.createdUsers || []),
            ],
          };
          setSelectedLog(merged);
        } else {
          setSelectedLog(data.log);
        }
        setCuPage(data.createdUsersPagination?.page || page);
        setCuHasMore(Boolean(data.createdUsersPagination?.hasMore));
        setCuInitialized(true);
        if (typeof data.createdUsersPagination?.total === "number") {
          setCuTotal(data.createdUsersPagination.total);
        }
      }
    } catch (error) {
      console.error("Error fetching log details:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "partial":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Infinite scroll handler for created users container (backend paging)
  const handleUsersScroll = (e) => {
    const target = e.currentTarget;
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 32; // 32px threshold
    if (!nearBottom) return;
    if (cuLoadingRef.current) return;
    if (!cuHasMore) return;
    if (!selectedLog?._id) return;
    // Determine next page based on how many users are already loaded
    const loadedCount = selectedLog?.createdUsers?.length || 0;
    const nextPage = Math.floor(loadedCount / CU_LIMIT) + 1; // pages are 1-indexed
    // Avoid duplicate or backwards requests
    if (lastRequestedPageRef.current >= nextPage) return;
    lastRequestedPageRef.current = nextPage;
    cuLoadingRef.current = true;
    setCuLoading(true);
    fetchLogDetails(selectedLog._id, nextPage, true).finally(() => {
      cuLoadingRef.current = false;
      setCuLoading(false);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CSV Upload Logs</h1>
          <p className="text-gray-600 mt-2">
            Track all CSV upload attempts, errors, and successful imports
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Uploads</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logs List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Upload History</h2>
            </div>
            <div className="divide-y">
              {loading ? (
                <div className="p-6 text-center">Loading...</div>
              ) : logs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No upload logs found
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log._id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => fetchLogDetails(log._id, 1, false)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {log.fileName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          <span>Total: {log.totalRecords}</span>
                          <span className="text-green-600">
                            Success: {log.successfulRecords}
                          </span>
                          <span className="text-red-600">
                            Failed: {log.failedRecords}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            log.uploadStatus
                          )}`}
                        >
                          {log.uploadStatus}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {formatDuration(log.processingTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Log Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Upload Details</h2>
            </div>
            <div className="p-6">
              {selectedLog ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      File Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">File Name:</span>
                        <p className="font-medium">{selectedLog.fileName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">File Size:</span>
                        <p className="font-medium">
                          {(selectedLog.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Uploaded By:</span>
                        <p className="font-medium">{selectedLog.uploadedBy}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Processing Time:</span>
                        <p className="font-medium">
                          {formatDuration(selectedLog.processingTime)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Results</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedLog.totalRecords}
                        </p>
                        <p className="text-gray-500">Total</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">
                          {selectedLog.successfulRecords}
                        </p>
                        <p className="text-gray-500">Success</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded">
                        <p className="text-2xl font-bold text-red-600">
                          {selectedLog.failedRecords}
                        </p>
                        <p className="text-gray-500">Failed</p>
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {selectedLog.errorDetails && selectedLog.errorDetails.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Errors ({selectedLog.errorDetails.length})
                      </h3>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {selectedLog.errorDetails.map((error, index) => (
                          <div
                            key={index}
                            className="p-3 bg-red-50 border border-red-200 rounded text-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-red-800">
                                  Row {error.row}: {error.email}
                                </p>
                                <p className="text-red-600 mt-1">
                                  {error.error}
                                </p>
                              </div>
                              <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                                {error.errorType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Created Users */}
                  {selectedLog?.createdUsers &&
                    selectedLog.createdUsers.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">
                          Created Users ({selectedLog.createdUsers.length})
                        </h3>
                        <div
                          className="max-h-64 overflow-y-auto space-y-2"
                          onScroll={handleUsersScroll}
                        >
                          {selectedLog.createdUsers.map((user, index) => (
                            <div
                              key={index}
                              className="p-3 bg-green-50 border border-green-200 rounded text-sm"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-green-800">
                                    {user.email}
                                  </p>
                                  <p className="text-green-600">
                                    Role: {user.role}
                                  </p>
                                </div>
                                <div className="text-xs text-green-600">
                                  <p>
                                    Supabase:{" "}
                                    {user?.supabaseId
                                      ? `${user.supabaseId.slice(0, 8)}...`
                                      : "-"}
                                  </p>
                                  <p>
                                    MongoDB:{" "}
                                    {user?.mongoId
                                      ? `${user.mongoId.slice(0, 8)}...`
                                      : "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                          {cuLoading && (
                            <div className="py-2 text-center text-xs text-gray-500">
                              Loading more...
                            </div>
                          )}
                          {cuInitialized &&
                            !cuHasMore &&
                            (cuTotal === 0 ||
                              selectedLog.createdUsers.length >= cuTotal) && (
                              <div className="py-2 text-center text-xs text-gray-500">
                                No more users to load
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  Select an upload log to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
